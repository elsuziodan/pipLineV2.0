"use client";

import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface NavigationBarProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  current: number;
  total: number;
  onOpenHistory: () => void;
}

export function NavigationBar({
  onPrev,
  onNext,
  canPrev,
  canNext,
  current,
  total,
  onOpenHistory,
}: NavigationBarProps) {
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ padding: "8px 0 0" }}
    >
      <button
        className="btn-nav"
        disabled={!canPrev}
        onClick={onPrev}
      >
        <ChevronLeft size={16} />
        Anterior
      </button>

      <div className="flex items-center gap-3">
        <span
          className="font-data"
          style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          Lead {current} de {total}
        </span>
        <button
          className="btn-ghost flex items-center gap-2"
          onClick={onOpenHistory}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <Clock size={14} />
          Historial
        </button>
      </div>

      <button
        className="btn-nav"
        disabled={!canNext}
        onClick={onNext}
      >
        Siguiente
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
