# Phase 2: Supabase Schema & State

**Goal:** Ensure the backend schema supports the new Kanban workflow and Suggested Inbox, and build the data-fetching hooks.

## 1. Supabase Schema Verifications
*(Note for Coder AI: Verify these exist or instruct the user to run an SQL migration)*
*   **Table:** `clients`
*   **Required Fields:**
    *   `status` (varchar): Must support values like `'FABRICA'`, `'COBRANZA'`, `'LIQUIDADO'`, `'CANCELADO'`.
    *   `is_board_suggested` (boolean): Default `false`. AI/Telegram bridge will set this to `true` when a lead is warm.
    *   `board_moved_at` (timestamp): To calculate "days elapsed" in the Cobranza column.

## 2. Data Hooks

### Suggested Leads Hook
*   **File:** `apps/dashboard/src/hooks/useSuggestedLeads.ts`
*   **Code Block to Implement:**
    ```typescript
    // Fetch clients where is_board_suggested == true
    // Mutation to update is_board_suggested to false (Ignore)
    // Mutation to move to Kanban (update status to 'FABRICA' and is_board_suggested to false)
    ```

### Kanban Board Hook
*   **File:** `apps/dashboard/src/hooks/useKanbanBoard.ts`
*   **Code Block to Implement:**
    ```typescript
    // Fetch clients where status is in Kanban states.
    // Group them by status.
    // Mutation to update client status (for drag-and-drop).
    ```

## 3. Strict Rules
*   All hooks must handle loading and error states gracefully to prevent UI flickering in the dark mode dashboard.
