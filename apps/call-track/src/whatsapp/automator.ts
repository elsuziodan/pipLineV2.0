import { MetaClient } from './meta_client.js';
import { SCRIPT_VARIANTS, COLLAGE_IMAGE_PATH } from './constants.js';
import { uniquifyMessage, injectBusinessName, normalizeToInternational, HumanLikeDelays } from './utils.js';
import { sendTelegramNotify } from '../services/telegram_notify.js';
import { supabase } from '../config/supabase.js';
import { updateBotStatus } from '../config/database.js';
import { pipelineEvents } from '../pipeline/pipeline_events.js';
import { leadQueueManager } from './lead_queue.js';
import { saveMessage } from '../config/conversations.js';

/**
 * Automator - Gestiona el envío de mensajes y el flujo de conversación
 * 
 * La lógica de colas y rate limiting ahora está en LeadQueueManager.
 * Esta clase se enfoca en:
 * - Gestión de outreach (contacto inicial)
 * - Ejecución de pasos del guion (Step 2, Step 3)
 * - Batch management para evitar saturación
 */
export class Automator {
  private static async getValidChatId(rawPhone: string): Promise<string> {
    return normalizeToInternational(rawPhone).replace('+', '');
  }

  public static async getValidChatIdPublic(rawPhone: string): Promise<string> {
    return this.getValidChatId(rawPhone);
  }

  // -- Outreach State Management --
  private static isOutreachRunning = false;
  private static outreachBatchCount = 0;
  private static readonly OUTREACH_LIMIT = 500;
  private static batchResetTimer: NodeJS.Timeout | null = null;
  private static lastBatchReset = Date.now();

  // -- Cache de imagen --
  private static cachedCollageMediaId: string | null = null;
  private static collageUploadAttempts = 0;
  private static readonly MAX_COLLAGE_RETRIES = 3;

  /**
   * Verifica si hay outreach pendiente
   */
  public static isOutreachPending(): boolean {
    return this.isOutreachRunning;
  }

  /**
   * Resetea el contador de outreach y programa el próximo
   */
  public static resetOutreachCounter(): void {
    this.outreachBatchCount = 0;
    this.lastBatchReset = Date.now();
    console.log('🔄 Contador de outreach reiniciado (0/10).');
    
    // Limpiar timer anterior si existe
    if (this.batchResetTimer) {
      clearTimeout(this.batchResetTimer);
    }
    
    // Auto-reset cada 2 minutos de inactividad
    this.batchResetTimer = setTimeout(() => {
      if (this.outreachBatchCount > 0) {
        console.log(`[Batch] Auto-reset tras 2 min de inactividad`);
        this.resetOutreachCounter();
      }
    }, 120000);
  }

  /**
   * Marca que hay outreach programado (para evitar duplicados)
   * @deprecated Ahora se maneja automáticamente
   */
  public static markOutreachScheduled(): void {
    // No-op: la lógica de outreach ahora se maneja internamente
    console.log('[Automator] markOutreachScheduled() es ahora no-op');
  }

  /**
   * Verifica si un lead está siendo procesado (delegado a LeadQueueManager)
   */
  public static isLeadBusy(clientId: string): boolean {
    const stats = leadQueueManager.getQueueStats(clientId);
    return stats.pending > 0 || stats.size > 0;
  }

  /**
   * Encola una tarea para un lead usando LeadQueueManager
   * 
   * @deprecated Use leadQueueManager.enqueue directamente desde handler.ts
   */
  public static enqueueTask(clientId: string, task: () => Promise<void>): void {
    leadQueueManager.enqueue(clientId, task, {
      maxRetries: 2,
      timeout: 45000,
    }).catch(err => {
      console.error(`[Automator] Error encolando tarea para ${clientId}:`, err);
    });
  }

  /**
   * Intenta reanudar outreach si no hay actividad
   */
  public static resumeQueueIfEmpty(): void {
    const stats = leadQueueManager.getGlobalStats();
    
    if (stats.totalPending === 0 && !this.isOutreachRunning) {
      if (this.outreachBatchCount < Automator.OUTREACH_LIMIT) {
        import('./main.js').then(m => m.triggerAgentLoop?.(true));
      } else {
        console.log(`\n🛑 Límite de lote alcanzado (${this.outreachBatchCount}/${Automator.OUTREACH_LIMIT}). Esperando reset...`);
      }
    }
  }

