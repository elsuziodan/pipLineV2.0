/**
 * conversations.ts
 * ─────────────────
 * Helper de Supabase para la tabla `conversations`.
 */

import { supabase } from './supabase.js';

export interface ConversationMessage {
  role:         'bot' | 'user';
  message:      string;
  stage?:       string;
  wa_timestamp?: number;
  media_url?:    string;
  media_type?:   'audio' | 'image';
  created_at?:  string;
}

/**
 * Guarda un mensaje en el historial de conversación.
 */
export async function saveMessage(
  clientId:    string,
  role:        'bot' | 'user',
  message:     string,
  stage:       string,
  waTimestamp?: number,
  mediaUrl?:    string,
  mediaType?:   'audio' | 'image'
): Promise<void> {
  const timestamp = waTimestamp ?? Math.floor(Date.now() / 1000);
  
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

  const { error } = await supabase.from('conversations').insert({
    client_id:    clientId,
    role,
    message,
    stage,
    wa_timestamp: timestamp
  });

  if (error) {
    console.error('[Conversations] Error guardando mensaje:', error.message);
  }

  try {
    const { data: client } = await supabase.from('clients').select('metadata').eq('id', clientId).single();
    const newMetadata = { 
      ...(client?.metadata || {}), 
      last_activity: new Date(timestamp * 1000).toISOString() 
    };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', clientId);
  } catch (e) {}
}

/**
 * Obtiene el historial de conversación de un cliente.
 */
export async function getHistory(
  clientId: string,
  limit = 10,
): Promise<ConversationMessage[]> {
  console.log('[DEBUG] getHistory clientId:', clientId);  let targetClientId = clientId;
  if (!clientId.includes('-')) {
    const cleanPhone = clientId.replace(' ', '+');
    const { data } = await supabase.from('clients').select('id').eq('phone', cleanPhone).single();
    if (data) targetClientId = data.id;
    else return [];
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('role, message, stage, wa_timestamp, created_at')
    .eq('client_id', targetClientId)
    .order('wa_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Conversations] Error leyendo historial:', error.message);
    return [];
  }

  return ((data || []) as ConversationMessage[]).reverse();
}

/**
 * Obtiene el historial de conversación de un cliente con paginación por cursor.
 */
export async function getHistoryPaginated(
  clientId: string,
  limit = 20,
  cursor?: string
): Promise<{ messages: ConversationMessage[]; nextCursor: string | null }> {
  console.log('[DEBUG] getHistory clientId:', clientId);  let targetClientId = clientId;
  if (!clientId.includes('-')) {
    const cleanPhone = clientId.replace(' ', '+');
    const { data } = await supabase.from('clients').select('id').eq('phone', cleanPhone).single();
    if (data) targetClientId = data.id;
    else return { messages: [], nextCursor: null };
  }

  let query = supabase
    .from('conversations')
    .select('id, role, message, stage, wa_timestamp, created_at')
    .eq('client_id', targetClientId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data) {
    console.error('[Conversations] Error en paginación:', error?.message);
    return { messages: [], nextCursor: null };
  }

  const hasMore = data.length > limit;
  const messagesBatch = hasMore ? data.slice(0, limit) : data;
  const messages = [...messagesBatch].reverse();
  const nextCursor = hasMore ? messagesBatch[messagesBatch.length - 1].created_at : null;

  return { messages, nextCursor };
}

/**
 * Obtiene la lista de contactos recientes.
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
