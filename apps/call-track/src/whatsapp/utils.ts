/**
 * Sanitiza un mensaje antes de enviarlo:
 *   - Elimina emojis (capa de seguridad para no romper la apariencia humana)
 *   - Fuerza minusculas (regla de estilo del agente)
 * Se aplica automaticamente dentro de uniquifyMessage.
 */
export function sanitizeMessage(text: string): string {
  // Regex amplio que cubre todos los rangos Unicode de emojis
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  return text.replace(emojiRegex, '').toLowerCase().trim();
}

/**
 * Añade variabilidad organica para evadir filtros de bot (Anti-Bot Meta)
 * y aplica el sanitizador de estilo al final.
 */
export function uniquifyMessage(text: string): string {
  let modText = text;

  // 1. Donde haya puntos, variamos aleatoriamente entre 1, 2 o 3 puntos
  modText = modText.replace(/\.\.\.+/g, () => {
    const r = Math.random();
    if (r < 0.33) return '.';
    if (r < 0.66) return '..';
    return '...';
  });

  // 2. Espacio extra aleatorio despues de la primera o segunda palabra
  if (Math.random() > 0.5) {
    modText = modText.replace(/^(\S+)\s/, '$1  ');
  }

  // 3. Zero-width space al final un 50% de las veces
  if (Math.random() > 0.5) {
    modText += '\u200B';
  }

  // 4. Sanitizar: sin emojis.. todo minusculas
  return sanitizeMessage(modText);
}

/**
 * Genera un retraso aleatorio entre un rango de milisegundos
 */
export const getRandomDelay = (minMs: number, maxMs: number) => {
  return Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
};

/**
 * Inyecta el nombre del negocio en el placeholder [business]
 */
export function injectBusinessName(text: string, businessName: string): string {
  return text.replace(/\[business\]/gi, businessName);
}

/**
 * Normaliza un número de teléfono a formato internacional (prioridad México)
 * 1. Elimina espacios, guiones, paréntesis.
 * 2. Si tiene 10 dígitos, asume que es México y antepone '52'.
 */
export function normalizeToInternational(phone: string): string {
  // Limpiar caracteres no numéricos
  const clean = phone.replace(/\D/g, '');
  
  // Si tiene 10 dígitos (formato estándar México sin código país)
  if (clean.length === 10) {
    return '52' + clean;
  }
  
  return clean;
}

/**
 * HumanLikeDelays - Genera delays realistas que simulan comportamiento humano
 * 
 * Usa distribución log-normal (más natural que uniforme) para evitar
 * patrones detectables por heurísticas anti-bot de Meta WhatsApp.
 */
export class HumanLikeDelays {
  // Velocidad de escritura: 40-55 palabras por minuto (humano promedio)
  private static readonly BASE_WPM = 42;
  private static readonly WPM_VARIANCE = 12;

  /**
   * Calcula delay basado en tiempo de escritura de un texto
   * Más realista que delays fijos porque depende de la longitud
   */
  static typingDelay(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Tiempo base: palabras / WPM * 60 segundos * 1000ms
    const baseWpm = this.BASE_WPM + (Math.random() * this.WPM_VARIANCE * 2 - this.WPM_VARIANCE);
    const baseTime = (words / baseWpm) * 60 * 1000;
    
    // Agregar overhead por puntuación (humano se detiene en comas, puntos, etc)
    const punctuationDelay = (text.match(/[,.;:]/g) || []).length * 300;
    
    // Jitter final: ±20%
    const jitter = baseTime * 0.2 * (Math.random() * 2 - 1);
    
    return Math.max(800, Math.floor(baseTime + punctuationDelay + jitter));
  }

  /**
   * Genera delay con distribución log-normal (más humana que uniforme)
   * 
   * La distribución log-normal crea clusters naturales con colas largas,
   * imitando cómo los humanos realmente pausan (la mayoría corto, algunos largo)
   */
  static naturalDelay(min = 2000, max = 6000): number {
    // Box-Muller transform para normal
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Convertir a log-normal
    const mu = Math.log((min + max) / 2);
    const sigma = 0.5;
    const logNormal = Math.exp(mu + sigma * z);
    
    // Normalizar al rango deseado
    const normalized = (logNormal - Math.exp(mu - sigma)) / (Math.exp(mu + sigma) - Math.exp(mu - sigma));
    const result = min + normalized * (max - min);
    
    return Math.floor(Math.max(min, Math.min(max, result)));
  }

  /**
   * Delay entre pasos de una conversación
   * Urgencia afecta la velocidad de respuesta
   */
  static conversationPause(urgency: 'relaxed' | 'normal' | 'urgent' = 'normal'): number {
    const base = {
      relaxed: { min: 6000, max: 12000 },   // 6-12s (relajado)
      normal: { min: 3500, max: 7000 },     // 3.5-7s (normal)
      urgent: { min: 2000, max: 4000 },     // 2-4s (urgente)
    };
    
    return this.naturalDelay(base[urgency].min, base[urgency].max);
  }

  /**
   * Delay entre mensajes consecutivos (evitar rate limit)
   * Gap aumenta con la cantidad de mensajes enviados recientemente
   */
  static messageBatchGap(messageCount: number, baseGap = 2500): number {
    // Gap aumenta exponencialmente con cada mensaje adicional reciente
    const exponentialFactor = Math.pow(1.2, Math.min(messageCount, 5));
    const gap = baseGap * exponentialFactor;
    
    // Añadir jitter ±25%
    const jitter = gap * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(gap + jitter);
  }

  /**
   * Delay para "memoria humana" - después de una acción importante
   * Simula el tiempo de pensar/recordar
   */
  static memoryPause(complexity: 'simple' | 'moderate' | 'complex' = 'moderate'): number {
    const delays = {
      simple: { min: 1500, max: 3000 },      // Recordar nombre
      moderate: { min: 3000, max: 5500 },    // Revisar datos
      complex: { min: 5000, max: 9000 },     // Pensar decisión
    };
    
    return this.naturalDelay(delays[complexity].min, delays[complexity].max);
  }
}
