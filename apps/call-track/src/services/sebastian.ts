/**
 * sebastian.ts
 * ─────────────
 * Agente conversacional de Sebastian para CallTrack Pro.
 *
 * Sebastian ahora actúa EXCLUSIVAMENTE como un EVALUADOR para avanzar
 * a través de un guion de mensajes preestablecidos. NO tiene permitido platicar.
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';
import { ConversationMessage } from '../config/conversations.js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ── Cliente de IA ────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/danielclatzagemini/calltrack',
    'X-Title': 'CallTrack Sebastian Agent',
  },
});

const MODELS = [
  process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7',
  'google/gemini-2.5-flash',
];

// ── Tipos de decisión ────────────────────────────────────────────────────────

export type SebastianDecision =
  | { action: 'RESPOND' }
  | { action: 'ADVANCE_PROPOSAL' }
  | { action: 'ADVANCE_CLIMAX' }
  | { action: 'CLIMAX_ACCEPT' }
  | { action: 'HANDOVER' }
  | { action: 'EXIT' };

// ── Constructor del System Prompt ────────────────────────────────────────────

function buildSystemPrompt(stage: string, history: ConversationMessage[], clientName?: string, clientAddress?: string): string {
  const historyText = history.length > 0
    ? history.map(m =>
        m.role === 'bot'
          ? `[sebastian]: ${m.message}`
          : `[cliente]: ${m.message}`
      ).join('\n')
    : '(conversación nueva — no hay historial previo)';

  const stageInstructions: Record<string, string> = {
    SENT_GREETING: `
SITUACIÓN: Le enviaste una plantilla de saludo al cliente preguntando si es el negocio.
El cliente acaba de responder (a veces envía varios mensajes seguidos).

CONTEXTO CULTURAL MEXICANO (CRÍTICO — lee esto antes de decidir):
En México por WhatsApp.. las siguientes respuestas son CONFIRMACIONES IMPLÍCITAS.. NO son preguntas reales:
- "en que puedo ayudarle?" / "que se le ofrece?" = el cliente CONFIRMA y quiere saber qué ofreces
- "quien habla?" / "quien es?" / "de donde hablan?" = el cliente CONFIRMA y quiere identificarte
- "mande" / "diga" / "digame" / "si?" = confirmación coloquial mexicana (= "te escucho")
- "de que se trata?" / "que ofrecen?" = curiosidad positiva.. quiere escuchar tu propuesta
- "buenas" / "buen dia" / "hola" = saludo positivo
- "si" / "correcto" / "asi es" / "soy yo" = confirmación directa

ESTAS respuestas SÍ son rechazos o problemas reales:
- "no me interesa" / "no gracias" / "ya tengo pagina" = rechazo → EXIT
- "numero equivocado" / "no soy" / "ya no existe el negocio" = no es el contacto → EXIT
- "cuanto cuesta?" / "que incluye?" / preguntas sobre precio o detalles técnicos = duda real → HANDOVER

TU TRABAJO COMO EVALUADOR:
- Si el cliente CONFIRMA DIRECTAMENTE ("sí".. "correcto".. "así es") → decide ADVANCE_PROPOSAL
- Si el cliente responde con una CONFIRMACIÓN IMPLÍCITA (pregunta de cortesía mexicana como "en qué le ayudo?".. "quién habla?".. "mande") → decide RESPOND
- Si el cliente RECHAZA o dice que no es el número → decide EXIT
- Si el cliente hace una PREGUNTA TÉCNICA ESPECÍFICA (precio.. tiempo.. detalles) → decide HANDOVER
`,
    SENT_PROPOSAL: `
SITUACIÓN: Le enviaste la propuesta visual (collage) y explicaste el intercambio de diseño gratis por reseña.
El cliente está evaluando la propuesta.

CONTEXTO CULTURAL MEXICANO:
- "a ver" / "como seria?" / "me interesa pero.." / "suena bien" = INTERÉS POSITIVO → avanzar
- "va" / "dale" / "orale" / "si" / "me interesa" = aceptación directa → avanzar
- "cuanto cuesta?" / "que incluye?" / "en cuanto tiempo?" = pregunta técnica → HANDOVER
- "lo voy a pensar" / "ahorita no" = rechazo educado → EXIT

TU TRABAJO COMO EVALUADOR:
- Si el cliente muestra CUALQUIER señal de interés o aceptación → decide ADVANCE_CLIMAX obligatoriamente.
- Si el cliente tiene dudas técnicas reales (precios.. tiempos.. entregables) → decide HANDOVER.
- Si el cliente rechaza o pide tiempo → decide EXIT.
`,
    SENT_CLIMAX: `
SITUACIÓN: Le ofreciste la llamada de 5 minutos para explicar los detalles.
El cliente decide si acepta hablar con Daniel (el jefe).

CONTEXTO CULTURAL MEXICANO:
- "si" / "va" / "dale" / "cuando me marcas?" / "mañana" / "luego" / "ahorita puedo" = ACEPTA llamada
- "a que hora?" / "que dia?" = está coordinando la llamada = ACEPTA
- "mandame info por aqui" / "mejor por mensaje" = no quiere llamada = EXIT educado
- "cuanto cuesta?" / duda técnica antes de aceptar = HANDOVER

TU TRABAJO COMO EVALUADOR:
- Si el cliente acepta la llamada.. da horario.. o muestra disposición → decide CLIMAX_ACCEPT.
- Si el cliente hace una pregunta técnica real antes de decidir → decide HANDOVER.
- Si el cliente rechaza o prefiere no hablar por teléfono → decide EXIT.
`,
  };

  const stageContext = stageInstructions[stage] || `ETAPA: ${stage} (evalúa e identifica interés)`;

  return `Eres Sebastian, el asistente de un estudio de diseño web. Tu única función es EVALUAR los mensajes de los clientes para decidir cuándo enviar el siguiente paso del guion preestablecido.

REGLAS DE EVALUACIÓN (CRÍTICAS):
1. No tienes permitido platicar ni responder dudas directamente.
2. Si el cliente pregunta algo, tiene dudas o se sale del guion → decide HANDOVER.
3. Si el cliente confirma interés o saluda positivamente → AVANZA de etapa.
4. Si el cliente rechaza → decide EXIT.
5. Tu respuesta debe ser exclusivamente la acción técnica a tomar.

TU PROPUESTA:
- Diseño de página web 100% GRATIS a cambio de una reseña en Facebook.
- Daniel (tu jefe) hace la llamada para explicar los detalles.

${stageContext}

HISTORIAL DE LA CONVERSACIÓN:
${historyText}

FORMATO DE RESPUESTA (JSON ÚNICAMENTE — elige UNA sola acción):
{"action": "RESPOND"} — respuesta puente antes de avanzar (confirmación implícita)
{"action": "ADVANCE_PROPOSAL"} — avanzar directo a propuesta (confirmación explícita)
{"action": "ADVANCE_CLIMAX"} — avanzar a oferta de llamada
{"action": "CLIMAX_ACCEPT"} — cliente aceptó llamada
{"action": "HANDOVER"} — duda técnica real que no puedes resolver
{"action": "EXIT"} — cliente rechazó o no es el contacto

INFO DEL NEGOCIO: ${clientName || 'desconocido'}${clientAddress ? ` — ubicado en ${clientAddress}` : ''}`;
}

// ── Parseo de respuesta ──────────────────────────────────────────────────────

function parseDecision(raw: string, clientName: string): SebastianDecision {
  let text = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(text);
    const action = (parsed.action || '').toUpperCase();

    switch (action) {
      case 'RESPOND':          return { action: 'RESPOND' };
      case 'ADVANCE_PROPOSAL': return { action: 'ADVANCE_PROPOSAL' };
      case 'ADVANCE_CLIMAX':   return { action: 'ADVANCE_CLIMAX' };
      case 'CLIMAX_ACCEPT':    return { action: 'CLIMAX_ACCEPT' };
      case 'HANDOVER':         return { action: 'HANDOVER' };
      case 'EXIT':             return { action: 'EXIT' };
    }
  } catch {
    const upperRaw = raw.toUpperCase();
    if (upperRaw.includes('RESPOND'))          return { action: 'RESPOND' };
    if (upperRaw.includes('ADVANCE_PROPOSAL')) return { action: 'ADVANCE_PROPOSAL' };
    if (upperRaw.includes('ADVANCE_CLIMAX'))   return { action: 'ADVANCE_CLIMAX' };
    if (upperRaw.includes('CLIMAX_ACCEPT'))    return { action: 'CLIMAX_ACCEPT' };
    if (upperRaw.includes('HANDOVER'))         return { action: 'HANDOVER' };
    if (upperRaw.includes('EXIT'))             return { action: 'EXIT' };
  }

  console.warn(`[Sebastian] No se pudo parsear la decisión para ${clientName}. Aplicando HANDOVER por seguridad.`);
  return { action: 'HANDOVER' };
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function getSebastianDecision(
  clientMessage: string,
  stage:         string,
  clientName:    string,
  history:       ConversationMessage[],
  clientAddress?: string,
): Promise<SebastianDecision> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[Sebastian] OPENROUTER_API_KEY no configurada.');
    return { action: 'HANDOVER' };
  }

  console.log(`🧠 [Sebastian] Consultando IA para ${clientName} (etapa: ${stage})...`);

  try {
    const systemPrompt = buildSystemPrompt(stage, history, clientName, clientAddress);
    let content = '';
    let usedModel = '';

    for (const model of MODELS) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Último mensaje del cliente: "${clientMessage}"\n\nDecide qué hace Sebastian ahora.` },
          ],
          temperature: 0.1, // Más bajo para mayor consistencia
          max_tokens: 1500,
        });

        const msgObj = response.choices[0]?.message as any;
        content = (msgObj?.content || msgObj?.reasoning || '').trim();
        usedModel = model;

        if (content) break;
      } catch (modelErr: any) {
        console.warn(`⚠️ [Sebastian] Modelo ${model} falló: ${modelErr.message}`);
        if (model === MODELS[MODELS.length - 1]) throw modelErr;
        continue;
      }
    }

    console.log(`🤖 [Sebastian] Respuesta de ${usedModel}: ${content.substring(0, 120)}`);
    const decision = parseDecision(content, clientName);

    // Audit log: registrar decisión para análisis de falsos positivos
    console.log(`📊 [Sebastian AUDIT] ${clientName} | msg: "${clientMessage.substring(0, 60)}" | stage: ${stage} | decision: ${decision.action} | model: ${usedModel}`);

    return decision;

  } catch (err: any) {
    console.error(`❌ [Sebastian] Error en IA para ${clientName}:`, err.status, err.message);
    return { action: 'HANDOVER' };
  }
}
