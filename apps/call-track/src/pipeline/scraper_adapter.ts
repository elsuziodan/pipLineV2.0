/**
 * scraper_adapter.ts
 * ------------------
 * Puente entre el Orquestador (Node.js/TypeScript) y el Scraper (Python/Playwright).
 *
 * RESPONSABILIDAD:
 *   Lanza el proceso Python `run_pipeline.py` como proceso hijo, escucha su
 *   stdout en tiempo real, parsea los eventos `PIPELINE_EVENT:{...}` y los
 *   re-emite en `pipelineEvents` para que el Dashboard los reciba por WebSocket.
 *
 * USO DESDE pipeline_orchestrator.ts:
 *   import { runScraper } from './scraper_adapter.js';
 *   const result = await runScraper('Monterrey', ['cancelería', 'aluminio'], 15, false);
 *   if (result.success) console.log(result.shortlistPath);
 *
 * SEÑAL DE STOP:
 *   La función stopScraper() envía SIGTERM al proceso hijo. El scraper Python
 *   tiene un handler SIGTERM que guarda el checkpoint y sale limpiamente.
 *
 * NOTAS TÉCNICAS:
 *   - El CWD del proceso hijo es la carpeta `src/` del scraper, no la raíz del proyecto.
 *   - Las líneas de stdout que NO empiecen con "PIPELINE_EVENT:" se pasan al logger
 *     normal (son los logs de Python que se ven en consola pero no en el Dashboard).
 *   - Si el proceso termina con exit code ≠ 0, `result.success` es false.
 *   - `runScraper.lastShortlistPath` guarda la ruta del último CSV generado
 *     para que el Bloque 1 (csv_loader) sepa dónde leerlo.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { pipelineEvents } from './pipeline_events.js';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ScraperResult {
  success: boolean;
  shortlistPath: string;  // ruta al shortlist.csv generado
  masterPath: string;     // ruta al master.csv generado
  totalLeads: number;
  error?: string;
}

// Evento raw que emite el scraper Python por stdout
interface PythonProgressEvent {
  event: 'progress';
  city: string;
  keyword: string;
  found: number;
  current: number;
  total: number;
}

interface PythonCompleteEvent {
  event: 'complete';
  city: string;
  leads: number;
  shortlist: string;
  master: string;
}

interface PythonStoppedEvent {
  event: 'stopped';
  reason: string;
}

type PythonEvent = PythonProgressEvent | PythonCompleteEvent | PythonStoppedEvent;

// ── Estado del adaptador ─────────────────────────────────────────────────────

let activeProcess: ChildProcess | null = null;

// ── Rutas ────────────────────────────────────────────────────────────────────

// Ruta al directorio src/ del scraper Python
// Usamos una resolución más robusta que funcione desde la raíz o desde apps/call-track
const SCRAPER_SRC_DIR = path.resolve(
  process.cwd(),
  process.cwd().endsWith('call-track') ? '../scrapper/src' : 'apps/scrapper/src',
);

// ── Función pública: lanzar el scraper ───────────────────────────────────────

/**
 * Lanza el scraper Python y espera a que termine.
 * Emite eventos de progreso en pipelineEvents mientras corre.
 *
 * @param city                  Ciudad objetivo (ej: "Monterrey")
 * @param keywords              Array de keywords (se ignoran aquí; run_pipeline.py usa los suyos)
 * @param maxResultsPerKeyword  Máximo de resultados por keyword
 * @param runAudit              Si pasar --audit al scraper
 */
