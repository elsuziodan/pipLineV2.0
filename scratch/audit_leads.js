
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log("--- AUDITORÍA DE LEADS ---");
    
    const { data: allClients, error } = await supabase
        .from('clients')
        .select('id, name, phone, status, is_board_suggested, metadata')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching clients:", error);
        return;
    }

    console.log(`Total clientes encontrados: ${allClients.length}`);
    
    const fabrica = allClients.filter(c => c.status === 'FABRICA');
    console.log(`En FABRICA: ${fabrica.length}`);
    fabrica.forEach(c => console.log(` - ${c.name} (${c.phone})`));

    const suggested = allClients.filter(c => c.is_board_suggested === true && c.status === 'prospecto');
    console.log(`\nSugeridos (en prospecto): ${suggested.length}`);
    suggested.forEach(c => console.log(` - ${c.name} (${c.phone}) | BotStatus: ${c.metadata?.bot_status}`));

    const potentialMissed = allClients.filter(c => 
        c.status === 'prospecto' && 
        (c.metadata?.bot_status === 'HANDOVER_CLIMAX' || c.metadata?.bot_status === 'INTERVENTION_REQUIRED')
    );
    console.log(`\nPotenciales que deberían estar en FABRICA (Status prospecto pero BotStatus crítico): ${potentialMissed.length}`);
    potentialMissed.forEach(c => console.log(` - ${c.name} (${c.phone}) | BotStatus: ${c.metadata?.bot_status}`));
}

checkLeads();
