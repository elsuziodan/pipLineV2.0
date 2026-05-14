"use client";

import { Crosshair, Hammer, Banknote, Vault, SlidersHorizontal } from "lucide-react";

export type ViewType = 'prospecting' | 'factory' | 'collection' | 'vault';

const NAV_ITEMS: { id: ViewType; icon: any; label: string }[] = [
  { id: "prospecting", icon: Crosshair, label: "Prospección" },
  { id: "factory", icon: Hammer, label: "Fábrica" },
  { id: "collection", icon: Banknote, label: "Cobranza" },
  { id: "vault", icon: Vault, label: "Bóveda" },
];

interface SidebarProps {
  active?: ViewType;
  onViewChange?: (view: ViewType) => void;
  collectionUrgentCount?: number;
}

export function Sidebar({ active = "prospecting", onViewChange, collectionUrgentCount = 0 }: SidebarProps) {
  return (
    <aside className="sidebar flex flex-col items-center md:py-4 gap-2 shrink-0 md:w-auto bg-white border-t md:border md:border-[var(--color-border)] md:rounded-full md:shadow-[var(--shadow-card)] z-20 md:backdrop-blur-xl md:bg-white/60">
      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        const showBadge = item.id === "collection" && collectionUrgentCount > 0;
        
        return (
          <button
            key={item.id}
            title={item.label}
            onClick={() => onViewChange?.(item.id)}
            className={`relative flex flex-col md:flex-row items-center justify-center transition-all w-11 h-11 rounded-md border-none cursor-pointer ${
              isActive 
                ? "sidebar-btn-active text-[var(--color-accent-aqua)]" 
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            
            {/* Mobile label */}
            <span className="text-[9px] font-medium uppercase tracking-wider mt-1 md:hidden">
              {item.label}
            </span>

            {/* Notification badge */}
            {showBadge && (
              <div className="sidebar-badge absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-danger)]"></div>
            )}
          </button>
        );
      })}

      {/* Spacer for desktop */}
      <div className="flex-1 hidden md:block" />

      {/* Settings at bottom */}
      <button
        title="Settings"
        className="hidden md:flex items-center justify-center transition-all w-10 h-10 rounded-md bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer border-none"
      >
        <SlidersHorizontal size={20} />
      </button>
    </aside>
  );
}
