"use client";

import { useSuggestedLeads } from "@/hooks/useSuggestedLeads";
import { UserPlus, X, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function SuggestedInbox({ onApprove }: { onApprove?: () => void }) {
  const { leads, loading, ignoreLead, approveLead } = useSuggestedLeads();

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-xl mb-8">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin mr-3" />
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Cargando Sugerencias...</span>
      </div>
    );
  }

  if (leads.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Inbox className="w-4 h-4 text-zinc-500" />
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500">Bandeja de Sugerencias</h2>
        <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-zinc-800 ml-1">
          {leads.length}
        </Badge>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex w-max space-x-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="w-72 bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-50 truncate">{lead.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">+{lead.phone}</p>
                </div>
                <button
                  onClick={() => ignoreLead(lead.id)}
                  className="text-zinc-500 hover:text-zinc-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 italic whitespace-normal">
                "{lead.metadata?.last_message || "Lead calentado por IA..."}"
              </p>

              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold h-8"
                  onClick={async () => {
                    await approveLead(lead.id);
                    if (onApprove) onApprove();
                  }}
                >
                  <UserPlus className="w-3 h-3 mr-2" />
                  AÑADIR A PRODUCCIÓN
                </Button>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="bg-zinc-800/50" />
      </ScrollArea>
    </div>
  );
}
