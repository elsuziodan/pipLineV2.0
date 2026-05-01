#!/bin/bash

# batch_automotriz.sh
# ------------------
# Corre el pipeline COMPLETO (Scraper + Auditoría + Carga + Bot)
# para el giro de Talleres Automotrices en varias ciudades.

CITIES=("Guadalajara" "Puebla" "Monterrey")

echo "🚀 Iniciando MODO RESUMEN para: ${CITIES[*]}"
echo "------------------------------------------------"

for CITY in "${CITIES[@]}"
do
    echo "📅 [$(date +'%H:%M:%S')] >>> Arrancando Orquestador para: $CITY"
    
    # Llamar al script de Node.js que dispara el orquestador
    # Esto activará:
    # 1. Scraper (Python)
    # 2. Gate A (Auto-aprobación si score > 75)
    # 3. Loader (Carga a Supabase)
    # 4. Gate B (Auto-aprobación)
    # 5. Bot Resume (Empieza a hablar solo)
    
    cd "../call-track"
    npx tsx src/scripts/start_city_pipeline.ts "$CITY"
    
    echo "✅ [$(date +'%H:%M:%S')] <<< Orquestador terminó con éxito para: $CITY"
    echo "------------------------------------------------"
    
    # Pequeño delay de enfriamiento entre ciudades
    sleep 10
done

echo "🏆 BATCH COMPLETO. Sebastian ya está hablando con todos los leads."
