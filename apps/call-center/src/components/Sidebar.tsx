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
    <aside className="sidebar flex flex-col items-center py-6 gap-2 shrink-0 w-[60px] bg-[var(--color-bg-deep)] border-r border-[var(--color-border)]">
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
                ? "sidebar-btn-active bg-[rgba(0,229,204,0.10)] text-[var(--color-accent-aqua)]" 
                : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {/* The active indicator bar for desktop is added via globals.css .sidebar-btn-active::before */}
            {/* For mobile, we add a dot indicator above the icon if active */}
            {isActive && (
              <div className="absolute top-1 w-1 h-1 rounded-full bg-[var(--color-accent-aqua)] shadow-[0_0_8px_rgba(0,229,204,0.6)] md:hidden"></div>
            )}
            
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            
            {/* Mobile label */}
            <span className="text-[9px] font-medium uppercase tracking-wider mt-1 md:hidden">
              {item.label}
            </span>

            {/* Notification badge */}
            {showBadge && (
              <div className="sidebar-badge absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-danger)] shadow-[0_0_6px_rgba(255,68,102,0.5)]"></div>
            )}
          </button>
        );
      })}

      {/* Spacer for desktop */}
      <div className="flex-1 hidden md:block" />

      {/* Settings at bottom */}
      <button
        title="Settings"
        className="hidden md:flex items-center justify-center transition-all w-10 h-10 rounded-md bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer border-none"
      >
        <SlidersHorizontal size={20} />
      </button>
    </aside>
  );
}
