import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase.js';
import { closeClientTopic } from '../services/telegram_crm_bridge.js';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json());
app.use(cors()); // Permitir acceso desde el Dashboard (localhost:3002)

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

import { getRecentContacts, getHistory, getHistoryPaginated } from '../config/conversations.js';

// --- NUEVOS ENDPOINTS PARA EL DASHBOARD ---
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await getRecentContacts();
        res.json(contacts);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/history/:clientId', async (req, res) => {
    try {
        const history = await getHistory(req.params.clientId, 50); // Traer los últimos 50 mensajes
        res.json(history);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/history/:clientId/paginated', async (req, res) => {
    try {
        const { cursor, limit } = req.query;
        const result = await getHistoryPaginated(
            req.params.clientId,
            limit ? parseInt(limit as string) : 20,
            cursor as string | undefined
        );
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
// ------------------------------------------
import { getConversionMetrics } from '../services/metrics.js';

app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await getConversionMetrics();
        res.json(metrics);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/client/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        let query = supabase.from('clients').select('*');
        
        if (clientId.includes('-')) {
            query = query.eq('id', clientId);
        } else {
            query = query.eq('phone', clientId);
        }

        const { data: client } = await query.single();

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const history = await getHistory(req.params.clientId, 100);

        res.json({
            ...client,
            conversation_history: history,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- KANBAN & SUGGESTED LEADS API ---

app.get('/api/kanban/cards', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, phone, status, metadata, address, board_moved_at, created_at')
            .in('status', ['FABRICA', 'COBRANZA', 'LIQUIDADO', 'CANCELADO'])
            .is('archived_at', null)
            .order('board_moved_at', { ascending: false, nullsFirst: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/kanban/archive/:id', async (req, res) => {
    try {
        const { deal_notes } = req.body;
        const clientId = req.params.id;

        // 1. Obtener datos del cliente
        const { data: client } = await supabase
            .from('clients').select('*').eq('id', clientId).single();
        if (!client) return res.status(404).json({ error: 'Not found' });

        // 2. Si es LIQUIDADO → registrar en closed_deals con conversación
        if (client.status === 'LIQUIDADO') {
            // Snapshot completo de la conversación
            const { data: messages } = await supabase
                .from('conversations')
                .select('role, message, stage, wa_timestamp, created_at')
                .eq('client_id', clientId)
                .order('created_at', { ascending: true });

            await supabase.from('closed_deals').insert({
                client_id: client.id,
                client_name: client.name,
                client_phone: client.phone,
                client_address: client.address,
                landing_url: (client as any).landing_url || null,
                deal_metadata: {
                    ...(client.metadata || {}),
                    close_notes: deal_notes || null,
                    tags: client.tags,
                },
                conversation: messages || [],
            });
        }

        // 3. Marcar como archivado (desaparece del tablero)
        await supabase.from('clients')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', clientId);

        // Cerrar Topic de Telegram si existe
        const tgThreadId = (client.metadata as any)?.telegram_thread_id;
        if (tgThreadId) {
            closeClientTopic(tgThreadId).catch(e => 
                console.error('[Archive] Error cerrando Topic de Telegram:', e)
            );
        }

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/closed-deals', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('closed_deals')
            .select('*')
            .order('closed_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/leads/suggested', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('is_board_suggested', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/leads/suggested/:id/ignore', async (req, res) => {
    try {
        const { error } = await supabase
            .from('clients')
            .update({ is_board_suggested: false })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/leads/suggested/:id/approve', async (req, res) => {
    try {
        const { error } = await supabase
            .from('clients')
            .update({ 
                status: 'FABRICA', 
                is_board_suggested: false,
                board_moved_at: new Date().toISOString()
            })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // 1. Mensajes enviados por bot hoy
        const { count: botMessagesToday } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'bot')
            .gte('created_at', todayISO);

        // 2. Mensajes recibidos de clientes hoy
        const { count: userMessagesToday } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'user')
            .gte('created_at', todayISO);

        // 3. Conversaciones activas (distintos clientes en últimas 24h)
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const { data: activeConvos } = await supabase
            .from('conversations')
            .select('client_id')
            .gte('created_at', yesterday);
        const activeCount = new Set(activeConvos?.map(c => c.client_id)).size;

        // 4. Pipeline snapshot (conteo por status)
        const { data: allClients } = await supabase
            .from('clients')
            .select('status');
        
        const pipeline: Record<string, number> = {};
        allClients?.forEach(c => {
            pipeline[c.status] = (pipeline[c.status] || 0) + 1;
        });

        // 5. Nuevos leads hoy (creados hoy)
        const { count: newLeadsToday } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayISO);

        // 6. Últimos 10 eventos (actividad reciente del sistema)
        const { data: recentEvents } = await supabase
            .from('conversations')
            .select('role, message, created_at, client_id')
            .order('created_at', { ascending: false })
            .limit(10);

        res.json({
            agents: {
                bot_messages_today: botMessagesToday || 0,
                user_messages_today: userMessagesToday || 0,
                active_conversations: activeCount,
            },
            pipeline,
            new_leads_today: newLeadsToday || 0,
            recent_events: recentEvents || [],
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


app.patch('/api/client/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { error } = await supabase
            .from('clients')
            .update({ 
                status, 
                board_moved_at: new Date().toISOString() 
            })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// Webhook Verification (GET) - Requerido por Meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado por Meta!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

import { handleIncomingMessage } from './handler';
import {
  getClientByThreadId,
  getCrmBotId,
  sendTelegramTextToWhatsApp,
  sendTelegramMediaToWhatsApp,
} from '../services/telegram_crm_bridge.js';

// Receive Messages (POST) - Payload de Meta
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object) {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        
        if (value?.messages?.[0]) {
            const message = value.messages[0];
            const contact = value.contacts?.[0];
            
            console.log(`📨 Mensaje recibido de ${message.from}`);
            
            handleIncomingMessage(message, contact).catch(err => {
                console.error('❌ Error ejecutando el handler:', err);
            });
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// ── Telegram CRM Bridge Webhook ──────────────────────────────────────────────
// Recibe replies de Daniel desde los Topics del Supergroup de Telegram
// y los reenvía al WhatsApp del cliente correspondiente.
//
// REGLA CRÍTICA: Responder 200 OK INMEDIATAMENTE antes de procesar.
// Telegram reintenta si no recibe 200 en ~5 segundos, causando duplicados.
app.post('/telegram-crm-webhook', (req, res) => {
    // Respuesta inmediata — Telegram no debe esperar
    res.sendStatus(200);

    // Procesar asíncronamente para no bloquear
    setImmediate(async () => {
        try {
            const update = req.body;
            const message = update?.message;

            // Ignorar updates sin mensaje o sin thread (mensajes fuera de Topics)
            if (!message || !message.message_thread_id) return;

            // FILTRO ANTI-LOOP: Ignorar mensajes del propio bot CRM
            const crmBotId = getCrmBotId();
            if (message.from?.id === crmBotId) return;
            if (message.from?.is_bot) return; // Ignorar cualquier bot

            const threadId = message.message_thread_id;

            // Buscar a qué cliente pertenece este Topic
            const client = await getClientByThreadId(threadId);
            if (!client) {
                console.warn(`[TG-CRM Webhook] No se encontró cliente para thread_id ${threadId}`);
                return;
            }

            const clientPhone = client.phone || '';
            console.log(`[TG-CRM Webhook] Reply de Daniel en Topic ${threadId} → WhatsApp ${clientPhone}`);

            // ── Caso 1: Mensaje de texto ──
            if (message.text) {
                await sendTelegramTextToWhatsApp(clientPhone, message.text, client.id, threadId);
                return;
            }

            // ── Caso 2: Foto (imagen) ──
            if (message.photo && message.photo.length > 0) {
                // Telegram envía varias resoluciones; tomar la de mayor calidad (última)
                const bestPhoto = message.photo[message.photo.length - 1];
                const fileId = bestPhoto.file_id;
                const caption = message.caption || undefined;
                await sendTelegramMediaToWhatsApp(clientPhone, fileId, 'photo', client.id, caption);
                return;
            }

            // ── Caso 3: Audio / Nota de voz ──
            if (message.voice || message.audio) {
                const fileId = (message.voice || message.audio).file_id;
                await sendTelegramMediaToWhatsApp(clientPhone, fileId, 'voice', client.id);
                return;
            }

            // ── Caso 4: Tipo no soportado ──
            console.log(`[TG-CRM Webhook] Tipo de mensaje no soportado en Topic ${threadId}`);

        } catch (err: any) {
            console.error('[TG-CRM Webhook] Error procesando reply de Telegram:', err.message);
        }
    });
});

// ── DevOps Bot: Webhook para InlineKeyboard Callbacks ────────────────────────
// Procesa las pulsaciones de botones del Bot de Control Remoto.
app.post('/telegram-devops-webhook', (req, res) => {
    res.sendStatus(200);

    setImmediate(async () => {
        try {
            const update = req.body;
            const callback = update?.callback_query;
            if (!callback) return;

            const data = callback.data; // formato: "action:clientId"
            if (!data) return;

            const [action, clientId] = data.split(':');
            if (!clientId) return;

            const DEVOPS_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
            const DEVOPS_API = `https://api.telegram.org/bot${DEVOPS_TOKEN}`;

            // Responder al callback para quitar el "loading" del botón
            const axios = (await import('axios')).default;
            await axios.post(`${DEVOPS_API}/answerCallbackQuery`, {
                callback_query_id: callback.id,
                text: `Ejecutando: ${action}...`,
            });

            switch (action) {
                case 'approve': {
                    // Mover a FABRICA + quitar sugerencia
                    await supabase.from('clients').update({ 
                        status: 'FABRICA',
                        is_board_suggested: false,
                        board_moved_at: new Date().toISOString(),
                    }).eq('id', clientId);

                    // Editar el mensaje original para mostrar resultado
                    await axios.post(`${DEVOPS_API}/editMessageText`, {
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: callback.message.text + '\n\n✅ APROBADO → Fábrica',
                        parse_mode: 'HTML',
                    }).catch(() => {});

                    console.log(`[DevOps Bot] Cliente ${clientId} aprobado a FABRICA`);
                    break;
                }
                case 'discard': {
                    await supabase.from('clients').update({ 
                        is_board_suggested: false,
                    }).eq('id', clientId);

                    await axios.post(`${DEVOPS_API}/editMessageText`, {
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: callback.message.text + '\n\n❌ DESCARTADO',
                        parse_mode: 'HTML',
                    }).catch(() => {});

                    console.log(`[DevOps Bot] Cliente ${clientId} descartado`);
                    break;
                }
                case 'pause': {
                    const { data: client } = await supabase
                        .from('clients').select('metadata').eq('id', clientId).single();
                    
                    if (client) {
                        await supabase.from('clients').update({
                            metadata: { ...(client.metadata as any || {}), bot_status: 'HANDOVER_MANUAL' }
                        }).eq('id', clientId);
                    }

                    await axios.post(`${DEVOPS_API}/editMessageText`, {
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: callback.message.text + '\n\n⏸️ BOT PAUSADO',
                        parse_mode: 'HTML',
                    }).catch(() => {});

                    console.log(`[DevOps Bot] Bot pausado para cliente ${clientId}`);
                    break;
                }
                case 'resume': {
                    const { data: client2 } = await supabase
                        .from('clients').select('metadata').eq('id', clientId).single();
                    
                    if (client2) {
                        const meta = { ...(client2.metadata as any || {}) };
                        meta.bot_status = 'SENT_GREETING';
                        delete meta.telegram_thread_id;
                        await supabase.from('clients').update({ metadata: meta }).eq('id', clientId);
                    }

                    await axios.post(`${DEVOPS_API}/editMessageText`, {
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: callback.message.text + '\n\n▶️ BOT REACTIVADO',
                        parse_mode: 'HTML',
                    }).catch(() => {});

                    console.log(`[DevOps Bot] Bot reactivado para cliente ${clientId}`);
                    break;
                }
            }
        } catch (err: any) {
            console.error('[DevOps Webhook] Error:', err.message);
        }
    });
});

export function startServer() {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Servidor Webhook de Meta escuchando en el puerto ${PORT}`);
        console.log(`🔗 Endpoint para configurar en Meta: http://<TU_DOMINIO_NGROK>/webhook`);
        console.log(`📡 Telegram CRM Webhook activo en: POST /telegram-crm-webhook`);
    });
    return server;
}
