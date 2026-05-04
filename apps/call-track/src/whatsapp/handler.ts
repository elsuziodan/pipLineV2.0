/**
 * handler.ts
 * ──────────
 * Procesa mensajes entrantes del Webhook de Meta.
 *
 * NUEVA ARQUITECTURA (Sebastian conversacional):
 *   1. Guarda el mensaje del cliente en la tabla `conversations`
 *   2. Carga el historial de la conversación
 *   3. Consulta a Sebastian IA → genera respuesta + decide acción
 *   4. Ejecuta la acción: RESPOND / ADVANCE_PROPOSAL / ADVANCE_CLIMAX
 *      / CLIMAX_ACCEPT / HANDOVER / EXIT
 *
 * La protección anti-avalancha ya no necesita hacks de timestamp:
 *   la cola (LeadQueueManager) procesa un mensaje a la vez, y Sebastian
 *   siempre ve el historial completo con los mensajes anteriores del bot,
 *   por lo que no avanza etapas por mensajes que llegaron antes de su respuesta.
 */

import fs from 'fs';
import path from 'path';

import { getLeadByPhone, updateBotStatus, BotStatus } from '../config/database.js';
import { supabase } from '../config/supabase.js';
import { Automator } from './automator.js';
import { getSebastianDecision } from '../services/sebastian.js';
import { sendHandoverNotify, sendBotOffNotify } from '../services/telegram_notify.js';
import { MetaClient } from './meta_client.js';
import { SCRIPT_VARIANTS } from './constants.js';
import { pipelineEvents } from '../pipeline/pipeline_events.js';
import { leadQueueManager } from './lead_queue.js';
import { saveMessage, getHistory } from '../config/conversations.js';
import { uniquifyMessage, HumanLikeDelays } from './utils.js';
import { downloadAndUploadMedia } from '../services/media_storage.js';
import {
  initiateTakeoverBridge,
  sendWhatsAppTextToTelegram,
  sendWhatsAppMediaToTelegram,
} from '../services/telegram_crm_bridge.js';

/** Estados en los que el bot responde mensajes entrantes */
const ACTIVE_STATUSES: BotStatus[] = ['SENT_GREETING', 'SENT_PROPOSAL', 'SENT_CLIMAX', 'prospecto'];

// Mapas para almacenar mensajes agrupados por cliente mientras escriben en ráfaga
const pendingMessages = new Map<string, string[]>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

