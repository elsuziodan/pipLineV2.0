/**
 * telegram_crm_bridge.ts
 * ──────────────────────
 * Motor del puente bidireccional WhatsApp ↔ Telegram CRM.
 *
 * Este módulo maneja:
 *   1. Creación de Topics en el Supergroup de Telegram (1 Topic = 1 cliente)
 *   2. Envío del "Takeover Log" con historial pinneado
 *   3. Reenvío de mensajes WhatsApp → Telegram Topic (texto + media)
 *   4. Reenvío de replies Telegram → WhatsApp (texto + media)
 *   5. Lookup de clientes por telegram_thread_id
 *
 * IMPORTANTE: Este módulo usa un BOT DE TELEGRAM DIFERENTE al de DevOps.
 *   - DevOps bot: TELEGRAM_BOT_TOKEN (notificaciones simples)
 *   - CRM bot: TELEGRAM_CRM_BOT_TOKEN (puente bidireccional)
 *   NO se toca telegram_notify.ts bajo ninguna circunstancia.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';
import { getHistory } from '../config/conversations.js';
import { saveMessage } from '../config/conversations.js';
import { MetaClient } from '../whatsapp/meta_client.js';
import { normalizeToInternational } from '../whatsapp/utils.js';
import { pipelineEvents } from '../pipeline/pipeline_events.js';
import FormData from 'form-data';

dotenv.config({ path: '.env.local' });

// ── Configuración del Bot CRM ────────────────────────────────────────────────

const TG_BOT_TOKEN = process.env.TELEGRAM_CRM_BOT_TOKEN!;
const TG_CHAT_ID = process.env.TELEGRAM_CRM_CHAT_ID!;
const TG_BOT_ID = parseInt(process.env.TELEGRAM_CRM_BOT_ID || TG_BOT_TOKEN.split(':')[0]);
const TG_API = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;

const META_API_URL = 'https://graph.facebook.com/v20.0';
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;

// ── Tipos ────────────────────────────────────────────────────────────────────

interface TakeoverResult {
  success: boolean;
  threadId?: number;
  error?: string;
}

// ── Función Principal: Iniciar Puente de Takeover ────────────────────────────

/**
 * Función maestra que ejecuta la secuencia completa de takeover:
 *   1. Verifica si el cliente ya tiene un Topic (evita duplicados)
 *   2. Obtiene los últimos 15 mensajes del historial
 *   3. Crea un Topic en el Supergroup de Telegram
 *   4. Envía y pinnea el Takeover Log
 *   5. Actualiza metadata del cliente en Supabase
 *
 * @param clientId - UUID del cliente en Supabase
 * @param origin - 'auto_handoff' | 'dashboard_manual'
 */
