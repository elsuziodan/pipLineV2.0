#!/bin/bash

# start_preview.sh (Safe Preview Mode)
# -------------------------------------
# Arranca Backend + Dashboard SIN Ngrok.
# Esto permite auditar la UI sin riesgo de enviar
# mensajes a clientes reales por WhatsApp.
#
# USO:   ./start_preview.sh
# DOCS:  Ver SKILL_SAFE_PREVIEW.md
# PROD:  Para modo completo usar ./start_pipeline.sh

SESSION="preview"

echo ""
echo "🛡️  MODO PREVIEW — Sin envío de mensajes"
echo "================================================"

# 1. Limpiar puertos por si hay servicios previos
echo "🧹 Limpiando puertos 3000 y 3001..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null

# 2. Matar sesión previa de tmux si existe
tmux kill-session -t $SESSION 2>/dev/null
tmux kill-session -t pipeline 2>/dev/null

# 3. Verificar que Ngrok NO esté corriendo
NGROK_CHECK=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
if [ ! -z "$NGROK_CHECK" ]; then
    echo "⚠️  Ngrok detectado activo. Cerrándolo para modo seguro..."
    pkill -f ngrok 2>/dev/null
    sleep 1
fi

echo "✅ Ngrok NO activo — modo seguro confirmado."
echo ""

# 4. Crear sesión tmux con Backend (Pane 0)
tmux new-session -d -s $SESSION -n "preview"
tmux send-keys -t $SESSION:0 "cd apps/call-track && npm run start" C-m

# 5. Dividir pantalla y lanzar Dashboard (Pane 1)
tmux split-window -h -t $SESSION:0
tmux send-keys -t $SESSION:0.1 "cd apps/dashboard && PORT=3001 npm run dev" C-m

# 6. Organizar layout
tmux select-layout -t $SESSION even-horizontal

echo "================================================"
echo "🛡️  PREVIEW MODE ACTIVO"
echo ""
echo "   🌐 Dashboard:  http://localhost:3001"
echo "   🔧 Backend:    http://localhost:3000"
echo "   🚫 Ngrok:      DESACTIVADO (sin túnel)"
echo "   📩 Mensajes:   BLOQUEADOS (sin webhook)"
echo ""
echo "================================================"
echo "👉 Ver logs:   tmux attach -t $SESSION"
echo "👉 Detach:     Ctrl+B y luego D"
echo "👉 Apagar:     tmux kill-session -t $SESSION"
echo ""
echo "⚡ Para modo PRODUCCIÓN completo:"
echo "   tmux kill-session -t $SESSION && ./start_pipeline.sh"
echo ""
