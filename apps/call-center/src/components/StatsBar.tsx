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
      className="stats-bar flex gap-3"
      style={{ padding: "16px 20px 8px" }}
    >
      {METRICS.map((metric) => {
        const Icon = metric.icon;
        const value = stats[metric.key];
        return (
          <div
            key={metric.key}
            className={`metric-card flex-1 ${metric.hero ? "metric-card-hero" : ""}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon
                size={13}
                style={{
                  color: metric.hero
                    ? "rgba(255,255,255,0.70)"
                    : "var(--color-text-secondary)",
                }}
              />
              <span className="metric-label">{metric.label}</span>
            </div>
            <div
              className="metric-value"
              style={{ color: metric.colorVar }}
            >
              {stats.loading ? "—" : value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