export async function initiateTakeoverBridge(
  clientId: string,
  origin: 'auto_handoff' | 'dashboard_manual'
): Promise<TakeoverResult> {
  try {
    console.log(`[CRM Bridge] Iniciando takeover para cliente ${clientId} (origen: ${origin})`);

    // 1. Obtener datos del cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('[CRM Bridge] Cliente no encontrado:', clientError?.message);
      return { success: false, error: 'Cliente no encontrado' };
    }

    // 2. Verificar si ya tiene un Topic creado (evitar duplicados)
    const existingThreadId = (client.metadata as any)?.telegram_thread_id;
    if (existingThreadId) {
      console.log(`[CRM Bridge] Cliente ${client.name} ya tiene Topic (thread_id: ${existingThreadId}). Saltando creación.`);
      return { success: true, threadId: existingThreadId };
    }

    // 3. Obtener historial de conversación (últimos 15 mensajes)
    const history = await getHistory(clientId, 15);

    // 4. Formatear el Takeover Log
    const phoneDisplay = client.phone || 'N/A';
    const takeoverLog = formatTakeoverLog(
      client.name,
      phoneDisplay,
      origin,
      history
    );

    // 5. Crear Topic en Telegram
    // Prioridad: nombre_negocio (si existe) -> name (nombre del taller) -> teléfono
    const topicName = (client as any).nombre_negocio || client.name || `+${phoneDisplay}`;
    const threadId = await createForumTopic(topicName);

    if (!threadId) {
      return { success: false, error: 'No se pudo crear el Topic en Telegram' };
    }

    console.log(`[CRM Bridge] Topic creado: "${topicName}" (thread_id: ${threadId})`);

    // 6. Enviar el Takeover Log al Topic
    const messageId = await sendTextToThread(threadId, takeoverLog);

    // 7. Pinnear el mensaje
    if (messageId) {
      await pinMessage(messageId);
      console.log(`[CRM Bridge] Takeover Log pinneado en Topic ${threadId}`);
    }

    // 8. Actualizar metadata del cliente en Supabase
    const currentMetadata = (client.metadata || {}) as Record<string, unknown>;
    await supabase.from('clients').update({
      metadata: {
        ...currentMetadata,
        bot_status: 'HANDOVER_MANUAL',
        telegram_thread_id: threadId,
        telegram_topic_name: topicName,
        telegram_bridge_origin: origin,
        telegram_bridge_created_at: new Date().toISOString(),
      }
    }).eq('id', clientId);

    console.log(`[CRM Bridge] ✅ Puente creado exitosamente para ${client.name}`);
    return { success: true, threadId };

  } catch (err: any) {
    console.error('[CRM Bridge] Error en initiateTakeoverBridge:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Formatear Takeover Log ───────────────────────────────────────────────────

/**
 * Genera el texto formateado del Takeover Log que se pinnea en el Topic.
 */
export function formatTakeoverLog(
  clientName: string,
  phone: string,
  origin: 'auto_handoff' | 'dashboard_manual',
  history: { role: string; message: string; wa_timestamp?: number; created_at?: string }[]
): string {
  const originLabel = origin === 'auto_handoff'
    ? 'Auto-Handoff (Sebastian → Lead Caliente)'
    : 'Dashboard Manual (Toggle por Daniel)';

  let historyBlock = '';
  if (history.length > 0) {
    historyBlock = history.map(m => {
      let timeStr = '';
      if (m.wa_timestamp) {
        const d = new Date(m.wa_timestamp * 1000);
        timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } else if (m.created_at) {
        const d = new Date(m.created_at);
        timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      }
      const sender = m.role === 'bot' ? 'IA' : 'Cliente';
      const msgText = m.message.length > 300 ? m.message.substring(0, 300) + '...' : m.message;
      return `[${timeStr}] ${sender}: ${msgText}`;
    }).join('\n');
  } else {
    historyBlock = '(Sin historial disponible)';
  }

  return `🚨 TOMA DE CONTROL MANUAL 🚨
👤 Cliente: ${clientName}
📱 Tel: ${phone}
📍 Origen: ${originLabel}

📜 HISTORIAL RECIENTE:
${historyBlock}

🛑 El agente IA ha sido pausado para este cliente.
📩 Responde en este hilo para enviar directo a su WhatsApp.`;
}

// ── Telegram API: Crear Forum Topic ──────────────────────────────────────────

/**
 * Crea un nuevo Topic (hilo) en el Supergroup de Telegram.
 * @returns message_thread_id del Topic creado, o null si falla.
 */
async function createForumTopic(name: string): Promise<number | null> {
  try {
    const response = await axios.post(`${TG_API}/createForumTopic`, {
      chat_id: TG_CHAT_ID,
      name: name,
      icon_color: 7322096, // Color azul-verde para el icono del Topic
    });

    return response.data?.result?.message_thread_id || null;
  } catch (err: any) {
    console.error('[CRM Bridge] Error creando Forum Topic:', err.response?.data || err.message);
    return null;
  }
}

// ── Telegram API: Enviar Texto a un Thread ───────────────────────────────────

/**
 * Envía un mensaje de texto a un Topic específico del Supergroup.
 * @returns message_id del mensaje enviado, o null si falla.
 */
async function sendTextToThread(threadId: number, text: string): Promise<number | null> {
  try {
    const response = await axios.post(`${TG_API}/sendMessage`, {
      chat_id: TG_CHAT_ID,
      message_thread_id: threadId,
      text: text,
    });

    return response.data?.result?.message_id || null;
  } catch (err: any) {
    console.error('[CRM Bridge] Error enviando texto al Topic:', err.response?.data || err.message);
    return null;
  }
}

// ── Telegram API: Pinnear Mensaje ────────────────────────────────────────────

async function pinMessage(messageId: number): Promise<void> {
  try {
    await axios.post(`${TG_API}/pinChatMessage`, {
      chat_id: TG_CHAT_ID,
      message_id: messageId,
      disable_notification: true,
    });
  } catch (err: any) {
    console.error('[CRM Bridge] Error pinneando mensaje:', err.response?.data || err.message);
  }
}

// ── Path A: WhatsApp → Telegram (Texto) ──────────────────────────────────────

/**
 * Reenvía un mensaje de texto de WhatsApp al Topic de Telegram del cliente.
 * Se llama desde handler.ts cuando el cliente tiene mode=manual y thread_id.
 *
 * @param threadId - message_thread_id del Topic en Telegram
 * @param text - texto del mensaje del cliente
 * @param senderName - nombre del cliente (para el encabezado)
 */
export async function sendWhatsAppTextToTelegram(
  threadId: number,
  text: string,
  senderName?: string
): Promise<void> {
  const prefix = senderName ? `📱 ${senderName}:\n` : '📱 Cliente:\n';
  await sendTextToThread(threadId, `${prefix}${text}`);
}

// ── Path A: WhatsApp → Telegram (Media) ──────────────────────────────────────

/**
 * Descarga media desde Meta WhatsApp API y la reenvía al Topic de Telegram.
 * Soporta: imágenes (sendPhoto) y audio/voz (sendVoice).
 *
 * @param threadId - message_thread_id del Topic en Telegram
 * @param mediaId - ID del media en Meta API
 * @param mediaType - 'image' | 'audio'
 * @param senderName - nombre del cliente
 */
export async function sendWhatsAppMediaToTelegram(
  threadId: number,
  mediaId: string,
  mediaType: 'image' | 'audio',
  senderName?: string
): Promise<void> {
  try {
    // 1. Obtener URL de descarga del media desde Meta
    const mediaUrlResponse = await axios.get(`${META_API_URL}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` },
    });
    const mediaUrl = mediaUrlResponse.data.url;

    // 2. Descargar el buffer del media desde Meta
    const mediaResponse = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` },
    });
    const buffer = Buffer.from(mediaResponse.data);

    // 3. Preparar FormData para subir a Telegram
    const form = new FormData();
    form.append('chat_id', TG_CHAT_ID);
    form.append('message_thread_id', String(threadId));

    const caption = senderName ? `📱 ${senderName}` : '📱 Cliente';

    if (mediaType === 'image') {
      form.append('photo', buffer, { filename: `whatsapp_image_${Date.now()}.jpg`, contentType: 'image/jpeg' });
      form.append('caption', caption);

      await axios.post(`${TG_API}/sendPhoto`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } else if (mediaType === 'audio') {
      form.append('voice', buffer, { filename: `whatsapp_audio_${Date.now()}.ogg`, contentType: 'audio/ogg' });
      form.append('caption', caption);

      await axios.post(`${TG_API}/sendVoice`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    }

    console.log(`[CRM Bridge] Media (${mediaType}) reenviado a Telegram Topic ${threadId}`);
  } catch (err: any) {
    console.error(`[CRM Bridge] Error reenviando media a Telegram:`, err.response?.data || err.message);
    // Fallback: enviar notificación de texto si falla el media
    await sendTextToThread(threadId, `📱 ${senderName || 'Cliente'} envió un archivo ${mediaType === 'image' ? '📷 (imagen)' : '🎤 (audio)'} que no se pudo reenviar.`);
  }
}

// ── Path B: Telegram → WhatsApp (Texto) ──────────────────────────────────────

/**
 * Envía un reply de Telegram a WhatsApp del cliente.
 * Se llama desde el webhook handler de Telegram.
 *
 * @param phone - teléfono del cliente (se normaliza internamente)
 * @param text - texto del reply desde Telegram
 * @param clientId - UUID del cliente para guardar en historial
 */
export async function sendTelegramTextToWhatsApp(
  phone: string,
  text: string,
  clientId: string
): Promise<void> {
  try {
    const normalizedPhone = normalizeToInternational(phone);

    await MetaClient.sendTextMessage(normalizedPhone, text);
    await saveMessage(clientId, 'bot', text, 'HANDOVER_MANUAL');

    // Notificar al Dashboard
    pipelineEvents.emit('bot:message', {
      direction: 'OUT',
      name: 'Daniel (Telegram)',
      phone: normalizedPhone,
      text: text,
      botStatus: 'HANDOVER_MANUAL',
      timestamp: new Date().toISOString(),
    });

    console.log(`[CRM Bridge] Reply enviado a WhatsApp ${normalizedPhone}: "${text.substring(0, 50)}..."`);
  } catch (err: any) {
    console.error(`[CRM Bridge] Error enviando reply a WhatsApp:`, err.response?.data || err.message);
  }
}

// ── Path B: Telegram → WhatsApp (Media) ──────────────────────────────────────

/**
 * Descarga media desde Telegram y la reenvía al WhatsApp del cliente.
 * Soporta: fotos (getFile → upload a Meta → sendImageByMediaId)
 *          y audio/voz (getFile → upload a Meta → sendMessage con audio media_id)
 *
 * @param phone - teléfono del cliente
 * @param fileId - file_id del media en Telegram
 * @param mediaType - 'photo' | 'voice'
 * @param clientId - UUID del cliente
 * @param caption - texto opcional del caption
 */
export async function sendTelegramMediaToWhatsApp(
  phone: string,
  fileId: string,
  mediaType: 'photo' | 'voice',
  clientId: string,
  caption?: string
): Promise<void> {
  try {
    const normalizedPhone = normalizeToInternational(phone);

    // 1. Obtener info del archivo desde Telegram
    const fileInfoResponse = await axios.get(`${TG_API}/getFile`, {
      params: { file_id: fileId },
    });
    const filePath = fileInfoResponse.data?.result?.file_path;
    if (!filePath) {
      console.error('[CRM Bridge] No se pudo obtener file_path de Telegram');
      return;
    }

    // 2. Descargar el buffer del archivo desde Telegram
    const fileUrl = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;
    const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(fileResponse.data);

    // 3. Subir a Meta WhatsApp API
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');

    if (mediaType === 'photo') {
      form.append('type', 'image/jpeg');
      form.append('file', buffer, { filename: `telegram_image_${Date.now()}.jpg`, contentType: 'image/jpeg' });
    } else {
      form.append('type', 'audio/ogg; codecs=opus');
      form.append('file', buffer, { filename: `telegram_voice_${Date.now()}.ogg`, contentType: 'audio/ogg' });
    }

    const uploadResponse = await axios.post(
      `${META_API_URL}/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          ...form.getHeaders(),
        },
      }
    );

    const metaMediaId = uploadResponse.data.id;
    console.log(`[CRM Bridge] Media subido a Meta. media_id: ${metaMediaId}`);

    // 4. Enviar el media al cliente por WhatsApp
    if (mediaType === 'photo') {
      await MetaClient.sendImageByMediaId(normalizedPhone, metaMediaId, caption);
      await saveMessage(clientId, 'bot', caption || '[Imagen enviada desde Telegram]', 'HANDOVER_MANUAL');
    } else {
      // Enviar audio directamente con la API de Meta
      await axios.post(
        `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'audio',
          audio: { id: metaMediaId },
        },
        {
          headers: {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      await saveMessage(clientId, 'bot', '[Audio enviado desde Telegram]', 'HANDOVER_MANUAL');
    }

    // 5. Notificar al Dashboard
    pipelineEvents.emit('bot:message', {
      direction: 'OUT',
      name: 'Daniel (Telegram)',
      phone: normalizedPhone,
      text: mediaType === 'photo' ? '[📷 Imagen desde Telegram]' : '[🎤 Audio desde Telegram]',
      botStatus: 'HANDOVER_MANUAL',
      timestamp: new Date().toISOString(),
    });

    console.log(`[CRM Bridge] Media (${mediaType}) enviado a WhatsApp ${normalizedPhone}`);
  } catch (err: any) {
    console.error(`[CRM Bridge] Error enviando media de Telegram a WhatsApp:`, err.response?.data || err.message);
  }
}

// ── Lookup: Buscar cliente por thread_id ─────────────────────────────────────

/**
 * Busca en Supabase qué cliente tiene asignado un telegram_thread_id específico.
 * Se usa en el webhook de Telegram para saber a quién enviar el reply.
 *
 * @param threadId - message_thread_id del Topic de Telegram
 * @returns Datos del cliente o null si no existe
 */
export async function getClientByThreadId(threadId: number): Promise<any | null> {
  try {
    // Supabase permite filtrar dentro de JSONB con el operador ->
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('metadata->>telegram_thread_id', String(threadId))
      .limit(1)
      .single();

    if (error || !data) {
      console.warn(`[CRM Bridge] No se encontró cliente para thread_id ${threadId}`);
      return null;
    }

    return data;
  } catch (err: any) {
    console.error(`[CRM Bridge] Error buscando cliente por thread_id:`, err.message);
    return null;
  }
}

// ── Export del Bot ID (para filtro anti-loop) ────────────────────────────────

/**
 * Retorna el ID numérico del bot CRM para filtrar sus propios mensajes
 * en el webhook y evitar loops infinitos.
 */
export function getCrmBotId(): number {
  return TG_BOT_ID;
}
