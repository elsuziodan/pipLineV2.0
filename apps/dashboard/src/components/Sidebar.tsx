"use client";

import Link from "next/link";
import Image from "next/image";
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
    <div className="flex flex-col w-56 bg-[#0E0F11] border-r border-[#26282B] h-full relative z-20">
      <div className="flex items-center h-14 px-5">
        <div className="w-6 h-6 flex items-center justify-center mr-2 relative">
          <Image src="/7f-logo.png" alt="7F Logo" fill className="object-contain" />
        </div>
        <span className="text-[13px] text-[#F2F2F2] font-semibold tracking-tight">Seven Factor Hub</span>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
                isActive
                  ? "bg-[#212224] text-[#F2F2F2]"
                  : "text-[#8A8F98] hover:text-[#E2E2E2] hover:bg-[#212224]/50"
              )}
            >
              <item.icon
                className={cn(
                  "w-3.5 h-3.5 mr-3 flex-shrink-0 transition-colors",
                  isActive ? "text-[#5E6AD2]" : "text-[#8A8F98] group-hover:text-[#E2E2E2]"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[#26282B]">
        <div className="flex items-center px-3 py-1.5 rounded-md hover:bg-[#212224] transition-colors cursor-pointer">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-2.5 shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
          <span className="text-[12px] font-medium text-[#8A8F98]">
            System Active
          </span>
        </div>
      </div>
    </div>
  );
}
