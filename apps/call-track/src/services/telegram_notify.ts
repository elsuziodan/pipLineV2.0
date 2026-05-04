import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Escapa caracteres especiales de HTML para Telegram
 */
const escapeHTML = (text: string) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

export const sendTelegramNotify = async (message: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (e) {
        console.error('❌ Error enviando Telegram');
    }
};

/**
 * Notificación interactiva con botones de acción rápida.
 * Los botones envían callback_query que se procesan en el webhook.
 */
export const sendHandoverNotify = async (
  prospectName: string, 
  phone: string, 
  lastMessage: string, 
  reason: 'QUESTION' | 'CLIMAX' | 'MULTIMEDIA',
  clientId?: string
) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const emoji = reason === 'CLIMAX' ? '🚀' : '❓';
    const title = reason === 'CLIMAX' ? '¡LEAD CALIENTE!' : 'ATENCIÓN REQUERIDA';
    
    const safeName = escapeHTML(prospectName);
    const safeMsg = escapeHTML(lastMessage.substring(0, 100));
    
    const message = `
<b>${emoji} ${title} ${emoji}</b>

👤 <b>Cliente:</b> ${safeName}
📱 <b>Tel:</b> ${phone}
💬 <b>Msg:</b> <i>"${safeMsg}"</i>

⚠️ <b>Razón:</b> ${reason === 'CLIMAX' ? 'Aceptó propuesta.' : 'Pregunta / desvío del guion / multimedia.'}`.trim();

    // Botones de acción rápida (InlineKeyboard)
    const inline_keyboard = [];
    
    if (clientId) {
        if (reason === 'CLIMAX') {
            inline_keyboard.push([
                { text: '✅ Aprobar → Fábrica', callback_data: `approve:${clientId}` },
                { text: '❌ Descartar', callback_data: `discard:${clientId}` },
            ]);
        }
        inline_keyboard.push([
            { text: '⏸️ Pausar Bot', callback_data: `pause:${clientId}` },
            { text: '▶️ Reactivar Bot', callback_data: `resume:${clientId}` },
        ]);
    }

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_markup: inline_keyboard.length > 0 ? { inline_keyboard } : undefined,
        });
    } catch (e) {
        console.error('❌ Error enviando Telegram con botones');
    }
};

/**
 * Notificación para cuando el bot está apagado para un prospecto
 */
export const sendBotOffNotify = async (
  prospectName: string, 
  phone: string, 
  lastMessage: string, 
  currentStatus: string
) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const safeName = escapeHTML(prospectName);
    const safeMsg = escapeHTML(lastMessage);
    
    const message = `
<b>📴 MENSAJE RECIBIDO (BOT APAGADO)</b>

👤 <b>Cliente:</b> ${safeName}
📱 <b>Tel:</b> ${phone}
💬 <b>Msg:</b> <i>"${safeMsg}"</i>
🕒 <b>Estado Actual:</b> <code>${currentStatus || 'N/A'}</code>

El bot no respondió automáticamente porque ya no está escuchando a este prospecto.
`.trim();

    await sendTelegramNotify(message);
};
