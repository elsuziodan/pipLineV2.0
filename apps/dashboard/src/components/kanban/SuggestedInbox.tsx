"use client";

import { useSuggestedLeads } from "@/hooks/useSuggestedLeads";
import { UserPlus, X, Loader2, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function SuggestedInbox({ onApprove }: { onApprove?: () => void }) {
  const { leads, loading, ignoreLead, approveLead } = useSuggestedLeads();

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-[#18191B] border border-white/5 rounded-xl mb-6">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin mr-3" />
        <span className="text-zinc-500 text-xs font-medium tracking-wide">Cargando Sugerencias...</span>
      </div>
    );
  }

  if (leads.length === 0) return null;

  return (
    <div className="mb-6 px-1">
      <div className="flex items-center gap-3 mb-3 px-1">
        <GitPullRequest className="w-3.5 h-3.5 text-emerald-500" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] font-medium text-zinc-400">Incoming Pull Requests</h2>
        <div className="h-4 w-[1px] bg-white/[0.08] mx-1" />
        <span className="font-mono text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
          {leads.length} Pending
        </span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-white/5 bg-[#0C0D0F] p-3 shadow-inner">
        <div className="flex w-max space-x-4">
          {leads.map((lead) => {
            const shortId = lead.id ? String(lead.id).substring(0, 4).toLowerCase() : 'xxx';
            return (
              <div
                key={lead.id}
                className="w-[280px] bg-[#18191B] border border-[#3FB950]/20 border-l-[3px] border-l-[#3FB950] rounded-lg overflow-hidden flex flex-col shadow-sm transition-all"
              >
                {/* Header (PR Tab) */}
                <div className="bg-[#3FB950]/5 border-b border-[#3FB950]/10 px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-500/80">
                    <GitPullRequest className="w-3 h-3" />
                    <span>pr-{shortId}</span>
                  </div>
                  <button
                    onClick={() => ignoreLead(lead.id)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col gap-2">
                  <h3 className="text-[11.5px] text-[#79C0FF] font-mono truncate">
                    "{lead.name}"
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[10px] text-[#D2A8FF] truncate">
                      "{lead.phone ? `+${lead.phone}` : 'N/A'}"
                    </div>
                  </div>
                  
                  <div className="font-mono text-[10px] text-zinc-500 mt-1 truncate">
                    /* {lead.metadata?.last_message || "AI intent detected"} */
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full bg-[#238636]/90 hover:bg-[#2EA043] text-white border border-[#2EA043]/50 font-mono text-[10px] font-bold h-7 rounded transition-transform active:scale-[0.98]"
                      onClick={async () => {
                        await approveLead(lead.id);
                        if (onApprove) onApprove();
                      }}
                    >
                      <UserPlus className="w-3 h-3 mr-2" />
                      MERGE LEAD
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="bg-white/[0.03]" />
      </ScrollArea>
    </div>
  );
}
