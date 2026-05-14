import { supabase } from '../src/config/supabase.js';

async function run() {
  console.log("Iniciando recuperación de leads bloqueados por Meta...");

  // 1. Obtener todos los clientes en "prospecto"
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, tags, metadata')
    .eq('status', 'prospecto');
    
  if (error) {
    console.error("Error obteniendo clientes:", error);
    return;
  }
  
  // 2. Filtrar los que se quedaron en SENT_GREETING
  const stuck = clients.filter(c => c.metadata?.bot_status === 'SENT_GREETING');
  console.log(`Encontrados ${stuck.length} prospectos en SENT_GREETING.`);
  
  // 3. Obtener el historial para asegurar que no tocamos a nadie que sí haya interactuado
  const { data: convos } = await supabase
    .from('conversations')
    .select('client_id, role');
    
  const userRepliedClientIds = new Set(
      (convos || []).filter(c => c.role === 'user').map(c => c.client_id)
  );
  
  const safeToResend = stuck.filter(c => !userRepliedClientIds.has(c.id));
  console.log(`Clientes SEGUROS para reenviar (0 respuestas del cliente): ${safeToResend.length}`);

  // 4. Actualizar la base de datos para reencolar
  let count = 0;
  for (const client of safeToResend) {
    // Restaurar tag 'nuevo'
    const currentTags = client.tags || [];
    const newTags = Array.from(new Set([...currentTags, 'nuevo']));
    
    // Quitar el bot_status para que el bot lo vea fresco
    const newMeta = { ...client.metadata };
    delete newMeta.bot_status;
    delete newMeta.last_bot_update;
    
    // Borramos el historial del bot para que no haya duplicados en la UI
    await supabase
        .from('conversations')
        .delete()
        .eq('client_id', client.id)
        .eq('role', 'bot');
        
    // Actualizar cliente
    await supabase
        .from('clients')
        .update({
            tags: newTags,
            metadata: newMeta
        })
        .eq('id', client.id);
        
    count++;
    if (count % 50 === 0) console.log(`Procesados ${count}/${safeToResend.length}...`);
  }
  
  console.log(`\n¡Listo! ${count} leads han sido reseteados exitosamente.`);
  console.log("El bot (Automator) los irá recogiendo automáticamente en sus siguientes ciclos.");
}

run();
