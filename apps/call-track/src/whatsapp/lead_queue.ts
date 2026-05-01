import PQueue from 'p-queue';

interface CircuitBreakerState {
  failures: number;
  open: boolean;
  resetAt: number;
}

interface QueueStats {
  size: number;
  pending: number;
  isCircuitOpen: boolean;
}

interface EnqueueOptions {
  priority?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * LeadQueueManager - Sistema de colas por lead con Circuit Breaker
 * 
 * Cada lead tiene su propia cola FIFO aislada. Si un lead tiene problemas,
 * no afecta a los demás. Incluye rate limiting, circuit breaker y
 * limpieza automática de colas inactivas.
 */
export class LeadQueueManager {
  private queues = new Map<string, PQueue>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private lastActivity = new Map<string, number>();

  // Configuración del rate limiter por lead
  private readonly DEFAULT_OPTIONS = {
    concurrency: 1,          // Un mensaje a la vez por lead
    intervalCap: 6,          // 6 mensajes máximo
    interval: 60000,         // Por minuto (60,000ms)
    autoStart: true,
  };

  // Configuración del Circuit Breaker
  private readonly CB_THRESHOLD = 5;           // Fallos antes de abrir
  private readonly CB_RESET_MS = 60000;        // 60s antes de reintentar
  private readonly CB_HALF_OPEN_MAX = 2;       // Máximos intentos en half-open

  // Configuración de retry
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1s base

  /**
   * Obtiene o crea una cola para un lead específico
   */
  private getQueue(leadId: string): PQueue {
    if (!this.queues.has(leadId)) {
      this.queues.set(leadId, new PQueue(this.DEFAULT_OPTIONS));
    }
    return this.queues.get(leadId)!;
  }

  /**
   * Verifica si el circuit breaker está abierto para un lead
   */
  private isCircuitOpen(leadId: string): boolean {
    const cb = this.circuitBreakers.get(leadId);
    if (!cb) return false;

    // Si ya pasó el tiempo de reset, cerrar el circuito
    if (cb.open && Date.now() > cb.resetAt) {
      console.log(`[CircuitBreaker] Lead ${leadId} - Cerrando circuito, reintentando...`);
      this.circuitBreakers.delete(leadId);
      return false;
    }

    return cb.open;
  }

  /**
   * Registra un fallo y abre el circuito si es necesario
   */
  private recordFailure(leadId: string): void {
    const cb = this.circuitBreakers.get(leadId) || { 
      failures: 0, 
      open: false, 
      resetAt: 0 
    };
    
    cb.failures++;
    
    if (cb.failures >= this.CB_THRESHOLD) {
      cb.open = true;
      cb.resetAt = Date.now() + this.CB_RESET_MS;
      console.warn(`[CircuitBreaker] Lead ${leadId} - Circuito ABIERTO por ${this.CB_RESET_MS / 1000}s tras ${cb.failures} fallos`);
    }
    
    this.circuitBreakers.set(leadId, cb);
  }

  /**
   * Registra éxito y resetea el circuit breaker
   */
  private recordSuccess(leadId: string): void {
    const cb = this.circuitBreakers.get(leadId);
    if (cb) {
      if (cb.failures > 0) {
        console.log(`[CircuitBreaker] Lead ${leadId} - Éxito tras ${cb.failures} fallos, reseteando contador`);
      }
      this.circuitBreakers.delete(leadId);
    }
    this.lastActivity.set(leadId, Date.now());
  }

  /**
   * Calcula delay con backoff exponencial + jitter
   */
  private calculateBackoff(attempt: number, baseDelay: number): number {
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponential; // ±15% jitter
    return Math.min(exponential + jitter, 30000); // Max 30s
  }

