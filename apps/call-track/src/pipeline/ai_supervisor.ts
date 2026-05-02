/**
 * ai_supervisor.ts
 * ----------------
 * Supervisor de IA del CallTrack Control Tower.
 *
 * Usa Kimi K2.5 (via Nvidia NIM) para auditar los resultados de cada bloque
 * antes de autorizar el avance al siguiente. Es el árbitro de calidad del pipeline.
 *
 * GATES IMPLEMENTADOS:
 *   - auditGateA(shortlistCsvPath): Revisa la calidad de los leads scrapeados.
 *   - auditGateB(loadReport):       Revisa la integridad de la carga a Supabase.
 *
 * CRITERIOS DE APROBACIÓN:
 *   - Score ≥ 60 → approved: true
 *   - Score < 60 → approved: false (el orquestador espera override manual 60s)
 *
 * NOTAS TÉCNICAS:
 *   - Reutiliza las variables de entorno NVIDIA_API_KEY y NVIDIA_MODEL_NAME.
 *   - No importa ai-service.ts directamente (ese módulo tiene efectos secundarios
 *     de cola de promesas para el bot). El supervisor tiene su propio cliente
 *     OpenAI sin cola, ya que los gates se ejecutan en serie y uno a la vez.
 *   - Las llamadas al Gate usan temperature=0 para máxima consistencia.
 *   - Si la API falla, el supervisor devuelve approved=false por seguridad
 *     (fail-safe: ante la duda, no avanzar).
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/call-track', '.env.local') });

// ── Cliente de IA (EXCLUSIVAMENTE OpenRouter con MiniMax 2.7) ───────────────
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const model = "minimax/minimax-m2.7";
const baseURL = 'https://openrouter.ai/api/v1';

const openai = new OpenAI({
  apiKey: openrouterApiKey,
  baseURL: baseURL,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/danielclatzagemini/calltrack",
    "X-Title": "CallTrack Supervisor",
  },
});

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface AuditResult {
  approved: boolean;
  score: number;         // 0–100
  issues: string[];      // Lista de problemas encontrados
  recommendation: string; // Resumen en español para el Dashboard
}

export interface LoadReport {
  total: number;
  inserted: number;
  duplicates: number;
  blacklisted: number;
  errors: number;
}

// ── Helper: llamada a la IA ───────────────────────────────────────────────────

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  if (!openrouterApiKey || openrouterApiKey === 'your_api_key_here') {
    throw new Error('OPENROUTER_API_KEY no configurada. No se puede usar MiniMax 2.7.');
  }

  console.log(`🤖 [Supervisor] Invocando MiniMax 2.7 en OpenRouter...`);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0,
    max_tokens: 500,
  });

  const msg = response.choices[0]?.message as { content?: string; reasoning?: string };
  return (msg?.content ?? msg?.reasoning ?? '').trim();
}

// ── Parseo de respuesta JSON ─────────────────────────────────────────────────

function parseAuditResponse(raw: string, gate: string): AuditResult {
  // Limpiar posibles bloques de código markdown
  const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  try {
    let jsonStr = cleaned;
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr) as {
      score?: number;
      issues?: string[];
      recommendation?: string;
    };
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 0;
    return {
      approved: score >= 60,
      score,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: typeof parsed.recommendation === 'string'
        ? parsed.recommendation
        : `Gate ${gate}: sin recomendación disponible.`,
    };
  } catch {
    console.error(`❌ [Supervisor] No se pudo parsear la respuesta del Gate ${gate}:`, raw);
    return {
      approved: false,
      score: 0,
      issues: ['Error al parsear la respuesta de la IA.'],
      recommendation: `Gate ${gate} falló por error de parseo. Revisar manualmente.`,
    };
  }
}

// ── GATE A: Auditoría de calidad del scraper ─────────────────────────────────

const GATE_A_SYSTEM = `Eres un auditor de calidad de datos para un pipeline de prospección B2B en México.
Recibirás una muestra de leads scrapeados de Google Maps para talleres mecánicos, hojalatería y pintura, y servicios automotrices.

Tu tarea es evaluar la calidad de los datos y devolver ÚNICAMENTE un JSON con este formato exacto (sin texto adicional):
{
  "score": <número entre 0 y 100>,
  "issues": ["problema 1", "problema 2", ...],
  "recommendation": "<resumen en español de 1-2 oraciones>"
}

CRITERIOS DE EVALUACIÓN (cada uno suma o resta puntos):
- Nombre de negocio real y relacionado con el nicho automotriz (+15 por lead bueno, -10 por basura)
- Teléfono presente en formato mexicano válido (10 dígitos, o con +52) (+10 por lead)
- Dirección presente y parece una ciudad mexicana real (+5 por lead)
- Categoría de Google Maps relacionada con el nicho (taller mecánico, reparación de automóviles, etc.) (+5)
- Penalizaciones: nombre genérico ("Taller", números solos), teléfono ausente, ciudad incorrecta

Score 0-59: RECHAZAR. Score 60-100: APROBAR.`;

/**
 * Audita la calidad de los leads scrapeados.
 */
