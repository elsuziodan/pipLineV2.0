/**
 * follow_up.ts
 * ------------
 * Marca como 'no_responde' a leads que no contestaron después de un tiempo.
 * Se ejecuta periódicamente desde main.ts.
 */

import { supabase } from '../config/supabase.js';

/**
 * Busca leads en SENT_GREETING que no respondieron en 48 horas
 * y los marca como 'no_responde' + 'contactado'.
 */
export async function runFollowUpCycle(): Promise<void> {
  console.log('[FollowUp] Iniciando ciclo de seguimiento...');

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Buscar leads en SENT_GREETING cuyo last_bot_update es > 48h
  const { data: staleLeads } = await supabase
    .from('clients')
    .select('id, name, tags, metadata')
    .eq('status', 'contactado')
    .not('tags', 'cs', '{"no_responde"}')
    .not('tags', 'cs', '{"lead"}')
    .not('tags', 'cs', '{"invalido"}')
    .limit(500);

  if (!staleLeads || staleLeads.length === 0) {
    console.log('[FollowUp] No hay leads pendientes de seguimiento.');
    return;
  }

  let marked = 0;

  for (const lead of staleLeads) {
    const botStatus = (lead.metadata as any)?.bot_status;
    const lastUpdate = (lead.metadata as any)?.last_bot_update;

    if (!lastUpdate) continue;
    if (botStatus !== 'SENT_GREETING') continue;

    const updateDate = new Date(lastUpdate);
    if (updateDate.toISOString() > cutoff48h) continue; // Aún no han pasado 48h

    // Marcar como no_responde
    const currentTags: string[] = lead.tags || [];
    const newTags = Array.from(new Set([...currentTags, 'no_responde']));

    await supabase.from('clients').update({ tags: newTags }).eq('id', lead.id);
    marked++;
    console.log(`[FollowUp] ${lead.name} marcado como no_responde (48h sin respuesta)`);
  }

  console.log(`[FollowUp] Ciclo completado. ${marked} leads marcados como no_responde.`);
}
