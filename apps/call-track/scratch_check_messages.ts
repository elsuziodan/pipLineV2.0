import { supabase } from './src/config/supabase.js';

async function checkRecentMessages() {
    console.log('🔍 Revisando mensajes recientes (última hora)...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // 1. Mensajes recibidos (user)
    const { data: incoming, error: inError } = await supabase
        .from('conversations')
        .select('*')
        .eq('role', 'user')
        .gt('created_at', oneHourAgo);

    if (inError) {
        console.error('❌ Error al buscar mensajes entrantes:', inError);
    } else {
        console.log(`📥 Mensajes RECIBIDOS (user) en la última hora: ${incoming?.length || 0}`);
        incoming?.forEach(m => {
            console.log(`   - [${m.created_at}] De Cliente: ${m.client_id} | Texto: ${m.message}`);
        });
    }

    // 2. Mensajes enviados (bot)
    const { data: outgoing, error: outError } = await supabase
        .from('conversations')
        .select('*')
        .eq('role', 'bot')
        .gt('created_at', oneHourAgo);

    if (outError) {
        console.error('❌ Error al buscar mensajes salientes:', outError);
    } else {
        console.log(`📤 Mensajes ENVIADOS (bot) en la última hora: ${outgoing?.length || 0}`);
        outgoing?.forEach(m => {
            // console.log(`   - [${m.created_at}] A Cliente: ${m.client_id} | Texto: ${m.message}`);
        });
    }
}

checkRecentMessages();
