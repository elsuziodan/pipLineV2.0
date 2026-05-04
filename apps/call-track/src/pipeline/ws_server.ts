/**
 * ws_server.ts
 * ------------
 * Servidor WebSocket del CallTrack Control Tower.
 *
 * Puerto: 3001 (separado de Express en 3000 para no interferir con webhooks de Meta).
 *
 * RESPONSABILIDADES:
 *   1. Escuchar conexiones del Dashboard y reenviarle todos los eventos del pipeline.
 *   2. Recibir comandos del Dashboard y traducirlos a eventos internos del pipeline.
 *
 * COMANDOS que acepta del Dashboard (JSON):
 *   { type: 'STOP_ALL' }             → emite pipeline:stop (para todo)
 *   { type: 'STOP_BOT' }             → emite bot:pause (pausa solo el bot)
 *   { type: 'RESUME_BOT' }           → emite bot:resume (reanuda el bot)
 *   { type: 'GATE_APPROVE', gate }   → emite gate:decision aprobado
 *   { type: 'GATE_REJECT', gate }    → emite gate:decision rechazado
 *
 * EVENTOS que reenvía al Dashboard:
 *   Todos los eventos de pipelineEvents se serializan a JSON y se envían
 *   a todos los clientes conectados con el formato:
 *   { event: 'nombre:evento', data: { ...payload } }
 *
 * NOTAS TÉCNICAS:
 *   - Usa 'ws' (ya en node_modules). No añade dependencias nuevas.
 *   - El Dashboard se conecta a ws://localhost:3001
 *   - Maneja reconexiones: si el dashboard se desconecta y reconecta, recibe
 *     el estado actual del pipeline inmediatamente (snapshot).
 */

import { WebSocketServer, WebSocket } from 'ws';
import {
  pipelineEvents,
  PipelineEventMap,
} from './pipeline_events.js';
import { supabase } from '../config/supabase.js';
import { MetaClient } from '../whatsapp/meta_client.js';
import { saveMessage } from '../config/conversations.js';
import { getLeadByPhone } from '../config/database.js';
import { initiateTakeoverBridge } from '../services/telegram_crm_bridge.js';

const WS_PORT = 3001;

// ── Estado actual del pipeline para nuevas conexiones ────────────────────────
// Cuando un cliente se conecta, se le envía el último estado conocido de cada
// sección para que el dashboard muestre información correcta de inmediato.
let latestPipelineStatus: object | null = null;
let latestScraperProgress: object | null = null;
let latestLoaderProgress: object | null = null;
let latestGatePending: object | null = null;
let recentBotMessages: any[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Serializa un evento para enviarlo al Dashboard.
 * Formato: { event: 'nombre:evento', data: payload }
 */
function serialize(eventName: string, data: unknown): string {
  return JSON.stringify({ event: eventName, data });
}

/**
 * Envía un mensaje a todos los clientes WebSocket activos.
 */
function broadcast(wss: WebSocketServer, eventName: string, data: unknown): void {
  const message = serialize(eventName, data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Envía el snapshot del estado actual a un cliente recién conectado.
 * Así el dashboard no arranca en blanco si el pipeline ya estaba corriendo.
 */
function sendSnapshot(client: WebSocket): void {
  const snapshots = [
    ['pipeline:status', latestPipelineStatus],
    ['scraper:progress', latestScraperProgress],
    ['loader:progress', latestLoaderProgress],
    ['gate:pending', latestGatePending],
  ];

  for (const [event, data] of snapshots) {
    if (data !== null && client.readyState === WebSocket.OPEN) {
      client.send(serialize(event as string, data));
    }
  }

  // Enviar historial reciente de mensajes en vivo (del más antiguo al más reciente)
  const reversedMessages = [...recentBotMessages].reverse();
  for (const msg of reversedMessages) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialize('bot:message', msg));
    }
  }
}

// ── Suscripciones a pipelineEvents ──────────────────────────────────────────
// Se registran UNA SOLA VEZ cuando arranca el servidor.
// Cada listener guarda el último estado (para snapshot) y hace broadcast.

