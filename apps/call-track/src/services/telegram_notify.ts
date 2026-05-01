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
 * Notificación enriquecida para pasar la estafeta a un humano
 */
export const sendHandoverNotify = async (
  prospectName: string, 
  phone: string, 
  lastMessage: string, 
  reason: 'QUESTION' | 'CLIMAX' | 'MULTIMEDIA'
) => {
    const emoji = reason === 'CLIMAX' ? '🚀' : '❓';
    const title = reason === 'CLIMAX' ? '¡VENTA CALIENTE!' : 'ATENCIÓN REQUERIDA';
    
    // Limpieza agresiva de teléfono para wa.me
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Escapar contenido dinámico para evitar errores de parseo HTML
    const safeName = escapeHTML(prospectName);
    const safeMsg = escapeHTML(lastMessage);
    
    const message = `
<b>${emoji} ${title} ${emoji}</b>

👤 <b>Cliente:</b> ${safeName}
📱 <b>Tel:</b> ${phone}
💬 <b>Msg:</b> <i>"${safeMsg}"</i>

⚠️ <b>Razón:</b> ${reason === 'CLIMAX' ? 'Llegó al final del guion con interés.' : 'Hizo una pregunta o se desvió del guion.'}
`.trim();

    await sendTelegramNotify(message);
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
