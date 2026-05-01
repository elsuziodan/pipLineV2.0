"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface ColumnProps {
  id: string;
  title: string;
  icon: string;
  cards: any[];
}

export function Column({ id, title, icon, cards }: ColumnProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "Column",
      title,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-80 h-full bg-zinc-950/50 border-r border-zinc-800",
        isDragging && "opacity-50"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            {title}
          </h2>
        </div>
        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