export const handleIncomingMessage = async (message: any, contactInfo: any) => {
    // Procesar mensajes no-texto (audio, imagen, video…)
    if (!message || message.type !== 'text' || !message.text?.body) {
        if (message && ['audio', 'image', 'video', 'document', 'location'].includes(message.type)) {
            const phone = message.from;
            const pName = contactInfo?.profile?.name || phone;
            const mType = message.type;
            const mediaId = message[mType]?.id;
            const waTimestamp  = parseInt(message.timestamp || '0', 10);

            console.log(`[Handler] Multimedia recibido (${mType}) de ${pName} (${phone})`);
            
            // Buscar el lead en la DB
            const clientData =
                await getLeadByPhone(phone) ||
                await getLeadByPhone(`+${phone}`) ||
                await getLeadByPhone(`52${phone.substring(3)}`);

            if (clientData) {
                const botStatus = (clientData.metadata as any)?.bot_status as BotStatus;
                
                let incomingText = `[MULTIMEDIA: ${mType.toUpperCase()}]`;

                // 1. Descargar y subir a Supabase Storage
                if (mediaId && (mType === 'audio' || mType === 'image' || mType === 'video')) {
                    try {
                        const mediaUrl = await downloadAndUploadMedia(
                            mediaId, 
                            clientData.id, 
                            mType as 'audio' | 'image' | 'video'
                        );
                        
                        // Guardar en el historial con la URL pública
                        const logMessage = `[MEDIA:${mType.toUpperCase()}] ${mediaUrl}`;
                        await saveMessage(
                            clientData.id, 
                            'user', 
                            logMessage, 
                            botStatus, 
                            waTimestamp, 
                            mediaUrl, 
                            mType as 'audio' | 'image' | 'video'
                        );

                        // Notificar Telegram
                        sendHandoverNotify(pName, phone, logMessage, 'MULTIMEDIA', clientData.id).catch(() => {});
                        incomingText = logMessage;
                        console.log(`[Handler] Media ${mType} procesado y guardado en storage.`);
                    } catch (e: any) {
                        console.error(`[Handler] Fallo procesando multimedia:`, e.message);
                        // Fallback: guardar registro sin URL si falla la subida
                        const failMessage = `[MEDIA:${mType.toUpperCase()}] (Fallo en subida a nube)`;
                        await saveMessage(clientData.id, 'user', failMessage, botStatus, waTimestamp);
                        sendHandoverNotify(pName, phone, failMessage, 'MULTIMEDIA', clientData.id).catch(() => {});
                        incomingText = failMessage;
                    }
                } else {
                    // Otros tipos de multimedia (documentos, etc.) — registro simple
                    const simpleMessage = `[MEDIA:${mType.toUpperCase()}] (Sin pre-procesamiento)`;
                    saveMessage(clientData.id, 'user', simpleMessage, botStatus, waTimestamp);
                    sendHandoverNotify(pName, phone, simpleMessage, 'MULTIMEDIA', clientData.id).catch(() => {});
                    incomingText = simpleMessage;
                }

                // CRM Bridge: Si tiene Topic en Telegram, reenviar el media al hilo
                const tgThreadIdMedia = (clientData.metadata as any)?.telegram_thread_id;
                if (tgThreadIdMedia && mediaId) {
                    const bridgeMediaType = (mType === 'image') ? 'image' : 'audio';
                    sendWhatsAppMediaToTelegram(tgThreadIdMedia, mediaId, bridgeMediaType as 'image' | 'audio', pName)
                        .catch(e => console.error('[Handler] Error enviando media al CRM Bridge:', e));
                }

                // AUTOMATIC HANDOVER FOR MULTIMEDIA
                // El bot no puede procesar audios/imágenes, así que cedemos el control
                await updateBotStatus(clientData.id, 'HANDOVER_QUESTION');
                const bridgeVariants = SCRIPT_VARIANTS.HANDOVER_CONFUSED;
                const bridgeMsg = bridgeVariants[Math.floor(Math.random() * bridgeVariants.length)];
                
                try {
                    await MetaClient.sendTextMessage(phone, bridgeMsg);
                    await saveMessage(clientData.id, 'bot', bridgeMsg, 'HANDOVER_QUESTION');
                } catch (e) { /* error de envío */ }
                
                // Emitir al dashboard
                pipelineEvents.emit('bot:message', {
                    direction: 'IN', name: pName, phone,
                    text: incomingText,
                    timestamp: new Date().toISOString(),
                });
                pipelineEvents.emit('bot:message', {
                    direction: 'OUT', name: pName, phone,
                    text: bridgeMsg, botStatus: 'HANDOVER_QUESTION',
                    timestamp: new Date().toISOString(),
                });
            }
        }
        return;
    }

    const phone        = message.from;
    const name         = contactInfo?.profile?.name || 'Cliente WhatsApp';
    const body         = message.text.body.toLowerCase().trim();
    const waTimestamp  = parseInt(message.timestamp || '0', 10); // segundos Unix

    console.log(`[Handler] Recibido de ${name} (${phone}): ${body.substring(0, 50)}...`);

    // Emitir evento al dashboard
    pipelineEvents.emit('bot:message', {
        direction: 'IN', name, phone,
        text: body,
        timestamp: new Date().toISOString(),
    });

    try {
        // Buscar el lead en la DB (intentando formatos distintos del número)
        const clientData =
            await getLeadByPhone(phone) ||
            await getLeadByPhone(`+${phone}`) ||
            await getLeadByPhone(`52${phone.substring(3)}`);

        if (!clientData) {
            console.log(`[Handler] ${name} (${phone}) no es un lead registrado — ignorando.`);
            return;
        }

        const botStatus = (clientData.metadata as any)?.bot_status as BotStatus;
        // Si el bot no tiene estado, lo inicializamos como SENT_GREETING para que Sebastian pueda responder
        const currentStatus = botStatus || 'SENT_GREETING';
        console.log(`[Handler] Lead: ${clientData.name} | Status: ${currentStatus}`);

        // ── CRM Bridge: Redirigir a Telegram si está en modo manual ──
        const manualStatuses = ['HANDOVER_MANUAL', 'HANDOVER_CLIMAX', 'HANDOVER_QUESTION'];
        const telegramThreadId = (clientData.metadata as any)?.telegram_thread_id;
        if (manualStatuses.includes(currentStatus) && telegramThreadId) {
            // Guardar mensaje y reenviar a Telegram — NO enviar a Sebastian
            await saveMessage(clientData.id, 'user', body, currentStatus, waTimestamp);
            await sendWhatsAppTextToTelegram(telegramThreadId, body, name);
            pipelineEvents.emit('bot:message', {
                direction: 'IN', name, phone,
                text: body,
                timestamp: new Date().toISOString(),
            });
            console.log(`[Handler] Mensaje de ${name} reenviado a Telegram Topic ${telegramThreadId}`);
            return; // ← Sale del handler. Sebastian NO procesa este mensaje.
        }

        // 1. Guardar el mensaje del cliente en el historial INMEDIATAMENTE
        await saveMessage(clientData.id, 'user', body, currentStatus, waTimestamp);

        // Actualizar nombre de perfil de WhatsApp si difiere del nombre de la DB
        if (name && name !== 'Cliente WhatsApp' && name !== clientData.name) {
          try {
            const currentMeta = (clientData.metadata || {}) as any;
            const nameIsPhone = /^[\d+\s()-]+$/.test(clientData.name || '');
            
            // Si el nombre actual es un teléfono y tenemos un nombre de perfil real, actualizamos el nombre principal
            if (nameIsPhone && name && name !== 'Cliente WhatsApp') {
              await supabase.from('clients').update({
                name: name,
                metadata: { ...currentMeta, wa_profile_name: name }
              }).eq('id', clientData.id);
              console.log(`[Handler] Nombre principal actualizado con perfil WA: ${clientData.name} → ${name}`);
            } else if (!currentMeta.wa_profile_name || currentMeta.wa_profile_name !== name) {
              // Si ya tiene nombre real, solo actualizamos el metadato por si acaso
              await supabase.from('clients').update({
                metadata: { ...currentMeta, wa_profile_name: name }
              }).eq('id', clientData.id);
            }
          } catch (e) { /* silencioso */ }
        }

        // 2. Acumular mensaje en la ráfaga actual
        if (!pendingMessages.has(clientData.id)) {
            pendingMessages.set(clientData.id, []);
        }
        pendingMessages.get(clientData.id)!.push(body);

        // 3. Limpiar timer existente para reiniciar la cuenta
        if (debounceTimers.has(clientData.id)) {
            clearTimeout(debounceTimers.get(clientData.id)!);
        }

        // 4. Determinar tiempo de espera optimizado
        const waitTime = currentStatus === 'SENT_GREETING' ? 25000 : currentStatus === 'SENT_CLIMAX' ? 10000 : 15000;
        console.log(`[Handler] Esperando ${waitTime/1000}s para ${name} (etapa: ${botStatus})...`);

        // 5. Configurar el timer que disparará la evaluación
        const timer = setTimeout(async () => {
            debounceTimers.delete(clientData.id);
            const messagesToProcess = pendingMessages.get(clientData.id) || [];
            pendingMessages.delete(clientData.id);

            if (messagesToProcess.length === 0) return;

            // Combinar todos los mensajes de la ráfaga
            const combinedMessage = messagesToProcess.join(' \\n ');
            console.log(`[Handler] Timer vencido para ${name}. Evaluando bloque de ${messagesToProcess.length} mensajes combinados.`);

            // Encolar el procesamiento (asegura que no haya condiciones de carrera)
            await leadQueueManager.enqueue(
                clientData.id,
                async () => {
                    // Re-leer el estado fresco de la DB
                    const freshData = await getLeadByPhone(phone);
                    if (!freshData) return;

                    const currentStatus = (freshData.metadata as any)?.bot_status as BotStatus;
                    if (!currentStatus || !ACTIVE_STATUSES.includes(currentStatus)) {
                        console.log(`[Handler] ${name} ya no tiene status activo (${currentStatus}). Notificando por Telegram.`);
                        
                        // Notificar al humano usando el nombre oficial del taller (clientData.name)
                        await sendBotOffNotify(clientData.name, phone, combinedMessage, currentStatus).catch(e => {
                            console.error('❌ Error enviando notificación BotOff:', e);
                        });
                        
                        return;
                    }

                    // Cargar historial completo (que ya contiene estos mensajes guardados)
                    const history = await getHistory(clientData.id, 10);

                    // Consultar a Sebastian IA con el mensaje combinado y la dirección del cliente
                    const decision = await getSebastianDecision(combinedMessage, currentStatus, name, history, freshData.address);

                    // Ejecutar la decisión
                    await _executeDecision(decision, freshData, phone, name, combinedMessage, currentStatus);
                },
                {
                    priority: currentStatus === 'SENT_CLIMAX' ? 10 : 5,
                    maxRetries: 1,
                    timeout: 60000, // 60s
                }
            );
        }, waitTime);

        debounceTimers.set(clientData.id, timer);

    } catch (err) {
        console.error(`[Handler] Error inesperado para ${name}:`, err);
    }
};

