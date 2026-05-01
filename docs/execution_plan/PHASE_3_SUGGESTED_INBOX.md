# Phase 3: Suggested Inbox (Leads Sugeridos)

**Goal:** Build the UI to process warm leads suggested by the AI/Telegram bridge.

## 1. UI Component: SuggestedInbox
*   **File:** `apps/dashboard/src/components/kanban/SuggestedInbox.tsx`
*   **Position:** Renders horizontally above the Kanban board or as a collapsible right-side panel.
*   **Design Rules:**
    *   Background: `bg-zinc-900/50`
    *   Border: `border border-zinc-800`
    *   Typography: Header uses `text-xs uppercase tracking-wider text-zinc-500`. Lead names `text-zinc-50`.

## 2. Interactions
*   For each suggested lead, display: Name, Phone, and a small snippet of their last interaction.
*   **Actions:**
    *   `[+ Añadir a Producción]`: Primary button (`bg-zinc-50 text-zinc-950`). Calls mutation to set `status = 'FABRICA'` and `is_board_suggested = false`.
    *   `[Ignorar]`: Ghost button (`text-zinc-400 hover:text-zinc-50`). Sets `is_board_suggested = false`.

## 3. Integration
*   Import and place `<SuggestedInbox />` at the top of `apps/dashboard/src/app/page.tsx`.