  /**
   * Verifica si estamos dentro del horario de negocio (Lun-Sáb 8:00-19:00)
   */
  private static isWithinBusinessHours(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0=Domingo
    if (day === 0) return false; // No contactar domingos
    const hour = now.getHours();
    return hour >= 8 && hour < 19;
  }

  /**
   * Inicia el siguiente outreach (contacto inicial a prospecto)
   */
  static async startNext(): Promise<void> {
    if (this.isOutreachRunning) return;
    this.isOutreachRunning = true;

    // No contactar fuera de horario de negocio
    if (!this.isWithinBusinessHours()) {
      console.log('🌙 [Bot] Fuera de horario de negocio (Lun-Sáb 8am-7pm). Outreach pausado.');
      this.isOutreachRunning = false;
      setTimeout(() => {
        import('./main.js').then(m => m.triggerAgentLoop?.(true));
      }, 30 * 60 * 1000); // Reintentar en 30 minutos
      return;
    }

    try {
      // Verificar si necesitamos resetear el batch
      if (Date.now() - this.lastBatchReset > 300000) { // 5 minutos
        this.resetOutreachCounter();
      }

      const prospecto = await this.fetchNextProspect();

      if (!prospecto) {
        console.log('\n🏁 [Bot] Ya no quedan prospectos listos en la base de datos.');
        this.isOutreachRunning = false;
        pipelineEvents.emit('bot:exhausted' as any);
        import('./main.js').then(m => m.triggerAgentLoop?.(false));
        return;
      }

      console.log(`🚀 Contactando prospecto: ${prospecto.name}...`);
      
      const chatId = await this.getValidChatId(prospecto.phone);
      let sent = false;

      if (chatId) {
        try {
          // Usar LeadQueueManager para envío con rate limiting
          await leadQueueManager.enqueue(
            prospecto.id,
            async () => {
              // META REQUIRES TEMPLATES FOR INITIATING CONVERSATIONS
              await MetaClient.sendTemplateMessage(chatId, 'saludo_prospecto', 'es_MX', [
                { type: 'text', parameter_name: 'customer_name', text: prospecto.name }
              ]);
            },
            { priority: 1 } // Outreach tiene baja prioridad vs respuestas
          );
          
          sent = true;

          // Registrar plantilla en historial de conversación
          await saveMessage(
            prospecto.id, 'bot',
            '[plantilla: saludo_prospecto — "hola {nombre}, es este el negocio?"]',
            'SENT_GREETING'
          );

          // Notificar al Dashboard
          pipelineEvents.emit('bot:message', {
            clientId: prospecto.id,
            direction: 'OUT',
            name: prospecto.name,
            phone: chatId,
            text: '[Template: saludo_prospecto]',
            botStatus: 'SENT_GREETING',
            timestamp: new Date().toISOString(),
          });

          await updateBotStatus(prospecto.id, 'SENT_GREETING');
          this.outreachBatchCount++;
          console.log(`📈 Progreso de lote: ${this.outreachBatchCount}/${Automator.OUTREACH_LIMIT}`);
          
        } catch (e: any) {
          if (e.response?.data) {
            console.error(`❌ Error Meta API:`, JSON.stringify(e.response.data, null, 2));
          } else {
            console.error(`❌ Error enviando plantilla a ${prospecto.name}:`, e.message);
          }
        }
      }

      if (sent) {
        await this.updateProspectTags(prospecto, ['test_ahora', 'nuevo']);
      } else {
        await this.markProspectInvalid(prospecto);
      }

    } catch (err) {
      console.error('❌ Error en startNext:', err);
    } finally {
      // Pausa moderada (8 a 15 segundos) para no saturar la API ni crear una avalancha de respuestas
      await new Promise(r => setTimeout(r, HumanLikeDelays.naturalDelay(8000, 15000)));
      
      this.isOutreachRunning = false;
      
      // Auto-encadenar el siguiente prospecto si no hemos llegado al límite masivo
      if (this.outreachBatchCount < Automator.OUTREACH_LIMIT) {
        import('./main.js').then(m => m.triggerAgentLoop?.(true));
      }
    }
  }

