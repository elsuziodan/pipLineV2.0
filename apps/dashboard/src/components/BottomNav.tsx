"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, MessageSquare, Activity, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tablero", href: "/", icon: Kanban },
  { name: "Inbox", href: "/auditoria-ia", icon: MessageSquare },
  { name: "Stats", href: "/stats", icon: Activity },
  { name: "Bóveda", href: "/boveda", icon: Archive },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0E0F11] border-t border-[#26282B] flex items-center justify-around z-50 md:hidden safe-area-bottom touch-manipulation">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-[#5E6AD2]" : "text-[#8A8F98]"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
