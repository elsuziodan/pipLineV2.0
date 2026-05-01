/**
 * metrics.ts
 * ----------
 * Calcula métricas de conversión del pipeline de ventas.
 * Consulta Supabase para generar el funnel completo.
 */

import { supabase } from '../config/supabase.js';

export interface ConversionMetrics {
  total_prospected: number;
  total_responded: number;
  total_advanced_proposal: number;
  total_climax: number;
  total_leads: number;
  total_rejected: number;
  total_invalid: number;
  total_no_response: number;
  response_rate: number;
  conversion_rate: number;
}

export async function getConversionMetrics(): Promise<ConversionMetrics> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, status, tags, metadata');

  if (!clients) {
    return {
      total_prospected: 0, total_responded: 0, total_advanced_proposal: 0,
      total_climax: 0, total_leads: 0, total_rejected: 0,
      total_invalid: 0, total_no_response: 0,
      response_rate: 0, conversion_rate: 0,
    };
  }

  const metrics: ConversionMetrics = {
    total_prospected: 0,
    total_responded: 0,
    total_advanced_proposal: 0,
    total_climax: 0,
    total_leads: 0,
    total_rejected: 0,
    total_invalid: 0,
    total_no_response: 0,
    response_rate: 0,
    conversion_rate: 0,
  };

  for (const client of clients) {
    const botStatus = (client.metadata as any)?.bot_status;
    const tags: string[] = client.tags || [];

    // Solo contar los que ya fueron contactados (no prospectos frescos)
    if (client.status !== 'prospecto') {
      metrics.total_prospected++;
    }

    if (tags.includes('invalido')) {
      metrics.total_invalid++;
      continue;
    }

    if (tags.includes('no_responde')) {
      metrics.total_no_response++;
      continue;
    }

    // Respondieron = llegaron al menos a SENT_PROPOSAL (confirmaron el saludo)
    const advancedStatuses = ['SENT_PROPOSAL', 'SENT_CLIMAX', 'HANDOVER_CLIMAX', 'HANDOVER_QUESTION', 'REJECTED'];
    if (advancedStatuses.includes(botStatus)) {
      metrics.total_responded++;
    }

    if (['SENT_PROPOSAL', 'SENT_CLIMAX', 'HANDOVER_CLIMAX', 'HANDOVER_QUESTION'].includes(botStatus)) {
      metrics.total_advanced_proposal++;
    }

    if (['SENT_CLIMAX', 'HANDOVER_CLIMAX'].includes(botStatus)) {
      metrics.total_climax++;
    }

    if (tags.includes('lead') || botStatus === 'HANDOVER_CLIMAX' || client.status === 'FINAL_REPLY') {
      metrics.total_leads++;
    }

    if (botStatus === 'REJECTED') {
      metrics.total_rejected++;
    }
  }

  // Calcular tasas (evitar división por cero)
  if (metrics.total_prospected > 0) {
    metrics.response_rate = Math.round((metrics.total_responded / metrics.total_prospected) * 100);
    metrics.conversion_rate = Math.round((metrics.total_leads / metrics.total_prospected) * 100);
  }

  return metrics;
}