// ── Ejecutar decisión de Sebastian ───────────────────────────────────────────

async function _executeDecision(
    decision:      any,
    clientData:    any,
    phone:         string,
    name:          string,
    clientMessage: string,
    stage:         BotStatus,
) {
    switch (decision.action) {

        // ── Respuesta puente → mensaje breve + auto-avanzar a Step 2 ─────────
        case 'RESPOND': {
            console.log(`[Handler] Sebastian → RESPOND para ${name} (confirmación implícita)`);

            const respondVariants = SCRIPT_VARIANTS.RESPOND_BRIDGE;
            const bridgeMsg = uniquifyMessage(respondVariants[Math.floor(Math.random() * respondVariants.length)]);

            try {
                await MetaClient.sendTextMessage(phone, bridgeMsg);
                await saveMessage(clientData.id, 'bot', bridgeMsg, stage);
                console.log(`[Handler] Puente enviado a ${name}: "${bridgeMsg}"`);

                pipelineEvents.emit('bot:message', {
                    direction: 'OUT', name, phone,
                    text: bridgeMsg, botStatus: stage,
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error(`[Handler] Error enviando puente a ${name}:`, e);
            }

            // Pausa natural antes de enviar la propuesta (simula que está preparando el material)
            await new Promise(r => setTimeout(r, HumanLikeDelays.conversationPause('normal')));

            // Auto-avanzar a Step 2 (propuesta con collage)
            await Automator.proceedToStep2(clientData);
            break;
        }

        // ── Avanzar a Step 2: collage + propuesta ────────────────────────────
        case 'ADVANCE_PROPOSAL': {
            console.log(`[Handler] Sebastian → ADVANCE_PROPOSAL para ${name}`);
            await Automator.proceedToStep2(clientData);
            break;
        }

        // ── Avanzar a Step 3: oferta de llamada ──────────────────────────────
        case 'ADVANCE_CLIMAX': {
            console.log(`[Handler] Sebastian → ADVANCE_CLIMAX para ${name}`);
            await Automator.executeStep3(clientData);
            break;
        }

        // ── Cliente aceptó la llamada (HANDOVER positivo) ────────────────────
        case 'CLIMAX_ACCEPT': {
            const variants = SCRIPT_VARIANTS.HANDOVER_CLIMAX_BRIDGE;
            const msg = uniquifyMessage(variants[Math.floor(Math.random() * variants.length)]);
            
            await updateBotStatus(clientData.id, 'HANDOVER_CLIMAX');

            const tags = Array.from(new Set([...(clientData.tags || []), 'lead']));
            await supabase.from('clients').update({ 
                status: 'contactado', 
                tags,
                is_board_suggested: true 
            }).eq('id', clientData.id);

            try {
                await MetaClient.sendTextMessage(phone, msg);
                await saveMessage(clientData.id, 'bot', msg, 'HANDOVER_CLIMAX');
                console.log(`[Handler] Bridge climax enviado a ${name}: "${msg}"`);

                pipelineEvents.emit('bot:message', {
                    direction: 'OUT', name, phone,
                    text: msg, botStatus: 'HANDOVER_CLIMAX',
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error(`[Handler] Error enviando bridge climax a ${name}:`, e);
            }

            await sendHandoverNotify(name, phone, clientMessage, 'CLIMAX', clientData.id).catch(() => {});

            // Auto-crear puente Telegram CRM para leads calientes
            initiateTakeoverBridge(clientData.id, 'auto_handoff').catch(e => {
                console.error('[Handler] Error creando Telegram CRM bridge (CLIMAX):', e);
            });

            Automator.resumeQueueIfEmpty();
            break;
        }

        // ── Sebastian detectó duda/pregunta → escalar ────────────────────────────
        case 'HANDOVER': {
            const variants = SCRIPT_VARIANTS.HANDOVER_CONFUSED;
            const msg = uniquifyMessage(variants[Math.floor(Math.random() * variants.length)]);
            
            await updateBotStatus(clientData.id, 'HANDOVER_QUESTION');

            const tags = Array.from(new Set([...(clientData.tags || []), 'pendiente']));
            await supabase.from('clients').update({ status: 'contactado', tags }).eq('id', clientData.id);

            try {
                await MetaClient.sendTextMessage(phone, msg);
                await saveMessage(clientData.id, 'bot', msg, 'HANDOVER_QUESTION');
                console.log(`[Handler] Handover enviado a ${name}: "${msg}"`);

                pipelineEvents.emit('bot:message', {
                    direction: 'OUT', name, phone,
                    text: msg, botStatus: 'HANDOVER_QUESTION',
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error(`[Handler] Error enviando handover a ${name}:`, e);
            }

            await sendHandoverNotify(name, phone, clientMessage, 'QUESTION', clientData.id).catch(() => {});

            // Auto-crear puente Telegram CRM para handovers
            initiateTakeoverBridge(clientData.id, 'auto_handoff').catch(e => {
                console.error('[Handler] Error creando Telegram CRM bridge (HANDOVER):', e);
            });

            Automator.resumeQueueIfEmpty();
            break;
        }

        // ── Cliente rechazó → despedida amable ────────────────────────────────
        case 'EXIT': {
            const variants = SCRIPT_VARIANTS.NEGATIVE_RESPONSE;
            const msg = uniquifyMessage(variants[Math.floor(Math.random() * variants.length)]);
            
            await updateBotStatus(clientData.id, 'REJECTED');
            await supabase.from('clients').update({ status: 'contactado' }).eq('id', clientData.id);

            try {
                await MetaClient.sendTextMessage(phone, msg);
                await saveMessage(clientData.id, 'bot', msg, 'REJECTED');
                console.log(`[Handler] Salida negativa enviada a ${name}: "${msg}"`);

                pipelineEvents.emit('bot:message', {
                    direction: 'OUT', name, phone,
                    text: msg, botStatus: 'REJECTED',
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error(`[Handler] Error enviando despedida a ${name}:`, e);
            }

            Automator.resumeQueueIfEmpty();
            break;
        }
    }
}
