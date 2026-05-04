import { startServer } from './server.js';
import { Automator } from './automator.js';
import { pipelineEvents } from '../pipeline/pipeline_events.js';
import { startWsServer } from '../pipeline/ws_server.js';
import { leadQueueManager } from './lead_queue.js';
import { runFollowUpCycle } from '../services/follow_up.js';
import { startBackgroundAuditor } from '../services/background_auditor.js';

let isLoopActive = false;

export function triggerAgentLoop(active: boolean = true) {
    isLoopActive = active;
    if (active && !Automator.isOutreachPending()) {
        console.log('▶️ Arrancando ciclo de prospección...');
        Automator.markOutreachScheduled();
        setTimeout(() => Automator.startNext(), 2000);
    } else if (!active) {
        console.log('⏸️ Ciclo de prospección pausado.');
    }
}

/**
 * Punto de entrada principal para el Agente de WhatsApp Pro (Cloud API)
 */
async function start() {
    console.log('--- CALLTRACK PRO AGENT STARTING (CLOUD API MODE) ---');
    
    // Iniciar el servidor web para recibir los Webhooks de Meta
    const httpServer = startServer();

    // Iniciar el servidor WebSocket enganchado al mismo puerto (3000)
    startWsServer(httpServer);

    // El Conserje de Limpieza ha sido deshabilitado ya que el bot (Generativo) puede manejar respuestas asíncronas sin límite de tiempo.

    // Ciclo de seguimiento cada 2 horas
    setInterval(() => {
      runFollowUpCycle().catch(e => console.error('[Main] Error en follow-up:', e));
    }, 2 * 60 * 60 * 1000);

    // Auditor de fondo (cada 5 minutos)
    startBackgroundAuditor();

    // Escuchar señales del Orquestador / Dashboard
    pipelineEvents.on('bot:pause', () => {
        console.log('⏸️ [Main] Bot pausado por el orquestador.');
        triggerAgentLoop(false);
    });

    pipelineEvents.on('bot:resume', () => {
        console.log('▶️ [Main] Bot reanudado por el orquestador.');
        triggerAgentLoop(true);
    });

    pipelineEvents.on('pipeline:stop', () => {
        console.log('🛑 [Main] STOP TOTAL recibido — apagando bot.');
        triggerAgentLoop(false);
    });

    // Autoarrancar el bot para que procese la cola de leads pendientes
    console.log('🚀 [Main] Auto-arranque de ciclo de prospección...');
    triggerAgentLoop(true);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 [Main] ${signal} recibido. Cerrando limpiamente...`);
      triggerAgentLoop(false);
      try {
        await leadQueueManager.shutdown();
        console.log('✅ [Main] Shutdown completo. Todas las colas cerradas.');
      } catch (e) {
        console.error('❌ [Main] Error durante shutdown:', e);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log(`🎛️ Dashboard: Configura NEXT_PUBLIC_API_URL para apuntar al puerto ${process.env.PORT || 3000}`);
    console.log(`🔌 WebSocket adjuntado al servidor HTTP principal (puerto ${process.env.PORT || 3000})`);
}

start().catch(err => {
    console.error('❌ Error fatal al iniciar el agente:', err);
});
