import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase.js';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json());
app.use(cors()); // Permitir acceso desde el Dashboard (localhost:3002)

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

import { getRecentContacts, getHistory } from '../config/conversations.js';

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
        const { data: client } = await supabase
            .from('clients')
            .select('*')
            .eq('id', req.params.clientId)
            .single();

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

// Endpoint para servir archivos multimedia (audio/imágenes)
app.get('/api/media/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    const safeFolders = ['audios', 'images'];
    if (!safeFolders.includes(folder)) {
        return res.status(403).send('Acceso denegado');
    }

    const filePath = path.join(process.cwd(), 'downloads', folder, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Archivo no encontrado');
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
                await sendTelegramTextToWhatsApp(clientPhone, message.text, client.id);
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

export function startServer() {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Servidor Webhook de Meta escuchando en el puerto ${PORT}`);
        console.log(`🔗 Endpoint para configurar en Meta: http://<TU_DOMINIO_NGROK>/webhook`);
        console.log(`📡 Telegram CRM Webhook activo en: POST /telegram-crm-webhook`);
    });
    return server;
}
