"use client";

import { Kanban as KanbanIcon } from "lucide-react";
import { SuggestedInbox } from "@/components/kanban/SuggestedInbox";
import { Board } from "@/components/kanban/Board";
import { NewProjectDialog } from "@/components/kanban/NewProjectDialog";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

export default function ProductionBoard() {
  const { refresh } = useKanbanBoard();

  return (
    <div className="flex flex-col h-full bg-[#080808] relative overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[#26282B] flex items-center justify-between px-6 shrink-0 bg-[#080808] relative z-10">
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
      <div className="flex-1 flex flex-col overflow-hidden p-4 relative z-10">
        <div className="shrink-0">
          <SuggestedInbox onApprove={refresh} />
        </div>
        
        <div className="flex-1 overflow-hidden min-h-0">
          <Board />
        </div>
      </div>
    </div>
  );
}
