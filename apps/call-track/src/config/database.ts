import { supabase } from './supabase';

export type PipelineStatus = 'prospecto' | 'contactado' | 'negociacion' | 'cerrado' | 'perdido' | 'deployed';
export type TagType = 'vip' | 'interesado' | 'no_responde' | 'nuevo' | 'recontactar' | 'outbound' | 'lead' | 'pendiente' | 'invalido';

export const PIPELINE_STAGES: { key: PipelineStatus; label: string; color: string }[] = [
  { key: 'prospecto', label: 'Prospecto', color: '#3b82f6' },
  { key: 'contactado', label: 'Contactado', color: '#f59e0b' },
  { key: 'negociacion', label: 'Negociación', color: '#8b5cf6' },
  { key: 'cerrado', label: 'Cerrado', color: '#10b981' },
  { key: 'perdido', label: 'Perdido', color: '#ef4444' },
];

export const TAG_OPTIONS: { key: TagType; label: string; color: string; emoji: string }[] = [
  { key: 'vip', label: 'VIP', color: '#10b981', emoji: '🟢' },
  { key: 'interesado', label: 'Interesado', color: '#f59e0b', emoji: '🟡' },
  { key: 'no_responde', label: 'No responde', color: '#ef4444', emoji: '🔴' },
  { key: 'nuevo', label: 'Nuevo', color: '#3b82f6', emoji: '🔵' },
  { key: 'recontactar', label: 'Recontactar', color: '#8b5cf6', emoji: '🟣' },
  { key: 'outbound', label: 'Outbound', color: '#6366f1', emoji: '🚀' },
  { key: 'lead', label: 'Lead Captado', color: '#10b981', emoji: '⭐' },
  { key: 'pendiente', label: 'Pendiente Manual', color: '#f59e0b', emoji: '⏳' },
  { key: 'invalido', label: 'Sin WhatsApp', color: '#6b7280', emoji: '👻' },
];

export type BotStatus = 
  | 'IDLE' 
  | 'SENT_GREETING' 
  | 'SENT_PROPOSAL' 
  | 'SENT_CLIMAX' 
  | 'HANDOVER_QUESTION' 
  | 'HANDOVER_CLIMAX' 
  | 'REJECTED'
  | 'HANDOVER_MANUAL'
  | 'prospecto';

export type Client = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  status?: PipelineStatus;
  tags?: TagType[];
  follow_up_date?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

/**
 * Actualizar cliente
 */
export const updateClient = async (id: string, data: Partial<Client>) => {
  const { error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id);

  if (error) throw error;
};

/**
 * Obtener un cliente por su número de teléfono.
 *
 * Usa la función PostgreSQL `get_lead_by_phone` que aplica regexp_replace('[^0-9]')
 * sobre el campo `phone` almacenado Y sobre el número entrante, antes de comparar.
 * Esto la hace completamente inmune al formato — guiones, espacios, paréntesis,
 * código de país con o sin '1' para México — cualquier formato funciona.
 *
 * SQL de la función (ya creada en Supabase):
 *   regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || right(regexp_replace(p_phone, ...), 10)
 */
export const getLeadByPhone = async (phone: string) => {
  const { data, error } = await supabase
    .rpc('get_lead_by_phone', { p_phone: phone });

  if (error) {
    console.error('❌ [getLeadByPhone] Error en RPC:', error.message);
    return null;
  }

  // rpc() con RETURNS SETOF devuelve un array; tomamos el primer resultado
  const results = data as Client[] | null;
  return (results && results.length > 0) ? results[0] : null;
};

/**
 * Actualizar el estado del bot en el embudo de ventas.
 * El historial completo de mensajes se guarda en la tabla `conversations`.
 */
export const updateBotStatus = async (clientId: string, status: BotStatus) => {
  const { data: client } = await supabase
    .from('clients')
    .select('metadata')
    .eq('id', clientId)
    .single();

  const currentMetadata = (client?.metadata as Record<string, unknown>) || {};

  await updateClient(clientId, {
    metadata: {
      ...currentMetadata,
      bot_status: status,
      last_bot_update: new Date().toISOString(),
    }
  });
};

/**
 * Suscripción en Tiempo Real para Supabase
 */
export const subscribeClients = (callback: (clients: Client[]) => void) => {
  supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data as Client[]);
    });

  const channelId = `clients_changes_${Math.random().toString(36).slice(2, 11)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients' },
      () => {
        supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) callback(data as Client[]);
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Importación Masiva
 */
export const importClientsSupabase = async (
  clients: Omit<Client, 'id' | 'created_at'>[],
  onProgress?: (index: number, total: number, log?: string) => void
) => {
  const BATCH_SIZE = 50;
  const total = clients.length;
  
  if (onProgress) onProgress(0, total, `Iniciando importación masiva de ${total} registros...`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = clients.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('clients')
      .insert(chunk.map(c => ({
        name: String(c.name || 'Sin nombre').trim(),
        phone: String(c.phone || '').trim(),
        address: String(c.address || '').trim(),
        status: c.status || 'prospecto',
        tags: c.tags || ['nuevo'],
        metadata: c.metadata || {}
      })));

    if (error) {
      console.error('Error en chunk de Supabase:', error);
      if (onProgress) onProgress(i, total, `❌ Error en lote: ${error.message}`);
      throw error;
    }

    const current = Math.min(i + BATCH_SIZE, total);
    if (onProgress) onProgress(current, total, `✅ Procesados ${current}/${total} contactos...`);
  }

  if (onProgress) onProgress(total, total, "✅ ¡Importación completada con éxito!");
};

/**
 * Guardar un solo cliente
 */
export const addClient = async (client: Omit<Client, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('clients')
    .insert([client])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export type Call = {
  id: string;
  client_id: string;
  notes: string;
  type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

/**
 * Suscripción de Llamadas en Tiempo Real
 */
export const subscribeCalls = (callback: (calls: Call[]) => void) => {
  supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data as Call[]);
    });

  const channelId = `calls_changes_${Math.random().toString(36).slice(2, 11)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calls' },
      () => {
        supabase
          .from('calls')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) callback(data as Call[]);
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Obtener llamadas de la última semana
 */
export const getCallsThisWeek = async () => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .gte('created_at', lastWeek.toISOString());

  if (error) return [];
  return data as Call[];
};

/**
 * Obtener llamadas
 */
export const getCalls = async (clientId?: string) => {
  let query = supabase.from('calls').select('*').order('created_at', { ascending: false });
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  const { data, error } = await query;
  if (error) return [];
  return data as Call[];
};

/**
 * Guardar una interacción
 */
export const addCall = async (call: Omit<Call, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('calls')
    .insert([call])
    .select()
    .single();

  if (error) throw error;
  return data;
};
