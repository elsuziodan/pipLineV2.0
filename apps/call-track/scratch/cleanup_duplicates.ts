import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function cleanup() {
  console.log('🔍 Buscando mensajes duplicados en la tabla conversations...');
  
  // 1. Obtener todos los mensajes de bot de las últimas 2 horas
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  const { data: messages, error } = await supabase
    .from('conversations')
    .select('id, client_id, message, created_at')
    .eq('role', 'bot')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error obteniendo mensajes:', error.message);
    return;
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No hay mensajes recientes para analizar.');
    return;
  }

  const toDelete: string[] = [];
  const processed = new Map<string, Date>(); // clientId:lastMessageTime

  // 2. Identificar duplicados (mismo cliente, mismo mensaje, < 20s de diferencia)
  for (const msg of messages) {
    const key = `${msg.client_id}-${msg.message}`;
    const lastTime = processed.get(key);
    const currentTime = new Date(msg.created_at);

    if (lastTime && (currentTime.getTime() - lastTime.getTime()) < 20000) {
      // Es un duplicado (enviado menos de 20s después del anterior del mismo tipo)
      toDelete.push(msg.id);
      console.log(`🗑️ Marcado para borrar: Duplicado de ${msg.client_id} (${msg.created_at})`);
    } else {
      processed.set(key, currentTime);
    }
  }

  console.log(`\n📊 Resumen: ${toDelete.length} duplicados encontrados.`);

  if (toDelete.length > 0) {
    // 3. Borrar en bloques de 50 para evitar límites
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      const { error: delError } = await supabase
        .from('conversations')
        .delete()
        .in('id', chunk);
      
      if (delError) {
        console.error('❌ Error borrando bloque:', delError.message);
      } else {
        console.log(`✅ Bloque ${Math.floor(i/50) + 1} borrado.`);
      }
    }
  }

  console.log('\n✨ Limpieza completada.');
}

cleanup();
