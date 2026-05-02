"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { Card } from "./Card";
import { useState } from "react";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

import { Factory, CircleDollarSign, CheckCircle2, XCircle } from "lucide-react";

const COLUMNS = [
  { id: "FABRICA", title: "Fábrica", icon: <Factory className="w-3.5 h-3.5 text-zinc-400" /> },
  { id: "COBRANZA", title: "Sala de Cobranza", icon: <CircleDollarSign className="w-3.5 h-3.5 text-amber-500" /> },
  { id: "LIQUIDADO", title: "Liquidados", icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#5E6AD2]" /> },
  { id: "CANCELADO", title: "Cancelados", icon: <XCircle className="w-3.5 h-3.5 text-red-500/80" /> },
];

export function Board() {
  const { cards, loading, updateCardStatus } = useKanbanBoard();
  const [activeCard, setActiveCard] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const columnsWithCards = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      cards: cards.filter((c) => c.status === col.id),
    }));
  }, [cards]);

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Card") {
      setActiveCard(event.active.data.current.card);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCardData = active.data.current?.card;
    const overType = over.data.current?.type;

    let newStatus = activeCardData.status;

    if (overType === "Column") {
      newStatus = overId;
    } else if (overType === "Card") {
      newStatus = over.data.current?.card.status;
    }

    if (newStatus !== activeCardData.status) {
      await updateCardStatus(activeId, newStatus);
    }
  }

  return (
    <div className="flex h-full overflow-x-auto overflow-y-hidden bg-transparent custom-scrollbar">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex w-full h-full">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              icon={col.icon}
              cards={cards.filter((c) => c.status === col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <Card card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