  /**
   * Obtiene el siguiente prospecto de la base de datos
   */
  private static async fetchNextProspect(): Promise<any> {
    // Primero buscar leads marcados como 'test_ahora'
    let { data: prospecto } = await supabase
      .from('clients')
      .select('*')
      .contains('tags', ['test_ahora'])
      .limit(1)
      .single();

    if (!prospecto) {
      // Si no hay, buscar prospectos nuevos
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'prospecto')
        .contains('tags', ['nuevo'])
        .limit(1)
        .single();
      prospecto = data;
    }

    return prospecto;
  }

  /**
   * Actualiza tags del prospecto tras envío exitoso
   */
  private static async updateProspectTags(prospecto: any, tagsToRemove: string[]): Promise<void> {
    const currentTags = prospecto.tags || [];
    const newTags = currentTags.filter((t: string) => !tagsToRemove.includes(t));
    
    if (newTags.length !== currentTags.length) {
      await supabase.from('clients').update({ tags: newTags }).eq('id', prospecto.id);
    }
  }

  /**
   * Marca prospecto como inválido tras fallo
   */
  private static async markProspectInvalid(prospecto: any): Promise<void> {
    console.log(`👻 Error: ${prospecto.name}. Marcando como inválido...`);
    const currentTags = prospecto.tags || [];
    const newTags = Array.from(new Set([
      ...currentTags.filter((t: string) => t !== 'nuevo' && t !== 'test_ahora'),
      'invalido'
    ]));
    await supabase.from('clients').update({ status: 'contactado', tags: newTags }).eq('id', prospecto.id);
  }

  /**
   * Ejecuta Step 2: Envío de propuesta (collage + mensajes)
   */
  static async proceedToStep2(prospecto: any): Promise<void> {
    await updateBotStatus(prospecto.id, 'SENT_PROPOSAL');

    try {
      const rawPhone = prospecto.phone.replace(/\D/g, '');
      const chatId = await this.getValidChatId(rawPhone);
      const script = SCRIPT_VARIANTS.STEP_2_PROPOSAL;

      console.log(`📸 Preparando Step 2 para ${prospecto.name}...`);

      // Pausa inicial — simula tiempo de escritura
      await this.delayWithTyping(script.img_caption);

      // Subir collage si no está cacheado
      await this.uploadCollageIfNeeded();

      // Enviar imagen con caption
      const imgCaption = uniquifyMessage(script.img_caption);
      await MetaClient.sendImageByMediaId(chatId, Automator.cachedCollageMediaId!, imgCaption);
      console.log(`✅ Collage enviado con caption`);
      await saveMessage(prospecto.id, 'bot', imgCaption, 'SENT_PROPOSAL');
      pipelineEvents.emit('bot:message', {
        clientId: prospecto.id,
        direction: 'OUT', name: prospecto.name, phone: rawPhone,
        text: imgCaption, botStatus: 'SENT_PROPOSAL',
        timestamp: new Date().toISOString(),
      });

      // Mensaje 1: Presentación
      await this.delayBetweenMessages(1);
      const msg1 = uniquifyMessage(script.msg1);
      await MetaClient.sendTextMessage(chatId, msg1);
      console.log(`✅ Msg1 enviado (presentación)`);
      await saveMessage(prospecto.id, 'bot', msg1, 'SENT_PROPOSAL');
      pipelineEvents.emit('bot:message', {
        clientId: prospecto.id,
        direction: 'OUT', name: prospecto.name, phone: rawPhone,
        text: msg1, botStatus: 'SENT_PROPOSAL',
        timestamp: new Date().toISOString(),
      });

      // Mensaje 2: Propuesta (es el último enviado — el más importante para el contexto)
      await this.delayBetweenMessages(2);
      const msg2 = uniquifyMessage(script.msg2);
      await MetaClient.sendTextMessage(chatId, msg2);
      console.log(`✅ Msg2 enviado (propuesta)`);
      await saveMessage(prospecto.id, 'bot', msg2, 'SENT_PROPOSAL');
      pipelineEvents.emit('bot:message', {
        clientId: prospecto.id,
        direction: 'OUT', name: prospecto.name, phone: rawPhone,
        text: msg2, botStatus: 'SENT_PROPOSAL',
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      console.error(`❌ Error en proceedToStep2 para ${prospecto.name}:`, err);
      // Invalidar caché si falla
      if (Automator.collageUploadAttempts >= Automator.MAX_COLLAGE_RETRIES) {
        Automator.cachedCollageMediaId = null;
        Automator.collageUploadAttempts = 0;
      }
    }
  }

  /**
   * Ejecuta Step 3: Climax (último mensaje antes de handover)
   */
  static async executeStep3(prospecto: any): Promise<void> {
    await updateBotStatus(prospecto.id, 'SENT_CLIMAX');

    try {
      const rawPhone = prospecto.phone.replace(/\D/g, '');
      const chatId = await this.getValidChatId(rawPhone);

      // Pausa antes del climax (más larga, simula reflexión)
      await new Promise(r => setTimeout(r, HumanLikeDelays.memoryPause('complex')));

      const variants = SCRIPT_VARIANTS.STEP_3_CLIMAX;
      const msg = uniquifyMessage(variants[Math.floor(Math.random() * variants.length)]);

      await MetaClient.sendTextMessage(chatId, msg);
      console.log(`[Automator] Step 3 enviado a ${prospecto.name}`);
      await saveMessage(prospecto.id, 'bot', msg, 'SENT_CLIMAX');
      pipelineEvents.emit('bot:message', {
        clientId: prospecto.id,
        direction: 'OUT', name: prospecto.name, phone: rawPhone,
        text: msg, botStatus: 'SENT_CLIMAX',
        timestamp: new Date().toISOString(),
      });

      // Notificar a Telegram (lead caliente)
      try {
        await sendTelegramNotify(
          `<b>lead caliente en climax</b>\n\n${prospecto.name}\n${prospecto.phone}\n\nEsperando respuesta del cliente..`
        );
      } catch (e) { /* notificación no crítica */ }

    } catch (err) {
      console.error(`[Automator] Error en executeStep3 para ${prospecto.name}:`, err);
    }
  }

  /**
   * Envío de mensaje de salida negativa
   */
  static async sendNegativeExit(prospecto: any): Promise<void> {
    await updateBotStatus(prospecto.id, 'REJECTED');
    await supabase.from('clients').update({ status: 'contactado' }).eq('id', prospecto.id);

    try {
      const rawPhone = prospecto.phone.replace(/\D/g, '');
      const chatId = await this.getValidChatId(rawPhone);

      const variants = SCRIPT_VARIANTS.NEGATIVE_RESPONSE;
      const msg = uniquifyMessage(variants[Math.floor(Math.random() * variants.length)]);
      
      await MetaClient.sendTextMessage(chatId, msg);
      console.log(`[Automator] Salida negativa enviada a ${prospecto.name}`);
      
    } catch (err) {
      console.error(`[Automator] Error en sendNegativeExit para ${prospecto.name}:`, err);
    }
  }



  // ============ MÉTODOS PRIVADOS AUXILIARES ============

  /**
   * Sube el collage si no está cacheado
   */
  private static async uploadCollageIfNeeded(): Promise<void> {
    if (!Automator.cachedCollageMediaId && Automator.collageUploadAttempts < Automator.MAX_COLLAGE_RETRIES) {
      console.log(`📤 Subiendo collage a Meta Media API...`);
      Automator.collageUploadAttempts++;
      Automator.cachedCollageMediaId = await MetaClient.uploadImageAsMediaId(COLLAGE_IMAGE_PATH);
      console.log(`✅ Collage cacheado: ${Automator.cachedCollageMediaId}`);
    } else if (Automator.cachedCollageMediaId) {
      console.log(`♻️ Reutilizando media_id: ${Automator.cachedCollageMediaId}`);
    }
  }

  /**
   * Delay basado en tiempo de escritura del texto
   */
  private static async delayWithTyping(text: string): Promise<void> {
    const delay = HumanLikeDelays.typingDelay(text);
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Delay entre mensajes consecutivos (incremental)
   */
  private static async delayBetweenMessages(messageNumber: number): Promise<void> {
    const delay = HumanLikeDelays.messageBatchGap(messageNumber, 2000);
    await new Promise(r => setTimeout(r, delay));
  }
}
