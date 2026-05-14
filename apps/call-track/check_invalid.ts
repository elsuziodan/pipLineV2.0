import { supabase } from './src/config/supabase.js';

async function checkInvalidProspects() {
    const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .contains('tags', ['invalido']);

    console.log(`👻 Prospectos marcados como 'invalido' hoy: ${count || 0}`);
}

checkInvalidProspects();
