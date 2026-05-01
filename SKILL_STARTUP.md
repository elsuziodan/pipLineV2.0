# SKILL: Project Startup & Operation Guide

This document defines the standard operating procedure for starting the PipeLine ecosystem in its optimized structure.

## 1. Prerequisites
- **Environment Variables**: Ensure `.env` files in `apps/call-track` and `apps/dashboard` are populated.
- **Secrets**: API keys are located in `/secrets/`.
- **Binaries**: `ngrok` is located in `/bin/`.

## 2. Startup Sequence (Automated - RECOMMENDED)

To start the entire ecosystem at once in a managed `tmux` session:
- **Command**: `./start_pipeline.sh`
- **Management**:
    - **View logs**: `tmux attach -t pipeline` (This opens the dashboard with all 3 services).
    - **Detach**: `Ctrl+B`, then `D` (Closes the view but keeps everything running).
    - **Stop everything**: `tmux kill-session -t pipeline`

## 3. Manual Startup Sequence (Optional)
If you prefer manual control or the script fails:

### Step 1: External Tunnel (Ngrok)
- **Command**: `./bin/ngrok http 3000`

### Step 2: Backend & WhatsApp Agent (Call-Track)
- **Command**: `cd apps/call-track && npm run start`

### Step 3: Frontend Dashboard
- **Command**: `cd apps/dashboard && PORT=3001 npm run dev`

## 4. Scrapper Operation
To run a batch of city extractions:
- **Directory**: `apps/scrapper`
- **Command**: `./batch_automotriz.sh`

## 5. Troubleshooting
- **Port Conflicts**: If port 3000 is busy, use `fuser -k 3000/tcp` to clear it.
- **Venv Issues**: If Python throws "bad marshal data", delete `__pycache__` folders:
  `find apps/scrapper/venv -name "__pycache__" -type d -exec rm -rf {} +`

---
*Created on 2026-05-01 by Antigravity*
