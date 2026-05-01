"use client";

import { Kanban as KanbanIcon } from "lucide-react";
import { SuggestedInbox } from "@/components/kanban/SuggestedInbox";
import { Board } from "@/components/kanban/Board";
import { NewProjectDialog } from "@/components/kanban/NewProjectDialog";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

export default function ProductionBoard() {
  const { refresh } = useKanbanBoard();

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <KanbanIcon className="w-5 h-5 text-zinc-400" />
          <h1 className="text-sm font-semibold text-zinc-50 tracking-tight">Tablero de Producción</h1>
        </div>
        
        <NewProjectDialog onProjectAdded={refresh} />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-track]:bg-transparent">
        <SuggestedInbox onApprove={refresh} />
        
        <div className="h-[calc(100vh-320px)] border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/30">
          <Board />
        </div>
      </div>
    </div>
  );
}
