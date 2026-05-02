"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

import * as React from "react";

interface ColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
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
        "flex flex-col flex-1 min-w-[240px] max-w-[400px] shrink-0 h-full border-r border-[#26282B]",
        isDragging && "opacity-50"
      )}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-transparent">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center">{icon}</span>
          <h2 className="text-[13px] font-medium text-[#E2E2E2] capitalize">
            {title.toLowerCase()}
          </h2>
          <span className="text-[12px] font-medium text-[#8A8F98] ml-1">
            {cards.length}
          </span>
        </div>
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto space-y-2.5 custom-scrollbar">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
