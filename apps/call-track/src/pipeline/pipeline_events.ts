/**
 * pipeline_events.ts
 * ------------------
 * Bus de eventos central del CallTrack Control Tower.
 *
 * TODOS los módulos del pipeline (scraper adapter, bot, orquestador, gates)
 * publican eventos aquí. El servidor WebSocket los escucha y los reenvía
 * al Dashboard en tiempo real.
 *
 * Patrón: EventEmitter singleton — importar `pipelineEvents` directamente.
 *
 * ─── CATÁLOGO DE EVENTOS ────────────────────────────────────────────────────
 *
 * 'pipeline:status'
 *   Payload: PipelineStatusEvent
 *   Emitido por: pipeline_orchestrator al cambiar de estado.
 *
 * 'pipeline:stop'
 *   Payload: PipelineStopEvent
 *   Emitido por: pipeline_orchestrator, ws_server (comando externo del dashboard).
 *
 * 'scraper:progress'
 *   Payload: ScraperProgressEvent
 *   Emitido por: scraper_adapter al recibir un PIPELINE_EVENT del proceso Python.
 *
 * 'scraper:complete'
 *   Payload: ScraperCompleteEvent
 *   Emitido por: scraper_adapter al recibir el evento "complete" del proceso Python.
 *
 * 'loader:progress'
 *   Payload: LoaderProgressEvent
 *   Emitido por: csv_loader durante la carga de leads a Supabase.
 *
 * 'loader:complete'
 *   Payload: LoadReportEvent
 *   Emitido por: csv_loader al terminar la carga.
 *
 * 'bot:message'
 *   Payload: BotMessageEvent
 *   Emitido por: automator.ts (mensajes salientes) y handler.ts (entrantes).
 *
 * 'bot:pause'
 *   Payload: ninguno
 *   Emitido por: ws_server al recibir { type: 'STOP_BOT' } del dashboard.
 *
 * 'bot:resume'
 *   Payload: ninguno
 *   Emitido por: ws_server al recibir { type: 'RESUME_BOT' } del dashboard.
 *
 * 'gate:pending'
 *   Payload: GatePendingEvent
 *   Emitido por: pipeline_orchestrator cuando un gate está esperando decisión.
 *
 * 'gate:decision'
 *   Payload: GateDecisionEvent
 *   Emitido por: pipeline_orchestrator tras recibir la decisión (IA o manual).
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { EventEmitter } from 'events';

// ── Tipos de Payload ──────────────────────────────────────────────────────────

export interface PipelineStatusEvent {
  block: 'IDLE' | 'BLOCK_0' | 'GATE_A' | 'BLOCK_1' | 'GATE_B' | 'BLOCK_2' | 'COMPLETED' | 'STOPPED' | 'ERROR';
  status: 'started' | 'running' | 'waiting_gate' | 'completed' | 'stopped' | 'error';
  message: string;
  timestamp: string;
}

export interface PipelineProgressEvent {
  message: string;
  timestamp?: string;
}

export interface PipelineStopEvent {
  reason: string;
  timestamp: string;
}

export interface ScraperProgressEvent {
  city: string;
  keyword: string;
  found: number;       // leads extraídos hasta ahora en este keyword
  current: number;     // listing actual
  total: number;       // total de listings a procesar en este keyword
  timestamp: string;
}

export interface ScraperCompleteEvent {
  city: string;
  totalLeads: number;
  shortlistPath: string;
  masterPath: string;
  timestamp: string;
}

export interface LoaderProgressEvent {
  processed: number;
  total: number;
  inserted: number;
  duplicates: number;
  blacklisted: number;
  errors: number;
  timestamp: string;
}

export interface LoadReportEvent {
  total: number;
  inserted: number;
  duplicates: number;
  blacklisted: number;
  errors: number;
  timestamp: string;
}

export interface BotMessageEvent {
  direction: 'IN' | 'OUT';   // IN = mensaje del prospecto, OUT = mensaje del bot
  name: string;
  phone: string;
  text: string;
  botStatus?: string;         // estado actual del lead (SENT_GREETING, etc.)
  timestamp: string;
}

export interface GatePendingEvent {
  gate: 'A' | 'B' | 'C';
  auditScore: number;
  auditIssues: string[];
  auditRecommendation: string;
  approved: boolean;           // decisión de la IA (puede ser overrideada manualmente)
  timestamp: string;
}

export interface GateDecisionEvent {
  gate: 'A' | 'B' | 'C';
  approved: boolean;
  source: 'ai' | 'manual' | 'system';    // quién tomó la decisión
  reason: string;
  timestamp: string;
}

// ── Mapa de eventos tipado ───────────────────────────────────────────────────
// Extiende EventEmitter con tipos estrictos para cada evento.
// Esto previene errores de typo en los nombres de eventos y valida los payloads.

export interface PipelineEventMap {
  'pipeline:status':    [PipelineStatusEvent];
  'pipeline:stop':      [PipelineStopEvent];
  'pipeline:progress':  [PipelineProgressEvent];
  'scraper:progress':   [ScraperProgressEvent];
  'scraper:complete':   [ScraperCompleteEvent];
  'loader:progress':    [LoaderProgressEvent];
  'loader:complete':    [LoadReportEvent];
  'bot:message':        [BotMessageEvent];
  'bot:pause':          [];
  'bot:resume':         [];
  'bot:exhausted':      [];
  'gate:pending':       [GatePendingEvent];
  'gate:decision':      [GateDecisionEvent];
}

// TypeScript no permite extender EventEmitter con un mapa de tipos directamente
// sin una clase wrapper o una declaración de overloads. Usamos la clase wrapper
// para mantener el strict mode del tsconfig sin suprimir errores.

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof PipelineEventMap>(
    event: K,
    ...args: PipelineEventMap[K]
  ): boolean {
    return super.emit(event as string, ...args);
  }

  on<K extends keyof PipelineEventMap>(
    event: K,
    listener: (...args: PipelineEventMap[K]) => void
  ): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof PipelineEventMap>(
    event: K,
    listener: (...args: PipelineEventMap[K]) => void
  ): this {
    return super.once(event as string, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof PipelineEventMap>(
    event: K,
    listener: (...args: PipelineEventMap[K]) => void
  ): this {
    return super.off(event as string, listener as (...args: unknown[]) => void);
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
// Una sola instancia compartida por todo el proceso Node.js.
// Importar así: import { pipelineEvents } from '../pipeline/pipeline_events.js';

export const pipelineEvents = new TypedEventEmitter();

// Aumentar el límite de listeners para evitar warnings en producción
// (múltiples módulos suscritos al mismo evento es normal en este sistema).
pipelineEvents.setMaxListeners(25);