function registerPipelineListeners(wss: WebSocketServer): void {

  pipelineEvents.on('pipeline:status', (data) => {
    latestPipelineStatus = data;
    broadcast(wss, 'pipeline:status', data);
  });

  pipelineEvents.on('pipeline:stop', (data) => {
    latestPipelineStatus = { block: 'STOPPED', status: 'stopped', message: data.reason, timestamp: data.timestamp };
    broadcast(wss, 'pipeline:stop', data);
  });

  pipelineEvents.on('scraper:progress', (data) => {
    latestScraperProgress = data;
    broadcast(wss, 'scraper:progress', data);
  });

  pipelineEvents.on('scraper:complete', (data) => {
    latestScraperProgress = null; // limpiamos al completar
    broadcast(wss, 'scraper:complete', data);
  });

  pipelineEvents.on('loader:progress', (data) => {
    latestLoaderProgress = data;
    broadcast(wss, 'loader:progress', data);
  });

  pipelineEvents.on('loader:complete', (data) => {
    latestLoaderProgress = null;
    broadcast(wss, 'loader:complete', data);
  });

  pipelineEvents.on('bot:message', (data) => {
    // Almacenar mensajes en memoria para nuevas conexiones (máx 200)
    recentBotMessages.unshift(data);
    if (recentBotMessages.length > 200) recentBotMessages.pop();
    broadcast(wss, 'bot:message', data);
  });

  pipelineEvents.on('bot:pause', () => {
    broadcast(wss, 'bot:pause', { timestamp: new Date().toISOString() });
  });

  pipelineEvents.on('bot:resume', () => {
    broadcast(wss, 'bot:resume', { timestamp: new Date().toISOString() });
  });

  pipelineEvents.on('gate:pending', (data) => {
    latestGatePending = data;
    broadcast(wss, 'gate:pending', data);
  });

  pipelineEvents.on('gate:decision', (data) => {
    latestGatePending = null; // gate resuelto, limpiamos
    broadcast(wss, 'gate:decision', data);
  });
}

// ── Manejador de comandos del Dashboard ─────────────────────────────────────

type DashboardCommand =
  | { type: 'STOP_ALL' }
  | { type: 'STOP_BOT' }
  | { type: 'RESUME_BOT' }
  | { type: 'GATE_APPROVE'; gate: 'A' | 'B' | 'C' }
  | { type: 'GATE_REJECT'; gate: 'A' | 'B' | 'C' }
  | { type: 'MARK_LEAD'; contactId: string }
  | { type: 'UNMARK_LEAD'; contactId: string }
  | { type: 'SEND_MESSAGE'; to: string; text: string }
  | { type: 'TOGGLE_BOT_STATUS'; contactId: string; enable: boolean }
  | { type: 'TOGGLE_TELEGRAM_CRM'; contactId: string; enable: boolean };

