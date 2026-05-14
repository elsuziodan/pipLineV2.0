import { orchestrator } from '../pipeline/pipeline_orchestrator.js';

const city = "Cuernavaca, Morelos";
const keywords = [
    "taller mecanico",
    "taller de suspensiones",
    "hojalateria y pintura",
    "afinaciones automotrices",
    "servicio automotriz especializado",
    "taller electrico automotriz",
    "llantas y rines",
    "frenos y clutch",
    "transmisiones automaticas",
    "rectificacion de motores"
];

console.log(`🚀 Iniciando pipeline para Mecánicos en: ${city}`);

orchestrator.startPipeline(city, keywords, 20, false)
  .then(() => {
    console.log(`✅ Pipeline terminado para: ${city}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ Error en el pipeline de ${city}:`, err);
    process.exit(1);
  });
