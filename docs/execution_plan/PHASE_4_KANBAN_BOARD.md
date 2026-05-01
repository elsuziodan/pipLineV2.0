# Phase 4: Kanban Board & Drag-Drop

**Goal:** Implement the core Production Hub using `dnd-kit`.

## 1. Kanban Architecture
*   **Files to Create:**
    *   `apps/dashboard/src/components/kanban/Board.tsx` (Main wrapper, handles DND context)
    *   `apps/dashboard/src/components/kanban/Column.tsx` (Renders a column and handles dropping)
    *   `apps/dashboard/src/components/kanban/Card.tsx` (Draggable item)

## 2. UI Specifications (Strict Dark Mode)
*   **Columns:**
    *   Headers: `text-xs uppercase tracking-wider text-zinc-500`.
    *   Background: `bg-[#0A0A0A]` or `bg-zinc-950/50`.
    *   Border: `border-r border-zinc-800` (last column has no border).
*   **Cards:**
    *   Background: `bg-zinc-900`.
    *   Border: `border border-zinc-800`.
    *   Hover: `hover:border-zinc-700 hover:bg-zinc-800/50`.
    *   Timer (Sala de Cobranza only): Calculate days since `board_moved_at`. If > 3 days, show a small red dot/text (`text-red-400`).

## 3. Actions & Combobox
*   **Manual Entry Button:** At the top right of the Board, add a "+ Nuevo Proyecto" button.
*   **Combobox (shadcn Command):** Clicking the button opens a Command dialog. It searches the `clients` table. Selecting a client updates their status to `FABRICA`.
*   **Card Quick Actions:** Inside `Card.tsx`, add small icon buttons (using `lucide-react`) for:
    *   "Generar Landing" (Icon: `Globe`)
    *   "Extraer Info" (Icon: `Download`)
    *   "Recordatorio" (Icon: `Bell`)

## 4. Drag and Drop Logic
*   When `onDragEnd` fires in `dnd-kit`, immediately update the local state for optimistic UI.
*   Fire the Supabase mutation to update the `status` of the dragged client.
