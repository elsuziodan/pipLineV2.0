import { supabase } from './src/config/supabase.js';

async function checkLeadsStatus() {
    const { data, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('metadata->>bot_status', 'SENT_GREETING');

    console.log(`📊 Leads en status 'SENT_GREETING': ${count || 0}`);
}

checkLeadsStatus();
