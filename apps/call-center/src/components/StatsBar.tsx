"use client";

import { Flame, CalendarClock, Handshake, Users } from "lucide-react";
import type { CallStats } from "@/lib/types";

interface StatsBarProps {
  stats: CallStats & { loading: boolean };
}

const METRICS = [
  {
    key: "interested_today" as const,
    label: "Interesados",
    icon: Flame,
    colorVar: "var(--color-success)",
    hero: false,
  },
  {
    key: "followups_today" as const,
    label: "Seguimientos Hoy",
    icon: CalendarClock,
    colorVar: "white",
    hero: true,
  },
  {
    key: "in_negotiation" as const,
    label: "Negociación",
    icon: Handshake,
    colorVar: "var(--color-accent-purple)",
    hero: false,
  },
  {
    key: "uncontacted" as const,
    label: "Sin Contactar",
    icon: Users,
    colorVar: "var(--color-text-accent)",
    hero: false,
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div
      className="stats-bar flex flex-wrap items-center justify-center gap-2 md:gap-4 md:rounded-full border-b md:border md:border-[var(--color-border)] bg-white/60 backdrop-blur-md md:shadow-[var(--shadow-card)] md:mx-auto md:mt-4 md:mb-2 z-10"
      style={{ padding: "12px 24px" }}
    >
      {METRICS.map((metric, index) => {
        const value = stats[metric.key];
        return (
          <div key={metric.key} className="flex items-center gap-1 md:gap-2">
            <span className="font-bold text-[var(--color-text-primary)] text-sm md:text-base">
              {stats.loading ? "—" : value}
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs md:text-sm lowercase">
              {metric.label}
            </span>
            {index < METRICS.length - 1 && (
              <span className="text-[var(--color-text-tertiary)] mx-1 md:mx-2 hidden md:inline">
                ·
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
