/**
 * pipeline_orchestrator.ts
 * ------------------------
 * Orquestador Central del CallTrack Control Tower.
 */

import {
  pipelineEvents,
  type GateDecisionEvent,
  type PipelineStatusEvent,
} from './pipeline_events.js';

// ── Tipos ────────────────────────────────────────────────────────────────────

type PipelineState =
  | 'IDLE'
  | 'BLOCK_0_RUNNING'
  | 'GATE_A'
  | 'BLOCK_1_RUNNING'
  | 'GATE_B'
  | 'BLOCK_2_RUNNING'
  | 'COMPLETED'
  | 'STOPPED'
  | 'ERROR';

interface PipelineConfig {
  city: string;
  keywords: string[];
  maxResultsPerKeyword?: number;
  runAudit?: boolean;
}

// ── Clase Orquestador ────────────────────────────────────────────────────────

class PipelineOrchestrator {
  private state: PipelineState = 'IDLE';
  private config: PipelineConfig | null = null;

  // Resolver activo de un Gate en espera.
  private gateResolver: ((approved: boolean) => void) | null = null;

  // ── Getters públicos ──────────────────────────────────────────────────────

  public getState(): PipelineState {
    return this.state;
  }

  public isRunning(): boolean {
    return !['IDLE', 'COMPLETED', 'STOPPED', 'ERROR'].includes(this.state);
  }

  // ── Cambio de estado ──────────────────────────────────────────────────────

  private setState(
    newState: PipelineState,
    message: string,
  ): void {
    this.state = newState;

    const block = newState as PipelineStatusEvent['block'];
    const statusMap: Record<PipelineState, PipelineStatusEvent['status']> = {
      IDLE: 'stopped',
      BLOCK_0_RUNNING: 'running',
      GATE_A: 'waiting_gate',
      BLOCK_1_RUNNING: 'running',
      GATE_B: 'waiting_gate',
      BLOCK_2_RUNNING: 'running',
      COMPLETED: 'completed',
      STOPPED: 'stopped',
      ERROR: 'error',
    };

    pipelineEvents.emit('pipeline:status', {
      block,
      status: statusMap[newState],
      message,
      timestamp: new Date().toISOString(),
    });

    console.log(`🎛️ [Orquestador] Estado → ${newState}: ${message}`);
  }

  // ── Control externo ───────────────────────────────────────────────────────

