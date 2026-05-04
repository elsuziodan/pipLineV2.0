"use client";

import dynamic from "next/dynamic";
import { Kanban as KanbanIcon } from "lucide-react";
import { SuggestedInbox } from "@/components/kanban/SuggestedInbox";
import { NewProjectDialog } from "@/components/kanban/NewProjectDialog";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import { KanbanMobileInbox } from "@/components/kanban/KanbanMobileInbox";

// DnD Board only loaded on desktop to save mobile RAM and prevent touch issues
const Board = dynamic(() => import("@/components/kanban/Board").then(m => ({ default: m.Board })), {
  ssr: false,
  loading: () => <div className="flex-1 animate-pulse bg-zinc-900/50 rounded-lg m-4" />,
});

export default function ProductionBoard() {
  const { cards, updateCardStatus, refresh } = useKanbanBoard();

  return (
    <div className="flex flex-col h-full bg-[#080808] relative overflow-hidden">
      {/* Header (Desktop Only) */}
      <header className="hidden md:flex h-14 border-b border-[#26282B] items-center justify-between px-6 shrink-0 bg-[#080808] relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.05]">
            <KanbanIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <h1 className="text-[13px] font-semibold text-zinc-100 tracking-tight">Tablero de Producción</h1>
          <div className="h-4 w-[1px] bg-white/[0.08] mx-1" />
          <span className="text-[11px] text-zinc-500 font-medium">Pipeline v2.0</span>
        </div>
        <NewProjectDialog onProjectAdded={refresh} />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Desktop View */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden p-4">
          <div className="shrink-0 mb-4">
            <SuggestedInbox onApprove={refresh} />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <Board />
          </div>
        </div>

        {/* Mobile View (Inbox Paradigm - No DnD) */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden">
          <KanbanMobileInbox 
            cards={cards} 
            onUpdateStatus={updateCardStatus} 
          />
        </div>
      </div>
    </div>
  );
}