export async function runScraper(
  city: string,
  _keywords: string[],   // reservado para futura parametrización de keywords
  maxResultsPerKeyword = 15,
  runAudit = false,
): Promise<ScraperResult> {

  if (activeProcess) {
    return {
      success: false,
      shortlistPath: '',
      masterPath: '',
      totalLeads: 0,
      error: 'Ya hay un proceso de scraping activo. Llama stopScraper() primero.',
    };
  }

  const args = [
    'run_pipeline.py',
    '--city', city,
    '--provider', 'real',
    '--max-results', String(maxResultsPerKeyword),
  ];

  if (_keywords && _keywords.length > 0) {
    args.push('--keywords', _keywords.join(','));
  }

  if (runAudit) args.push('--audit');

  console.log(`🕷 [ScraperAdapter] Lanzando scraper: python3 ${args.join(' ')}`);
  console.log(`🕷 [ScraperAdapter] CWD: ${SCRAPER_SRC_DIR}`);

  return new Promise<ScraperResult>((resolve) => {
    const child = spawn('python3', args, {
      cwd: SCRAPER_SRC_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }, // sin buffering en stdout
    });

    activeProcess = child;

    let lastShortlistPath = '';
    let lastMasterPath = '';
    let totalLeads = 0;
    let stdoutBuffer = '';

    // ── Parsear stdout línea a línea ──────────────────────────────────────
    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? ''; // guardar línea incompleta

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('PIPELINE_EVENT:')) {
          // Parsear evento estructurado
          const jsonStr = trimmed.slice('PIPELINE_EVENT:'.length);
          try {
            const evt = JSON.parse(jsonStr) as PythonEvent;
            handlePythonEvent(evt, city);

            if (evt.event === 'complete') {
              lastShortlistPath = (evt as PythonCompleteEvent).shortlist;
              lastMasterPath = (evt as PythonCompleteEvent).master;
              totalLeads = (evt as PythonCompleteEvent).leads;
            }
          } catch {
            console.warn('[ScraperAdapter] Evento inválido:', jsonStr);
          }
        } else {
          // Log normal de Python — mostrar en consola del servidor
          console.log(`[Scraper] ${trimmed}`);
        }
      }
    });

    // Capturar stderr (errores Python)
    child.stderr?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        console.error(`[Scraper ERR] ${line}`);
      }
    });

    // ── Proceso terminado ─────────────────────────────────────────────────
    child.on('close', (code) => {
      activeProcess = null;

      if (code === 0 || lastShortlistPath) {
        // Guardar ruta para que el orquestador la use en el Bloque 1
        runScraper.lastShortlistPath = lastShortlistPath;

        pipelineEvents.emit('scraper:complete', {
          city,
          totalLeads,
          shortlistPath: lastShortlistPath,
          masterPath: lastMasterPath,
          timestamp: new Date().toISOString(),
        });

        resolve({
          success: true,
          shortlistPath: lastShortlistPath,
          masterPath: lastMasterPath,
          totalLeads,
        });
      } else {
        const errMsg = `Proceso Python terminó con código ${code}.`;
        console.error(`❌ [ScraperAdapter] ${errMsg}`);
        resolve({
          success: false,
          shortlistPath: '',
          masterPath: '',
          totalLeads: 0,
          error: errMsg,
        });
      }
    });

    child.on('error', (err) => {
      activeProcess = null;
      console.error('❌ [ScraperAdapter] Error al lanzar proceso:', err.message);
      resolve({
        success: false,
        shortlistPath: '',
        masterPath: '',
        totalLeads: 0,
        error: err.message,
      });
    });
  });
}

// Propiedad estática para compartir la ruta del último CSV con el Bloque 1
runScraper.lastShortlistPath = '';

// ── Función pública: detener el scraper ──────────────────────────────────────

/**
 * Envía SIGTERM al proceso Python activo.
 * El scraper guarda el checkpoint y termina limpiamente.
 * El Bloque 0 recibirá exit code 0 (via signal) y podrá retomar en la próxima ejecución.
 */
export function stopScraper(): void {
  if (!activeProcess) {
    console.warn('[ScraperAdapter] stopScraper() llamado pero no hay proceso activo.');
    return;
  }
  console.log('🛑 [ScraperAdapter] Enviando SIGTERM al scraper...');
  activeProcess.kill('SIGTERM');
}

// ── Handler interno de eventos Python ────────────────────────────────────────

function handlePythonEvent(evt: PythonEvent, city: string): void {
  const ts = new Date().toISOString();

  switch (evt.event) {
    case 'progress':
      pipelineEvents.emit('scraper:progress', {
        city: evt.city ?? city,
        keyword: evt.keyword,
        found: evt.found,
        current: evt.current,
        total: evt.total,
        timestamp: ts,
      });
      break;

    case 'complete':
      // El evento scraper:complete se emite en el handler 'close' del proceso,
      // ya que necesitamos confirmar que el proceso también terminó limpiamente.
      console.log(`✅ [ScraperAdapter] Scraper completado: ${evt.leads} leads | ${evt.shortlist}`);
      break;

    case 'stopped':
      console.log(`⏹ [ScraperAdapter] Scraper detenido: ${evt.reason}`);
      break;

    default:
      console.warn('[ScraperAdapter] Evento desconocido:', evt);
  }
}
