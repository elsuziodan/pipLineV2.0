"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, MessageSquare, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tablero de Producción", href: "/", icon: Kanban },
  { name: "Auditoría IA", href: "/auditoria-ia", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-zinc-950 border-r border-zinc-800 h-full">
      <div className="flex items-center h-16 px-6 border-b border-zinc-800">
        <LayoutDashboard className="w-6 h-6 text-zinc-50 mr-2" />
        <span className="text-zinc-50 font-bold tracking-tight">Seven Factor</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 mr-3 flex-shrink-0",
                  isActive ? "text-zinc-50" : "text-zinc-400"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            System Online
          </span>
        </div>
      </div>
    </div>
  );
}
