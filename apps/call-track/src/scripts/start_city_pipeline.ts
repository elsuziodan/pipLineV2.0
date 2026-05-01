import { orchestrator } from '../pipeline/pipeline_orchestrator.js';

const city = process.argv[2];
if (!city) {
  console.error('❌ Falta el nombre de la ciudad. Uso: node start_city_pipeline.js "Querétaro"');
  process.exit(1);
}

const keywords = [
    "taller mecanico",
    "taller de suspensiones",
    "hojalateria y pintura",
    "afinaciones automotrices",
    "servicio automotriz especializado",
    "taller electrico automotriz",
];

console.log(`🚀 Iniciando pipeline para: ${city}`);
orchestrator.startPipeline(city, keywords, 15, false)
  .then(() => {
    console.log(`✅ Pipeline terminado para: ${city}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ Error en el pipeline de ${city}:`, err);
    process.exit(1);
  });