export async function auditGateA(shortlistCsvPath: string): Promise<AuditResult> {
  console.log('🤖 [Supervisor] Iniciando Gate A...');

  if (!fs.existsSync(shortlistCsvPath)) {
    console.error(`❌ [Gate A] CSV no encontrado en: ${shortlistCsvPath}`);
    return {
      approved: false,
      score: 0,
      issues: [`Archivo CSV no encontrado: ${shortlistCsvPath}`],
      recommendation: 'El scraper no generó el archivo shortlist. Revisar manualmente.',
    };
  }

  const csvContent = fs.readFileSync(shortlistCsvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');

  if (lines.length < 2) {
    return {
      approved: false,
      score: 0,
      issues: ['El CSV está vacío o solo tiene encabezados.'],
      recommendation: 'El scraper no encontró leads. Verificar keywords y conexión a internet.',
    };
  }

  const sampleLines = [lines[0], ...lines.slice(1, 11)].join('\n');
  const totalLeads = lines.length - 1;

  const userContent = `Total de leads scrapeados: ${totalLeads}\nMuestra de leads (CSV):\n${sampleLines}\n\nPor favor evalúa la calidad de esta muestra y devuelve el JSON de auditoría.`;

  try {
    const raw = await callAI(GATE_A_SYSTEM, userContent);
    const result = parseAuditResponse(raw, 'A');
    console.log(`🤖 [Gate A] Score: ${result.score}/100 | Aprobado: ${result.approved}`);
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Gate A] Error llamando a la IA:`, msg);
    return {
      approved: false,
      score: 0,
      issues: [`Error de API: ${msg}`],
      recommendation: 'No se pudo contactar al supervisor de IA. Aprobar manualmente si los datos se ven correctos.',
    };
  }
}

// ── GATE B: Auditoría de la carga a Supabase ─────────────────────────────────

const GATE_B_SYSTEM = `Eres un auditor de integridad de datos para un pipeline de prospección B2B.
Recibirás un reporte de carga de leads a una base de datos Supabase.

Tu tarea es evaluar si la carga fue exitosa y los datos tienen integridad.
Devuelve ÚNICAMENTE un JSON con este formato exacto (sin texto adicional):
{
  "score": <número entre 0 y 100>,
  "issues": ["problema 1", "problema 2", ...],
  "recommendation": "<resumen en español de 1-2 oraciones>"
}

CRITERIOS DE EVALUACIÓN:
- Tasa de inserción exitosa (inserted/total): peso 50 puntos
- Tasa de errores (errors/total): penalización
- Duplicados altos no son problema (significa que el scraper ya tenía esos leads)
- Blacklisted altos son normales si hay historial previo

Score 0-59: RECHAZAR. Score 60-100: APROBAR.`;

/**
 * Audita el reporte de carga de leads a Supabase.
 */
export async function auditGateB(report: LoadReport): Promise<AuditResult> {
  console.log('🤖 [Supervisor] Iniciando Gate B...');

  const userContent = `Reporte de carga a Supabase:
- Total de leads en CSV: ${report.total}
- Insertados exitosamente: ${report.inserted}
- Duplicados rechazados: ${report.duplicates}
- En blacklist (rechazados): ${report.blacklisted}
- Errores de inserción: ${report.errors}
- Tasa de éxito: ${report.total > 0 ? Math.round((report.inserted / report.total) * 100) : 0}%

Por favor evalúa la integridad de esta carga y devuelve el JSON de auditoría.`;

  try {
    const raw = await callAI(GATE_B_SYSTEM, userContent);
    const result = parseAuditResponse(raw, 'B');
    console.log(`🤖 [Gate B] Score: ${result.score}/100 | Aprobado: ${result.approved}`);
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Gate B] Error llamando a la IA:`, msg);
    return {
      approved: false,
      score: 0,
      issues: [`Error de API: ${msg}`],
      recommendation: 'No se pudo contactar al supervisor de IA. Aprobar manualmente si la carga se ve correcta.',
    };
  }
}
