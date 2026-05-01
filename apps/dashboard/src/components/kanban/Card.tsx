"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Globe, Download, Bell, MoreVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardProps {
  card: any;
}

export function Card({ card }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const daysElapsed = card.board_moved_at 
    ? Math.floor((Date.now() - new Date(card.board_moved_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const showTimer = card.status === 'COBRANZA';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-sm transition-all hover:border-zinc-700",
        isDragging && "opacity-50 grayscale"
      )}
    >
      {/* Drag Handle Area */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="relative pointer-events-none">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[13px] font-semibold text-zinc-50 truncate pr-6">
            {card.name}
          </span>
          <MoreVertical size={14} className="text-zinc-600 shrink-0" />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-zinc-500">
            {card.phone ? `+${card.phone}` : "No phone"}
          </span>
          {showTimer && (
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
              daysElapsed >= 3 ? "bg-red-500/10 text-red-400" : "bg-zinc-800 text-zinc-400"
            )}>
              <Clock size={10} />
              {daysElapsed}d
            </div>
          )}
        </div>

        {/* Actions - Pointer events enabled here */}
        <div className="flex items-center gap-1 mt-2 pointer-events-auto">
          <button className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-50 transition-colors" title="Generar Landing">
            <Globe size={14} />
          </button>
          <button className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-50 transition-colors" title="Extraer Info">
            <Download size={14} />
          </button>
          <button className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-50 transition-colors" title="Recordatorio">
            <Bell size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
