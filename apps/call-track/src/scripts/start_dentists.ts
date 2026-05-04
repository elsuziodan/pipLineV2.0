import { orchestrator } from '../pipeline/pipeline_orchestrator.js';

const cities = [
    "Toluca, Estado de México",
    "Querétaro, Querétaro",
    "Puebla, Puebla",
    "Mérida, Yucatán",
    "León, Guanajuato"
];

const keywords = [
    "dentista",
    "clinica dental",
    "ortodoncia",
    "odontologo",
    "endodoncia"
];

async function runAllCities() {
    console.log(`🚀 Iniciando campaña masiva para DENTISTAS en 5 ciudades`);
    
    for (const city of cities) {
        console.log(`\n======================================================`);
        console.log(`📍 Procesando ciudad: ${city}`);
        console.log(`======================================================\n`);
        
        try {
            // maxResultsPerKeyword = 10 para no saturar demasiado rápido
            // runAudit = false para que pase directo sin detenerse
            await orchestrator.startPipeline(city, keywords, 10, false);
            console.log(`✅ Pipeline terminado para: ${city}`);
            
            // Pausa entre ciudades para no saturar APIs
            console.log(`⏳ Esperando 30 segundos antes de la siguiente ciudad...`);
            await new Promise(r => setTimeout(r, 30000));
        } catch (err) {
            console.error(`❌ Error en el pipeline de ${city}:`, err);
            // Continúa con la siguiente ciudad a pesar del error
        }
    }
    
    console.log(`\n🎉 CAMPAÑA MASIVA COMPLETADA. Todos los leads están en cola/procesándose.`);
    process.exit(0);
}

runAllCities();
