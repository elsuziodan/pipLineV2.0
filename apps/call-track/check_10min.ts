import { supabase } from './src/config/supabase.js';

async function checkLast10Minutes() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('role', 'bot')
        .gt('created_at', tenMinutesAgo);

    console.log(`📊 Mensajes enviados (bot) en los últimos 10 min: ${count || 0}`);
}

checkLast10Minutes();
