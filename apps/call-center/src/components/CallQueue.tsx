"use client";

import { LeadCard } from "./LeadCard";
import { UserSearch } from "lucide-react";
import type { Lead, FilterType } from "@/lib/types";

interface CallQueueProps {
  leads: Lead[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  loading: boolean;
  calls: Record<string, string[]>;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "uncontacted", label: "Sin contactar" },
  { key: "interested", label: "Interesados" },
  { key: "followup_today", label: "Seguimiento hoy" },
  { key: "top_tier", label: "Top Tier" },
];

export function CallQueue({
  leads,
  selectedIndex,
  onSelect,
  filter,
  onFilterChange,
  loading,
  calls,
}: CallQueueProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter pills */}
      <div className="filter-strip flex gap-2 flex-wrap" style={{ padding: "0 0 12px" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? "filter-pill-active" : ""}`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div
        className="lead-list flex-1 overflow-y-auto flex flex-col gap-1"
        key={filter} /* Reset staggered animations on filter change */
      >
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="loading-shimmer"
              style={{ height: 60, marginBottom: 4 }}
            />
          ))
        ) : leads.length === 0 ? (
          // Empty state
          <div
            className="flex flex-col items-center justify-center flex-1 gap-3"
            style={{ opacity: 0.5 }}
          >
            <UserSearch size={48} style={{ color: "var(--color-text-tertiary)" }} />
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              No hay leads con este filtro
            </span>
          </div>
        ) : (
          leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isActive={index === selectedIndex}
              onClick={() => onSelect(index)}
              callOutcomes={calls[lead.id] || []}
            />
          ))
        )}
      </div>
    </div>
  );
}
