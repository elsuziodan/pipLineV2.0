# Phase 1: Layout & Setup

**Goal:** Establish the persistent Sidebar layout, move the existing WA clone to a sub-route, and install required libraries.

## 1. Required Installations (Terminal)
Run these commands inside the `apps/dashboard` directory:

```bash
cd apps/dashboard
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
# Assuming shadcn is initialized, if not, npx shadcn-ui@latest init
npx shadcn-ui@latest add button badge scroll-area popover command dialog
```

## 2. File Restructuring

### Move WA Clone to New Route
*   **Action:** Move `apps/dashboard/src/app/page.tsx` to `apps/dashboard/src/app/auditoria-ia/page.tsx`.
*   **Why:** The root `/` will now be the Kanban Production Board. The existing chat interface becomes a dedicated tool.

### Create Sidebar Component
*   **File:** `apps/dashboard/src/components/Sidebar.tsx`
*   **UI Rules:** 
    *   Dark mode strict: `bg-zinc-950` border-r `border-zinc-800`.
    *   Links: 
        *   Tablero de Producción (Icon: `Kanban`, Route: `/`)
        *   Auditoría IA (Icon: `MessageSquare`, Route: `/auditoria-ia`)
    *   Active state: `bg-zinc-900 text-zinc-50`. Inactive: `text-zinc-400 hover:text-zinc-50`.

### Update Root Layout
*   **File:** `apps/dashboard/src/app/layout.tsx`
*   **Modification:** Wrap the `{children}` with a flex container containing the `<Sidebar />` on the left and a `<main className="flex-1 overflow-hidden bg-[#0A0A0A]">` on the right.

## 3. Empty Root Page
*   **File:** `apps/dashboard/src/app/page.tsx`
*   **Content:** A placeholder React component `export default function ProductionBoard() { return <div className="p-8 text-zinc-50">Tablero de Producción</div> }` with `"use client"`.
