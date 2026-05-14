import { supabase } from './src/config/supabase.js';

async function checkLast10MinutesDetails() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data } = await supabase
        .from('conversations')
        .select('message, created_at, client_id')
        .eq('role', 'bot')
        .gt('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

    if (data) {
        data.forEach(m => {
            console.log(`[${m.created_at}] Client: ${m.client_id} | Msg: ${m.message}`);
        });
    }
}

checkLast10MinutesDetails();
