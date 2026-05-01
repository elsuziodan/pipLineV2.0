#!/bin/bash

# start_pipeline.sh
# -----------------
# Automatización de arranque para el ecosistema PipeLine usando tmux.

SESSION="pipeline"

# 1. Limpiar puertos por si acaso
echo "🧹 Limpiando puertos 3000 y 3001..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null

# 2. Matar sesión previa de tmux si existe
tmux kill-session -t $SESSION 2>/dev/null

echo "🚀 Arrancando sesión de tmux: $SESSION"

# 3. Crear nueva sesión (Pane 0: Ngrok)
tmux new-session -d -s $SESSION -n "services"
tmux send-keys -t $SESSION:0 "./bin/ngrok http 3000" C-m

# 4. Dividir pantalla y lanzar Backend (Pane 1)
tmux split-window -h -t $SESSION:0
tmux send-keys -t $SESSION:0.1 "cd apps/call-track && npm run start" C-m

# 5. Dividir pantalla abajo y lanzar Dashboard (Pane 2)
tmux split-window -v -t $SESSION:0.1
tmux send-keys -t $SESSION:0.2 "cd apps/dashboard && PORT=3001 npm run dev" C-m

# 6. Organizar layout
tmux select-layout -t $SESSION main-vertical

echo "✅ Sistema arrancado con éxito."
echo "👉 Para ver todo en tiempo real, escribe: tmux attach -t $SESSION"
echo "👉 Para salir de la vista (sin apagar nada), presiona: Ctrl+B y luego D"
