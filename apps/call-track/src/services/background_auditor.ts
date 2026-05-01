
import { supabase } from '../config/supabase.js';
import { sendTelegramNotify } from './telegram_notify.js';

async function runAudit() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔍 Iniciando ciclo de auditoría...`);
    
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .neq('status', 'FINAL_REPLY');

    if (!clients) return;

    for (const client of clients) {
        try {
            const botStatus = (client.metadata as any)?.bot_status;
            
            const { data: messages } = await supabase
                .from('conversations')
                .select('*')
                .eq('client_id', client.id)
                .order('wa_timestamp', { ascending: true });

            if (!messages || messages.length === 0) continue;

            const userMsgs = messages.filter(m => m.role === 'user');
            if (userMsgs.length === 0) continue;

            const lastUserMsg = userMsgs[userMsgs.length - 1];
            const lastMsg = messages[messages.length - 1];

            // 1. BOT CALLADO (Respondió y no hay eco del bot en > 5 min)
            if (botStatus === 'SENT_GREETING' && lastMsg.role === 'user') {
                const timeSinceLastMsg = (Date.now() / 1000) - lastMsg.wa_timestamp;
                if (timeSinceLastMsg > 300) { 
                    await sendTelegramNotify(`⚠️ <b>BOT CALLADO</b>\n👤 ${client.name}\n💬 "${lastUserMsg.message}"\n<i>Lleva +5 min sin respuesta.</i>`);
                }
            }

            // 2. HANDOVER SOSPECHOSO
            if (botStatus === 'HANDOVER_QUESTION') {
                const isFriendly = ['hola', 'buenas', 'diga', 'buen', 'que tal', 'si', 'ok'].some(kw => lastUserMsg.message.toLowerCase().includes(kw));
                if (isFriendly && lastUserMsg.message.length < 30) {
                    // Solo notificar si no se ha notificado ya (podemos usar tags para esto)
                    if (!client.tags?.includes('audit_flagged')) {
                        await sendTelegramNotify(`🚨 <b>HANDOVER SOSPECHOSO</b>\n👤 ${client.name}\n💬 "${lastUserMsg.message}"\n<i>Parece una confirmación pero el bot escaló.</i>`);
                        await supabase.from('clients').update({ tags: [...(client.tags || []), 'audit_flagged'] }).eq('id', client.id);
                    }
                }
            }

            // 3. RECHAZO SOSPECHOSO — bot rechazó pero el último mensaje del cliente era positivo
            if (botStatus === 'REJECTED') {
                const positiveKeywords = ['si', 'sí', 'claro', 'me interesa', 'sale', 'va', 'ok', 'cuando', 'cuanto', 'cuánto', 'precio', 'dale', 'bueno'];
                const msgText = lastUserMsg.message.toLowerCase();
                const looksPositive = positiveKeywords.some(kw => msgText.includes(kw));

                if (looksPositive && !client.tags?.includes('audit_flagged')) {
                    await sendTelegramNotify(
                        `🚨 <b>RECHAZO SOSPECHOSO</b>\n👤 ${client.name}\n💬 "${lastUserMsg.message}"\n<i>El bot rechazó pero el mensaje parece positivo. Revisar manualmente.</i>`
                    );
                    await supabase
                        .from('clients')
                        .update({ tags: [...(client.tags || []), 'audit_flagged'] })
                        .eq('id', client.id);
                }
            }
        } catch (err) {
            console.error(`[Auditor] Error procesando ${client.name}:`, err);
        }
    }
}

export function startBackgroundAuditor(intervalMs = 5 * 60 * 1000): NodeJS.Timeout {
    console.log(`--- CENTINELA DE AUDITORÍA ACTIVADO (Cada ${intervalMs / 60000} min) ---`);
    runAudit().catch(e => console.error('[Auditor] Error en ciclo inicial:', e));
    return setInterval(() => {
        runAudit().catch(e => console.error('[Auditor] Error en ciclo periódico:', e));
    }, intervalMs);
}