function handleCommand(raw: string): void {
  let cmd: DashboardCommand;

  try {
    cmd = JSON.parse(raw) as DashboardCommand;
  } catch {
    console.warn('⚠️ [WS] Comando inválido (no es JSON):', raw);
    return;
  }

  const ts = new Date().toISOString();

  switch (cmd.type) {
    case 'STOP_ALL':
      console.log('🛑 [WS] Comando STOP_ALL recibido del Dashboard.');
      pipelineEvents.emit('pipeline:stop', {
        reason: 'Detenido manualmente desde el Dashboard.',
        timestamp: ts,
      });
      break;

    case 'STOP_BOT':
      console.log('⏸ [WS] Comando STOP_BOT recibido del Dashboard.');
      pipelineEvents.emit('bot:pause');
      break;

    case 'RESUME_BOT':
      console.log('▶️ [WS] Comando RESUME_BOT recibido del Dashboard.');
      pipelineEvents.emit('bot:resume');
      break;

    case 'GATE_APPROVE':
      console.log(`✅ [WS] Comando GATE_APPROVE (Gate ${cmd.gate}) recibido del Dashboard.`);
      pipelineEvents.emit('gate:decision', {
        gate: cmd.gate,
        approved: true,
        source: 'manual',
        reason: 'Aprobado manualmente desde el Dashboard.',
        timestamp: ts,
      });
      break;

    case 'GATE_REJECT':
      console.log(`❌ [WS] Comando GATE_REJECT (Gate ${cmd.gate}) recibido del Dashboard.`);
      pipelineEvents.emit('gate:decision', {
        gate: cmd.gate,
        approved: false,
        source: 'manual',
        reason: 'Rechazado manualmente desde el Dashboard.',
        timestamp: ts,
      });
      break;

    case 'MARK_LEAD':
      console.log(`✅ [WS] Comando MARK_LEAD recibido para: ${cmd.contactId}`);
      (async () => {
        try {
          await supabase.from('clients').update({ status: 'FINAL_REPLY' }).eq('id', cmd.contactId);
          pipelineEvents.emit('pipeline:progress', { message: 'Marcado como Lead' });
        } catch (err) {
          console.error('Error actualizando Lead:', err);
        }
      })();
      break;

    case 'UNMARK_LEAD':
      console.log(`❌ [WS] Comando UNMARK_LEAD recibido para: ${cmd.contactId}`);
      (async () => {
        try {
          await supabase.from('clients').update({ status: 'contactado' }).eq('id', cmd.contactId);
          pipelineEvents.emit('pipeline:progress', { message: 'Desmarcado como Lead' });
        } catch (err) {
          console.error('Error desmarcando Lead:', err);
        }
      })();
      break;

    case 'TOGGLE_BOT_STATUS':
      console.log(`🤖 [WS] Comando TOGGLE_BOT_STATUS recibido para: ${cmd.contactId}`);
      (async () => {
         try {
            const { contactId, enable } = cmd;
            let client;
            if (contactId.length === 36 && contactId.includes('-')) {
                const { data } = await supabase.from('clients').select('*').eq('id', contactId).single();
                client = data;
            } else {
                client = await getLeadByPhone(contactId);
            }
            if (client) {
                const newStatus = enable ? 'SENT_PROPOSAL' : 'HANDOVER_MANUAL';
                
                // Actualizar metadatos
                const metadata = client.metadata || {};
                metadata.bot_status = newStatus;
                await supabase.from('clients').update({ metadata }).eq('id', client.id);
                
                console.log(`[WS] Bot ${enable ? 'activado' : 'desactivado'} manualmente para ${client.name} (${newStatus})`);
            }
         } catch(e) {
            console.error('[WS] Error en TOGGLE_BOT_STATUS:', e);
         }
      })();
      break;

    case 'SEND_MESSAGE':
      console.log(`💬 [WS] Comando SEND_MESSAGE recibido hacia: ${cmd.to}`);
      (async () => {
        let phone = cmd.to;
        let name = 'Desconocido';
        let clientId: string | null = null;
        try {
          const toId = cmd.to;
          const text = cmd.text;
          
          // Verificar si 'to' es un UUID (vista Archive/Lead)
          if (toId.length === 36 && toId.includes('-')) {
             const { data } = await supabase.from('clients').select('id, phone, name').eq('id', toId).single();
             if (data) {
                phone = data.phone;
                // Normalizar a formato WhatsApp (Meta usa 521 para móviles en México)
                // para que el UI no divida el chat entre entrantes (521) y salientes (10 dígitos).
                if (phone && phone.length === 10) {
                    phone = `521${phone}`;
                }
                name = data.name;
                clientId = data.id;
             }
          } else {
             // Es un nombre o teléfono (vista Live)
             // 1. Buscar en los mensajes recientes para obtener el teléfono real si nos pasaron un nombre
             const recentMsg = recentBotMessages.find(m => m.name === toId || m.phone === toId);
             if (recentMsg && recentMsg.phone) {
                 phone = recentMsg.phone;
             }
             
             // 2. Buscar el lead usando el teléfono exacto
             // Si pasaron un nombre sin teléfono en recentBotMessages, evitamos la búsqueda errónea
             if (phone.match(/\d+/)) {
                 const lead = await getLeadByPhone(phone);
                 if (lead) {
                    // Mantenemos el 'phone' original de WhatsApp (con código de país)
                    // Si lo sobrescribimos con lead.phone (ej. sin '521'), dividirá los chats.
                    name = lead.name;
                    clientId = lead.id;
                 }
             } else {
                 console.warn(`[WS] No se encontró un teléfono válido para ${toId}`);
             }
          }
          
          // 1. Enviar por WhatsApp
          await MetaClient.sendTextMessage(phone, text);
          
          // 2. Guardar en Base de Datos
          if (clientId) {
             const { data } = await supabase.from('clients').select('metadata').eq('id', clientId).single();
             const botStatus = data?.metadata?.bot_status || 'MANUAL';
             await saveMessage(clientId, 'bot', text, botStatus as any);
          }
          
          // 3. Notificar al Dashboard
          pipelineEvents.emit('bot:message', {
             clientId,
             direction: 'OUT', name, phone,
             text, botStatus: 'MANUAL',
             timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
           console.error('❌ [WS] Error enviando mensaje manual:', err.message);
           
           // Notificar al Dashboard sobre el error de Meta (probablemente la regla de 24h)
           let errorMessage = '❌ Error de Meta: No se pudo enviar el mensaje.';
           if (err.response?.data?.error?.code === 131047 || err.message.includes('24 hours')) {
               errorMessage = '❌ Meta rechazó el mensaje: Han pasado más de 24 horas desde la última respuesta del cliente. Debes usar una plantilla aprobada.';
           }
           
           pipelineEvents.emit('bot:message', {
              direction: 'IN', 
              name: 'System Error', 
              phone: phone,
              text: errorMessage,
              botStatus: 'MANUAL',
              timestamp: new Date().toISOString(),
            });
        }
      })();
      break;

    case 'TOGGLE_TELEGRAM_CRM':
      console.log(`📡 [WS] Comando TOGGLE_TELEGRAM_CRM recibido para: ${cmd.contactId} (enable: ${cmd.enable})`);
      (async () => {
        try {
          const { contactId, enable } = cmd;
          
          // Buscar el cliente
          let client;
          if (contactId.length === 36 && contactId.includes('-')) {
            const { data } = await supabase.from('clients').select('*').eq('id', contactId).single();
            client = data;
          } else {
            client = await getLeadByPhone(contactId);
          }

          if (!client) {
            console.warn(`[WS] Cliente no encontrado para TOGGLE_TELEGRAM_CRM: ${contactId}`);
            return;
          }

          if (enable) {
            // Crear el puente Telegram CRM
            const result = await initiateTakeoverBridge(client.id, 'dashboard_manual');
            if (result.success) {
              console.log(`[WS] ✅ Puente Telegram CRM activado para ${client.name} (thread: ${result.threadId})`);
            } else {
              console.error(`[WS] ❌ Error activando puente Telegram CRM: ${result.error}`);
            }
          } else {
            // Desactivar el puente: quitar telegram_thread_id de metadata
            const metadata = { ...(client.metadata || {}) } as Record<string, unknown>;
            delete metadata.telegram_thread_id;
            delete metadata.telegram_topic_name;
            delete metadata.telegram_bridge_origin;
            delete metadata.telegram_bridge_created_at;
            // Restaurar bot_status si estaba en HANDOVER_MANUAL
            if (metadata.bot_status === 'HANDOVER_MANUAL') {
              metadata.bot_status = 'HANDOVER_QUESTION';
            }
            await supabase.from('clients').update({ metadata }).eq('id', client.id);
            console.log(`[WS] Puente Telegram CRM desactivado para ${client.name}`);
          }
        } catch (e) {
          console.error('[WS] Error en TOGGLE_TELEGRAM_CRM:', e);
        }
      })();
      break;

    default:
      console.warn('⚠️ [WS] Tipo de comando desconocido:', (cmd as { type: string }).type);
  }
}

// ── Arranque del servidor ────────────────────────────────────────────────────

export function startWsServer(httpServer?: any): void {
  const wss = httpServer 
    ? new WebSocketServer({ server: httpServer }) 
    : new WebSocketServer({ port: WS_PORT });

  // Registrar listeners de pipeline UNA SOLA VEZ
  registerPipelineListeners(wss);

  wss.on('connection', (client, req) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    console.log(`🔌 [WS] Dashboard conectado desde ${ip}`);

    // Enviar snapshot del estado actual al cliente recién conectado
    sendSnapshot(client);

    // Escuchar comandos del Dashboard
    client.on('message', (data) => {
      handleCommand(data.toString());
    });

    client.on('close', () => {
      console.log(`🔌 [WS] Dashboard desconectado (${ip})`);
    });

    client.on('error', (err) => {
      console.error(`❌ [WS] Error en cliente ${ip}:`, err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('❌ [WS] Error en servidor WebSocket:', err.message);
  });

  if (httpServer) {
    console.log(`🔌 Servidor WebSocket adjuntado al servidor HTTP principal`);
  } else {
    console.log(`🔌 Servidor WebSocket del Control Tower activo en ws://localhost:${WS_PORT}`);
  }
}
