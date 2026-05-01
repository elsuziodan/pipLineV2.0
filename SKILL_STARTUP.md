# SKILL: Project Startup & Operation Guide (V2.0)

This document defines the standard operating procedure for starting the **Seven Factor** ecosystem.

## 1. Prerequisites
- **Environment Variables**: Ensure `.env` files in `apps/call-track` and `apps/dashboard` are populated.
- **Database**: The master schema is located in `docs/database/FULL_SCHEMA.sql`.
- **Secrets**: API keys are located in `/secrets/`.
- **Binaries**: `ngrok` is located in `/bin/`.

## 2. Startup Sequence (Automated - RECOMMENDED)

To start the entire ecosystem at once in a managed `tmux` session:
- **Command**: `./start_pipeline.sh`
- **Management**:
    - **View logs**: `tmux attach -t pipeline` (Opens a 3-pane layout).
    - **Detach**: `Ctrl+B`, then `D` (Keeps everything running).
    - **Stop everything**: `tmux kill-session -t pipeline`

## 3. Operational Areas

### A. Production Board (Root: `/`)
- **Suggested Inbox**: Process leads warmed by Sebastian.
- **Kanban**: Drag cards to track "Fábrica" → "Cobranza" → "Liquidado".
- **New Project**: Use the search dialog to manually add clients to the board.

### B. AI Audit (Route: `/auditoria-ia`)
- Legacy WhatsApp chat interface to monitor Sebastian's real-time interactions.

### C. Backend & CRM Bridge
- The backend automatically synchronizes WhatsApp messages with Telegram Topics.
- **Topic Naming**: Uses the business name from Supabase for parity with the dashboard.

## 4. Scrapper Operation
To run a batch of city extractions:
- **Directory**: `apps/scrapper`
- **Command**: `./batch_automotriz.sh`

## 5. Troubleshooting
- **Port Conflicts**: Port 3000 (Backend) and 3001 (Dashboard).
- **Manual Reset**: If the board is out of sync, the dashboard refreshes automatically every 30s.

---
*Updated on May 1st, 2026, for the Production Hub Redesign.*
