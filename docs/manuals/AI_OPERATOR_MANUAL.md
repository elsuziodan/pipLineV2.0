# AI OPERATOR MANUAL - CallTrack Pro Autonomous WhatsApp Agent
> **Target Audience:** Future AI Agents / LLMs taking over the development or maintenance of this module.
> **Language:** Technical (High Information Density)
> **Stack:** Node.js (v22+), TypeScript (tsx), WhatsApp-Web.js, Supabase, Puppeteer (Real Chrome wrapper).

## 1. System Architecture Overview
This module acts as an autonomous CLI-based WhatsApp agent that acts as a filter for outbound leads. 
It pulls cold leads from Supabase, sends human-timed scripts, processes responses using DeepSeek AI (`router.ts`), and advances them through a deterministic state machine until it either discards them (`NEGATIVE`), captures them (`POSITIVE/CLIMAX`), or aborts due to ambiguity (`HANDOVER`).

**Key Architectural Constraint:** 
Do NOT deploy continuous loops or `setInterval` triggers for the main orchestration. The system relies on a unified entry point function: `import { triggerAgentLoop } from './main'` which either recursive auto-skips or hooks into `readline` (stdin) to wait for the human operator to manually approve proceeding.

## 2. Directory Structure (`/dataBase/whatsapp/`)
- `main.ts`: Entrypoint. Initializes WA client and exposes `triggerAgentLoop(autoContinue: boolean)`. Contains the `readline` interface.
- `client.ts`: Exports initialized `client`. Sets up `sendPresenceAvailable` interval to maintain 'Online' WA status to avoid bot-bans.
- `automator.ts`: The Core State Machine executor. Handles human-simulation delays and sending structured steps.
- `handler.ts`: Entrypoint for incoming texts (`message` event). Ignores `fromMe`. Maps DB state to appropriate Router execution.
- `router.ts`: Mixes local heuristics and DeepSeek LLM prompts to classify the incoming message as `NEXT_STEP`, `EXIT`, or `HANDOVER`.
- `constants.ts`: Contains `SCRIPT_VARIANTS` and relative paths to media files.
- `utils.ts`: Provides organic delays and anti-ban mutation tools (`uniquifyMessage`).

## 3. The State Machine (Supabase sync)
### 3.1 Pipeline Statuses vs. Bot Statuses
- **`status` (PipelineStatus):** High-level view. Uncontacted leads are `prospecto`. Concluded or actively handled interactions MUST be `contactado`.
- **`metadata.bot_status` (BotStatus):** Granular tracking. Tracks exact script stage: `IDLE` -> `SENT_GREETING` -> `SENT_PROPOSAL` -> `SENT_CLIMAX`.
- **`tags` (TagType[]):** Array of categorizations. Important tags:
  - `nuevo`: Starting default.
  - `test_ahora`: Overrides safety locks (triggers manual sending).
  - `lead`: Achieved Climax positively.
  - `pendiente`: Aborted out-of-script, needs human review.
  - `invalido`: Number unsupported by Meta/WhatsApp.

### 3.2 State Transitions Map
1. **Initial Grab:** `startNext()` queries `.eq('status', 'prospecto').neq('status', 'contactado')`. Removes `nuevo` upon sending greeting.
2. **Success Flow:** `SENT_GREETING` -> (AI OK) -> `SENT_PROPOSAL` -> (AI OK) -> `SENT_CLIMAX`. 
   - *End State:* Updates to `status: 'contactado'`, `tags: ['lead']`. Triggers Telegram. `triggerAgentLoop(false)`.
3. **Negative Flow:** Any stage -> (AI NO) -> `sendNegativeExit()`.
   - *End State:* Updates to `status: 'contactado'`. `triggerAgentLoop(true)` (auto-skips to next lead).
4. **Ambiguity / Fallback:** Any stage -> (AI AMBIGUOUS/QUESTIONS) -> Handover.
   - *End State:* Updates to `status: 'contactado'`, `tags: ['pendiente']`. Triggers Telegram. `triggerAgentLoop(false)`.
5. **Invalid Number Fallback:** Native failure on `sendMessage`.
   - *End State:* Updates to `status: 'contactado'`, `tags: ['invalido']`. `triggerAgentLoop(true)`.

## 4. Humanization (Anti-Ban Rules)
When modifying `automator.ts`, **always respect human timing arrays**:
- **Typing simulation:** Fixed 5-6s delay (`simulateTyping`) to mimic physical keystrokes, completely decoupled from message logic length.
- **Message Sequences:** `Step 2` contains 3 messages sent serially. Use `getRandomDelay(1500, 2500)` delays BETWEEN chunk dispatches so the bot "breathes".
- **Unique Hash Obfuscator:** All outgoing strings MUST wrap through `uniquifyMessage(msg)` to append invisible zero-width spaces/punctuation to bypass Meta spam-hash signature detection.

## 5. Security & Safety Locks
### PRODUCTION STATUS:
The hardcoded Safety Lock (`isTester`) that restricted the bot to testing numbers only **has been REMOVED** to enable full production deployment against cold leads.

**CRITICAL:** When running the agent, it will now contact ANY prospect marked as `nuevo` in the database. Ensure the database is clean before starting.

When deploying natively:
1. Ensure `systemctl` or background daemon does NOT steal `stdin` incorrectly, because `readline` in `main.ts` requires terminal interactivity to yield to `triggerAgentLoop(false)`.
2. Do not wipe `.wwebjs_auth/` natively, or the session drops.

## 6. The Janitor (Stale Lead Cleanup)
To prevent the serial pipeline from clogging due to non-responders, a "Janitor" process runs every 60 seconds (`setInterval` in `main.ts` calling `Automator.cleanupStaleLeads()`).

**Logic:**
- Target: Leads in `SENT_GREETING` whose `last_bot_update` is > 4 minutes old.
- Action: Marks them as `status: 'contactado'` and adds the `no_responde` tag.
- Auto-Chain: If the bot is not busy (`isRunning === false`), the Janitor automatically triggers `triggerAgentLoop(true)` to pick up the next fresh lead.
- Resurrection: Leads processed by the Janitor CAN still talk back. The `handler.ts` will pick up their response and move them to Step 2 even if they were marked as `contactado`. 

