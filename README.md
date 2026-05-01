# Seven Factor: Production & CRM Hub (V2.0)

> [!IMPORTANT]
> **Status:** Rediseño Completo Finalizado (May 2026)  
> **Structure:** Professional B2B Monorepo  
> **Lead Developer:** Daniel

## 🏗 Project Overview
This project is an advanced autonomous pipeline for lead generation, AI auditing, and professional B2B production management.

### Key Components
- **`apps/dashboard`**: Next.js Production Hub (Kanban Board, Suggested Leads, Dark Mode).
- **`apps/call-track`**: Node.js backend & WhatsApp state machine (Sebastian AI).
- **`apps/scrapper`**: Python/Playwright extraction engine for Google Maps.
- **`docs/`**: Centralized documentation and Master Database Schema.

### 🎨 Design System
- **Style**: Linear-inspired Dark Mode (`bg-zinc-950`).
- **Framework**: Next.js (SPA architecture), Tailwind CSS, Shadcn/UI, Dnd-kit.
- **Backend**: Supabase (Realtime sync).

## 🚀 How to Start
The startup process is automated via tmux:
1. Run `./start_pipeline.sh` from the root.
2. Use `tmux attach -t pipeline` to monitor the tunnel, backend, and dashboard.

*Refer to `SKILL_STARTUP.md` and `docs/execution_plan/` for detailed technical procedures.*

---
*Optimized on May 1st, 2026, to transition from a simple log viewer to a full-featured Production and CRM Hub.*
