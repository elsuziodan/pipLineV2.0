"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface ViewTabsProps {
  activeIndex: number;
  dragOffset: number;
  isDragging: boolean;
  onTabClick: (index: number) => void;
}

export default function ViewTabs({ activeIndex, onTabClick }: ViewTabsProps) {
  const tabs = ['Trend', 'Fábrica', 'Archivados'];

  return (
    <div className="flex gap-4 overflow-x-auto relative pb-2 no-scrollbar">
      {tabs.map((label, i) => {
        const isActive = activeIndex === i;
        return (
          <button
            key={i}
            onClick={() => onTabClick(i)}
            className={cn(
              "font-body pb-1 cursor-pointer text-label tracking-[0.18em] uppercase whitespace-nowrap transition-colors border-none bg-transparent relative",
              isActive ? "text-ink font-semibold" : "text-ink-muted font-normal hover:text-ink"
            )}
          >
            {label}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-[-4px] left-0 right-0 h-[2.5px] bg-ink-accent rounded-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