  /**
   * Encola una tarea para un lead específico
   * 
   * @param leadId - ID único del lead
   * @param task - Función async a ejecutar
   * @param options - Opciones de encolado
   * @returns Promise con el resultado de la tarea
   */
  async enqueue<T>(
    leadId: string,
    task: () => Promise<T>,
    options: EnqueueOptions = {}
  ): Promise<T | undefined> {
    // Verificar circuit breaker
    if (this.isCircuitOpen(leadId)) {
      const cb = this.circuitBreakers.get(leadId);
      const waitSeconds = Math.ceil((cb!.resetAt - Date.now()) / 1000);
      console.log(`[Queue] Lead ${leadId}: Circuito abierto, ignorando tarea (${waitSeconds}s restantes)`);
      return undefined;
    }

    const queue = this.getQueue(leadId);
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;

    return queue.add(async (): Promise<T | undefined> => {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Intentar ejecutar la tarea
          const taskResult = await Promise.race([
            task(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Task timeout')), 
                options.timeout ?? 30000)
            )
          ]);

          // Éxito: actualizar estado y retornar
          this.recordSuccess(leadId);
          return taskResult;

        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries) {
            const delay = this.calculateBackoff(attempt, baseDelay);
            console.log(`[Retry] Lead ${leadId}: Intento ${attempt + 1}/${maxRetries + 1} falló (${lastError.message}). Reintentando en ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            // Agotados los reintentos
            console.error(`[Retry] Lead ${leadId}: Todos los intentos fallaron (${maxRetries + 1} total)`);
            this.recordFailure(leadId);
            throw lastError;
          }
        }
      }

      throw lastError;
    }, { 
      priority: options.priority,
    }) as Promise<T | undefined>;
  }

  /**
   * Obtiene estadísticas de la cola de un lead
   */
  getQueueStats(leadId: string): QueueStats {
    const queue = this.queues.get(leadId);
    return {
      size: queue?.size ?? 0,
      pending: queue?.pending ?? 0,
      isCircuitOpen: this.isCircuitOpen(leadId),
    };
  }

  /**
   * Obtiene estadísticas globales de todas las colas
   */
  getGlobalStats(): {
    totalQueues: number;
    totalPending: number;
    totalSize: number;
    openCircuits: number;
  } {
    let totalPending = 0;
    let totalSize = 0;
    let openCircuits = 0;

    for (const [leadId, queue] of Array.from(this.queues.entries())) {
      totalPending += queue.pending;
      totalSize += queue.size;
      if (this.isCircuitOpen(leadId)) openCircuits++;
    }

    return {
      totalQueues: this.queues.size,
      totalPending,
      totalSize,
      openCircuits,
    };
  }

  /**
   * Limpia colas inactivas para liberar memoria
   * 
   * @param maxInactiveMs - Tiempo máximo de inactividad (default: 5 minutos)
   * @returns Número de colas eliminadas
   */
  cleanupInactiveQueues(maxInactiveMs: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [leadId, queue] of Array.from(this.queues.entries())) {
      const lastActive = this.lastActivity.get(leadId) ?? 0;
      const isEmpty = queue.size === 0 && queue.pending === 0;
      const isInactive = (now - lastActive) > maxInactiveMs;

      if (isEmpty && isInactive) {
        // Verificar que no haya mensajes esperando
        this.queues.delete(leadId);
        this.circuitBreakers.delete(leadId);
        this.lastActivity.delete(leadId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cleanup] Eliminadas ${cleaned} colas inactivas`);
    }

    return cleaned;
  }

  /**
   * Cierra todas las colas y limpia recursos
   * Usar al detener la aplicación
   */
  async shutdown(): Promise<void> {
    console.log('[LeadQueueManager] Shutdown iniciado...');
    
    // Esperar a que todas las colas terminen
    const queuePromises = Array.from(this.queues.values()).map(q => 
      q.onIdle()
    );
    
    await Promise.allSettled(queuePromises);
    
    // Limpiar todo
    this.queues.clear();
    this.circuitBreakers.clear();
    this.lastActivity.clear();
    
    console.log('[LeadQueueManager] Shutdown completado');
  }
}

// Singleton para toda la aplicación
export const leadQueueManager = new LeadQueueManager();

// Auto-cleanup cada 5 minutos (300,000 ms)
setInterval(() => {
  const stats = leadQueueManager.getGlobalStats();
  console.log(`[QueueStats] Colas: ${stats.totalQueues}, Pendientes: ${stats.totalPending}, Circuitos abiertos: ${stats.openCircuits}`);
  leadQueueManager.cleanupInactiveQueues();
}, 300000);