  public stopAll(reason = 'Detenido externamente.'): void {
    if (!this.isRunning()) return;
    console.log(`🛑 [Orquestador] STOP ALL: ${reason}`);
    this.setState('STOPPED', reason);

    if (this.gateResolver) {
      this.gateResolver(false);
      this.gateResolver = null;
    }

    pipelineEvents.emit('pipeline:stop', {
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  public stopBot(): void {
    console.log('⏸ [Orquestador] Pausando bot...');
    pipelineEvents.emit('bot:pause');
  }

  public resumeBot(): void {
    console.log('▶️ [Orquestador] Reanudando bot...');
    pipelineEvents.emit('bot:resume');
  }

  // ── Entry point ───────────────────────────────────────────────────────────

  public async startPipeline(
    city: string,
    keywords: string[],
    maxResultsPerKeyword = 15,
    runAudit = false,
  ): Promise<void> {
    if (this.isRunning()) {
      console.warn('⚠️ [Orquestador] Ya hay un pipeline en ejecución. Ignorando startPipeline.');
      return;
    }

    this.config = { city, keywords, maxResultsPerKeyword, runAudit };

    const stopListener = (data: { reason: string }) => {
      this.stopAll(data.reason);
    };
    pipelineEvents.once('pipeline:stop', stopListener);

    const gateListener = (data: GateDecisionEvent) => {
      if (this.gateResolver) {
        console.log(`🚦 [Orquestador] Gate ${data.gate} resuelto via ${data.source}: approved=${data.approved}`);
        this.gateResolver(data.approved);
        this.gateResolver = null;
      }
    };
    pipelineEvents.on('gate:decision', gateListener);

    try {
      await this.runBlock0();
      if ((this.state as PipelineState) === 'STOPPED' || (this.state as PipelineState) === 'ERROR') return;

      await this.runBlock1();
      if ((this.state as PipelineState) === 'STOPPED' || (this.state as PipelineState) === 'ERROR') return;

      await this.runBlock2();
      if ((this.state as PipelineState) === 'STOPPED' || (this.state as PipelineState) === 'ERROR') return;

      this.setState('COMPLETED', 'Pipeline completado exitosamente. 🎉');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('❌ [Orquestador] Error fatal:', msg);
      this.setState('ERROR', `Error fatal: ${msg}`);

    } finally {
      pipelineEvents.off('pipeline:stop', stopListener);
      pipelineEvents.off('gate:decision', gateListener);
      this.gateResolver = null;
      this.config = null;
    }
  }

  // ── BLOQUE 0: Scraper ─────────────────────────────────────────────────────

  private async runBlock0(): Promise<void> {
    if (!this.config) return;
    const { city, keywords, maxResultsPerKeyword = 15, runAudit = false } = this.config;

    this.setState('BLOCK_0_RUNNING', `Iniciando scraper para "${city}"...`);

    const { runScraper } = await import('./scraper_adapter.js');
    const scraperResult = await runScraper(city, keywords, maxResultsPerKeyword, runAudit);

    if ((this.state as PipelineState) === 'STOPPED') return;

    if (!scraperResult.success) {
      this.setState('ERROR', `Scraper falló: ${scraperResult.error}`);
      return;
    }

    // ── Gate A ──────────────────────────────────────────────────────────────
    let approved = false;
    let auditResult = { score: 0, issues: [], recommendation: '', approved: false };

    if (runAudit) {
      this.setState('GATE_A', 'Scraper completado. Iniciando auditoría de calidad (Gate A)...');
      const { auditGateA } = await import('./ai_supervisor.js');
      auditResult = await auditGateA(scraperResult.shortlistPath);

      if ((this.state as PipelineState) === 'STOPPED') return;

      pipelineEvents.emit('gate:pending', {
        gate: 'A',
        auditScore: auditResult.score,
        auditIssues: auditResult.issues,
        auditRecommendation: auditResult.recommendation,
        approved: auditResult.approved,
        timestamp: new Date().toISOString(),
      });

      approved = auditResult.approved;
      const AUTO_APPROVE_THRESHOLD = 75;

      if (auditResult.score >= AUTO_APPROVE_THRESHOLD) {
        console.log(`✅ [Gate A] Auto-aprobado (Score: ${auditResult.score}). Procediendo automáticamente.`);
        approved = true;
      } else if (!approved) {
        console.log('⚠️ [Gate A] IA rechazó o score bajo. Esperando 30s para override manual del Dashboard...');
        approved = await this.waitForGateOverride('A', 30_000);
      }
    } else {
      console.log('⏩ [Orquestador] Auditoría IA desactivada. Aprobando automáticamente (Skip Gate A).');
      approved = true;
    }

    if (!approved) {
      this.setState('STOPPED', `Gate A rechazado (score=${auditResult.score}). Pipeline detenido.`);
      return;
    }

    pipelineEvents.emit('gate:decision', {
      gate: 'A',
      approved: true,
      source: runAudit ? (auditResult.score >= 75 ? 'ai' : 'manual') : 'system',
      reason: runAudit ? `Aprobado con score ${auditResult.score}` : 'Auditoría saltada',
      timestamp: new Date().toISOString(),
    });
  }

  // ── BLOQUE 1: Carga de CSV a Supabase ─────────────────────────────────────

  private async runBlock1(): Promise<void> {
    this.setState('BLOCK_1_RUNNING', 'Cargando leads a Supabase...');

    const { runScraper } = await import('./scraper_adapter.js');
    const shortlistPath = runScraper.lastShortlistPath; 

    if (!shortlistPath) {
      this.setState('ERROR', 'No se encontró la ruta del shortlist CSV del Bloque 0.');
      return;
    }

    const { loadCSVToSupabase } = await import('./csv_loader.js');
    const loadReport = await loadCSVToSupabase(shortlistPath);

    if ((this.state as PipelineState) === 'STOPPED') return;

    pipelineEvents.emit('loader:complete', {
      total: loadReport.total,
      inserted: loadReport.inserted,
      duplicates: loadReport.duplicates,
      blacklisted: loadReport.blacklisted,
      errors: loadReport.errors,
      timestamp: new Date().toISOString(),
    });

    // ── Gate B ──────────────────────────────────────────────────────────────
    this.setState('GATE_B', 'Carga completada. Auditando calidad de datos cargados (Gate B)...');

    const { auditGateB } = await import('./ai_supervisor.js');
    const auditResult = await auditGateB(loadReport);

    if ((this.state as PipelineState) === 'STOPPED') return;

    pipelineEvents.emit('gate:pending', {
      gate: 'B',
      auditScore: auditResult.score,
      auditIssues: auditResult.issues,
      auditRecommendation: auditResult.recommendation,
      approved: auditResult.approved,
      timestamp: new Date().toISOString(),
    });

    let approved = auditResult.approved;
    const AUTO_APPROVE_THRESHOLD = 75;

    if (auditResult.score >= AUTO_APPROVE_THRESHOLD) {
      console.log(`✅ [Gate B] Auto-aprobado (Score: ${auditResult.score}). Procediendo automáticamente.`);
      approved = true;
      pipelineEvents.emit('gate:decision', {
        gate: 'B',
        approved: true,
        source: 'ai',
        reason: `Auto-aprobado por score alto (${auditResult.score})`,
        timestamp: new Date().toISOString(),
      });
    } else if (!approved) {
      console.log('⚠️ [Gate B] IA rechazó. Esperando 30s para override manual...');
      approved = await this.waitForGateOverride('B', 30_000);
    } else {
      pipelineEvents.emit('gate:decision', {
        gate: 'B',
        approved: true,
        source: 'ai',
        reason: auditResult.recommendation,
        timestamp: new Date().toISOString(),
      });
    }

    if (!approved) {
      this.setState('STOPPED', `Gate B rechazó la carga (score=${auditResult.score}). Pipeline detenido.`);
      return;
    }
  }

  // ── BLOQUE 2: Bot de WhatsApp ─────────────────────────────────────────────

  private async runBlock2(): Promise<void> {
    this.setState('BLOCK_2_RUNNING', 'Iniciando bot de WhatsApp...');
    pipelineEvents.emit('bot:resume');

    console.log('🤖 [Bloque 2] Bot iniciado. Esperando que el Automator termine de procesar leads...');

    await new Promise<void>((resolve) => {
      const onStop = () => resolve();
      const onComplete = () => resolve();
      pipelineEvents.once('pipeline:stop', onStop);
      pipelineEvents.once('bot:exhausted', onComplete);
    });
  }

  // ── Helper: Esperar override manual ───────────────────────────────────────

  private waitForGateOverride(gate: 'A' | 'B' | 'C', timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.gateResolver = resolve;
      setTimeout(() => {
        if (this.gateResolver === resolve) {
          console.log(`⏰ [Gate ${gate}] Timeout de override (${timeoutMs / 1000}s). Rechazando.`);
          this.gateResolver = null;
          resolve(false);
        }
      }, timeoutMs);
    });
  }
}

export const orchestrator = new PipelineOrchestrator();
