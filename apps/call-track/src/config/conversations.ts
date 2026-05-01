/**
 * conversations.ts
 * ─────────────────
 * Helper de Supabase para la tabla `conversations`.
 *
 * Esta tabla es la memoria real del bot:
 *   - Guarda cada mensaje (bot y usuario) con su timestamp exacto de WhatsApp
 *   - Permite a Sebastian ver el historial completo de cada conversación
 *   - Reemplaza el campo `last_bot_message` en metadata (workaround eliminado)
 */

import { supabase } from './supabase.js';

export interface ConversationMessage {
  role:         'bot' | 'user';
  message:      string;
  stage?:       string;
  wa_timestamp?: number;
  created_at?:  string;
}

/**
 * Guarda un mensaje en el historial de conversación.
 *
 * @param clientId    - UUID del cliente en Supabase
 * @param role        - 'bot' si lo envió Sebastian, 'user' si lo recibió
 * @param message     - Texto del mensaje
 * @param stage       - Estado del bot en ese momento (SENT_GREETING, etc.)
 * @param waTimestamp - Timestamp real de WhatsApp en segundos Unix (opcional;
 *                      si no se provee se usa el tiempo actual)
 */
export async function saveMessage(
  clientId:    string,
  role:        'bot' | 'user',
  message:     string,
  stage:       string,
  waTimestamp?: number,
): Promise<void> {
  const timestamp = waTimestamp ?? Math.floor(Date.now() / 1000);
  
  // Deduplicación: evitar guardar el mismo mensaje del bot dos veces en 5 segundos
  if (role === 'bot') {
    const { data: recent } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('role', 'bot')
      .eq('message', message)
      .gte('wa_timestamp', timestamp - 5)
      .limit(1);

    if (recent && recent.length > 0) {
      console.log('[Conversations] Mensaje duplicado del bot detectado, omitiendo insert.');
      return;
    }
  }

  // 1. Guardar mensaje en conversaciones
  const { error } = await supabase.from('conversations').insert({
    client_id:    clientId,
    role,
    message,
    stage,
    wa_timestamp: timestamp,
  });

  if (error) {
    console.error('[Conversations] Error guardando mensaje:', error.message);
  }

  // 2. Actualizar 'last_activity' en el cliente para el Dashboard
  try {
    const { data: client } = await supabase.from('clients').select('metadata').eq('id', clientId).single();
    const newMetadata = { 
      ...(client?.metadata || {}), 
      last_activity: new Date(timestamp * 1000).toISOString() 
    };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', clientId);
  } catch (e) {
    // Silencioso
  }
}

/**
 * Obtiene el historial de conversación de un cliente.
 *
 * Devuelve los últimos `limit` mensajes en orden cronológico (más viejo primero),
 * para que la IA pueda leer la conversación de forma natural.
 *
 * @param clientId - UUID del cliente
 * @param limit    - Máximo de mensajes (default 10 = ~5 intercambios)
 */
export async function getHistory(
  clientId: string,
  limit = 10,
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('role, message, stage, wa_timestamp, created_at')
    .eq('client_id', clientId)
    .order('wa_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Conversations] Error leyendo historial:', error.message);
    return [];
  }

  // Invertir para que queden en orden cronológico (más viejo primero)
  return ((data || []) as ConversationMessage[]).reverse();
}

/**
 * Obtiene la lista de contactos recientes que tienen historial de bot.
 */
export async function getRecentContacts() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, metadata, status, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[Conversations] Error obteniendo contactos recientes:', error.message);
    return [];
  }

  return data || [];
}
