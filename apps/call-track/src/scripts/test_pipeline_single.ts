import { orchestrator } from '../pipeline/pipeline_orchestrator.js';

async function test() {
    console.log('🚀 Iniciando PRUEBA DE CAPTACIÓN (Sin Bot)...');
    
    // Configuración: 1 ciudad, 1 keyword, 1 resultado, con auditoría activa
    const city = 'Querétaro';
    const keywords = ['taller mecanico'];
    const maxResults = 1;
    const runAudit = true;

    // Inicializar configuración del orquestador manualmente
    (orchestrator as any).config = { city, keywords, maxResultsPerKeyword: maxResults, runAudit };

    try {
        console.log('--- PASO 1: SCRAPING & AUDIT (Block 0) ---');
        await (orchestrator as any).runBlock0(); 
        
        console.log('--- PASO 2: LOADING TO DATABASE (Block 1) ---');
        await (orchestrator as any).runBlock1();

        console.log('\n✅ PROCESO COMPLETADO.');
        console.log('1. El lead ha sido extraído y auditado por la IA.');
        console.log('2. Ya debe aparecer en el Dashboard (http://localhost:3001).');
        console.log('3. ¡Ya puedes probar a generar su Landing desde el botón del globo! 🌐');
    } catch (err) {
        console.error('❌ Error en la prueba:', err);
    }
}

test();
