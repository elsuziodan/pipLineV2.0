import { supabase } from '../src/config/supabase.js';

async function run() {
  // Buscar todos los clientes con SENT_GREETING
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, status, tags, metadata')
    .eq('status', 'prospecto');
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const stuck = data.filter(c => {
      const meta = c.metadata || {};
      return meta.bot_status === 'SENT_GREETING';
  });
  
  console.log(`Total prospectos con SENT_GREETING atorados: ${stuck.length}`);
  
  // Vamos a ver si tienen mensajes de 'user' en su historial
  const { data: convos } = await supabase
    .from('conversations')
    .select('client_id, role');
    
  const userRepliedClientIds = new Set(
      convos.filter(c => c.role === 'user').map(c => c.client_id)
  );
  
  const safeToResend = stuck.filter(c => !userRepliedClientIds.has(c.id));
  
  console.log(`De esos, clientes seguros a reenviar (NO han respondido nunca): ${safeToResend.length}`);
}

run();
