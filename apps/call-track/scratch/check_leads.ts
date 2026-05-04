
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    const { data: leads, error } = await supabase
        .from('clients')
        .select('name, status, metadata')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log('--- ESTADO DE LOS ÚLTIMOS 50 LEADS ---');
    leads?.forEach(l => {
        const botStatus = l.metadata?.bot_status || 'N/A';
        const source = l.metadata?.source || 'N/A';
        const loadedAt = l.metadata?.loaded_at || 'N/A';
        const tags = l.tags || [];
        console.log(`- ${l.name} | Source: ${source} | Loaded: ${loadedAt} | Bot: ${botStatus} | Tags: ${tags.join(',')}`);
    });
}

checkLeads();
