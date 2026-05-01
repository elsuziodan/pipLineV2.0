# PipeLine Ecosystem (WIP)

> [!IMPORTANT]
> **Status:** Work In Progress (En Desarrollo Activo)  
> **Last Structure Update:** 2026-05-01  
> **Lead Developer:** Daniel

## 🏗 Project Overview
This project is an autonomous pipeline for lead generation, auditing, and WhatsApp engagement.

### Architecture
- **`apps/scrapper`**: Python/Playwright extraction engine.
- **`apps/call-track`**: Node.js backend & WhatsApp state machine.
- **`apps/dashboard`**: Next.js monitoring interface.
- **`bin/`**: External utilities (Ngrok).
- **`secrets/`**: Protected API keys and tokens.

## 🚀 How to Start
The startup process has been automated for convenience:
1. Run `./start_pipeline.sh` from the root.
2. Use `tmux attach -t pipeline` to monitor all services.

*Refer to `SKILL_STARTUP.md` for detailed technical procedures.*

---
*Note: This structure was optimized on May 1st, 2026, to implement a professional monorepo layout and clean up temporary debug files.*
