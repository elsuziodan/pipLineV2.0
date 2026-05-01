/**
 * logger.ts
 * ---------
 * Logger estructurado con timestamps y módulos.
 * Uso: import { log } from '../utils/logger.js';
 *      log.bot.info('Mensaje enviado');
 *      log.handler.error('Fallo', error);
 */

class Logger {
  constructor(private module: string) {}

  private timestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  info(...args: unknown[]): void {
    console.log(`[${this.timestamp()}] [${this.module}]`, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(`[${this.timestamp()}] [${this.module}] ⚠️`, ...args);
  }

  error(...args: unknown[]): void {
    console.error(`[${this.timestamp()}] [${this.module}] ❌`, ...args);
  }

  debug(...args: unknown[]): void {
    if (process.env.DEBUG === 'true') {
      console.log(`[${this.timestamp()}] [${this.module}] 🐛`, ...args);
    }
  }
}

export const log = {
  bot: new Logger('Bot'),
  handler: new Logger('Handler'),
  meta: new Logger('MetaClient'),
  pipeline: new Logger('Pipeline'),
  queue: new Logger('Queue'),
  sebastian: new Logger('Sebastian'),
  auditor: new Logger('Auditor'),
  loader: new Logger('Loader'),
};
