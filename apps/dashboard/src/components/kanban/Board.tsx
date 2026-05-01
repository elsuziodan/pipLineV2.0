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

const COLUMNS = [
  { id: "FABRICA", title: "Fábrica", icon: "⚙️" },
  { id: "COBRANZA", title: "Sala de Cobranza", icon: "💰" },
  { id: "LIQUIDADO", title: "Liquidados", icon: "🏆" },
  { id: "CANCELADO", title: "Cancelados", icon: "💀" },
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
    <div className="flex h-full overflow-x-auto overflow-y-hidden bg-[#0A0A0A] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-zinc-800">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex">
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
