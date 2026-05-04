
"use client";

import { useState, useEffect } from "react";
import { 
  Archive, 
  Terminal, 
  ChevronRight, 
  Database, 
  Globe, 
  Phone, 
  MapPin, 
  MessageSquare,
  X,
  FileCode
} from "lucide-react";
import { Drawer } from "vaul";
import { format } from "date-fns";

export default function VaultPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/closed-deals', {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080808] overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1B1E] px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 opacity-50">
            <div className="w-2 h-2 rounded-full bg-[#FF5F56]" />
            <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
            <div className="w-2 h-2 rounded-full bg-[#27C93F]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#4A4D54] leading-none uppercase tracking-[0.2em] font-bold">system::archiver</span>
            <span className="text-[11px] text-[#E1E2E4] mt-1 font-bold tracking-tight">closed_deals_vault.db</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1A1B1E] px-2 py-1 rounded border border-[#26282B]">
          <Database size={12} className="text-[#79C0FF]" />
          <span className="text-[9px] text-[#79C0FF] font-bold tracking-tighter uppercase">Vault_Secure_Storage</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4 custom-scrollbar">
        <div className="mb-6 px-1">
          <h2 className="text-[#4A4D54] uppercase tracking-[0.3em] text-[10px] font-bold mb-4">
            Archive::Entries [{deals.length}]
          </h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Terminal size={24} className="animate-pulse mb-4" />
              <span className="text-[10px] uppercase tracking-widest">Querying_Database...</span>
            </div>
          ) : deals.length === 0 ? (
            <div className="border border-dashed border-[#1A1B1E] rounded-lg p-10 flex flex-col items-center justify-center text-center">
              <Archive size={24} className="text-[#1A1B1E] mb-3" />
              <span className="text-[10px] text-[#4A4D54] uppercase font-bold tracking-widest italic">
                &lt; EMPTY_VAULT_EXCEPTION &gt;
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map((deal) => (
                <div 
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className="bg-[#0D0D0D] border border-[#1A1B1E] rounded-lg overflow-hidden active:scale-[0.98] transition-all group"
                >
                  <div className="bg-[#16181D]/50 border-b border-[#1A1B1E] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-[#D2A8FF]">
                      <FileCode size={12} />
                      <span>DEAL::{deal.id.substring(0, 4).toUpperCase()}</span>
                    </div>
                    <span className="text-[9px] text-[#4A4D54] font-bold">
                      {format(new Date(deal.closed_at), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-[15px] font-black text-white uppercase tracking-tight mb-3 group-hover:text-[#79C0FF] transition-colors">
                      {deal.client_name}
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-2 opacity-60">
                      <div className="flex items-center gap-3">
                        <Phone size={12} className="text-[#4A4D54]" />
                        <span className="text-[11px] text-[#E1E2E4] select-all">+{deal.client_phone}</span>
                      </div>
                      {deal.landing_url && (
                        <div className="flex items-center gap-3">
                          <Globe size={12} className="text-[#4A4D54]" />
                          <span className="text-[11px] text-[#79C0FF] truncate">{deal.landing_url}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1A1B1E] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={12} className="text-emerald-500/60" />
                        <span className="text-[9px] text-[#4A4D54] font-bold uppercase tracking-widest">
                          {Array.isArray(deal.conversation) ? deal.conversation.length : 0} Log_Entries
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#00FF41] text-[9px] font-bold tracking-widest uppercase">
                        View_Log <ChevronRight size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer.Root open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" />
          <Drawer.Content className="bg-[#0D0D0D] border-t border-[#1A1B1E] h-[85vh] rounded-t-xl fixed bottom-0 left-0 right-0 z-[70] outline-none flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.8)]">
            <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-[#26282B] my-4" />
            
            <div className="px-6 py-2 shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <Terminal size={14} className="text-[#4A4D54]" />
                <span className="font-mono text-[10px] text-[#4A4D54] uppercase tracking-widest font-bold">
                  Archive::Log_Viewer
                </span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
                {selectedDeal?.client_name}
              </h2>
              <div className="flex items-center gap-4 text-[10px] text-[#4A4D54] font-bold uppercase tracking-widest mb-6">
                <span>Closed:: <span className="text-emerald-500">{selectedDeal && format(new Date(selectedDeal.closed_at), 'yyyy/MM/dd')}</span></span>
                <span>Source:: <span className="text-[#79C0FF]">{selectedDeal?.source}</span></span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar">
               <div className="space-y-4">
                  <div className="bg-[#080808] border border-[#1A1B1E] p-4 rounded-lg">
                    <h4 className="text-[10px] text-[#4A4D54] uppercase font-bold tracking-[0.2em] mb-4 border-b border-[#1A1B1E] pb-2 flex items-center gap-2">
                       <Database size={10} /> Metadata_Dump
                    </h4>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px]">
                         <span className="text-[#4A4D54]">Address::</span>
                         <span className="text-zinc-400 text-right">{selectedDeal?.client_address || 'NULL'}</span>
                       </div>
                       <div className="flex justify-between text-[11px]">
                         <span className="text-[#4A4D54]">Category::</span>
                         <span className="text-zinc-400">{selectedDeal?.deal_metadata?.google_category || 'NULL'}</span>
                       </div>
                       {selectedDeal?.deal_metadata?.close_notes && (
                         <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded italic text-[11px] text-zinc-300">
                           &quot;{selectedDeal?.deal_metadata?.close_notes}&quot;
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <h4 className="text-[10px] text-[#4A4D54] uppercase font-bold tracking-[0.2em] mb-4 border-b border-[#1A1B1E] pb-2 flex items-center gap-2">
                       <MessageSquare size={10} /> Conversation_Log_Snapshot
                    </h4>
                    
                    <div className="space-y-3 font-mono">
                      {selectedDeal?.conversation && selectedDeal.conversation.map((msg: any, i: number) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                          <div className={`max-w-[85%] p-3 rounded-lg text-[12px] leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-[#16181D] border border-[#26282B] text-zinc-100' 
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}>
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-[#4A4D54] mt-1 px-1">
                            {format(new Date(msg.created_at), 'HH:mm:ss')} | {msg.role.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="absolute top-4 right-4 p-2" onClick={() => setSelectedDeal(null)}>
               <X size={20} className="text-[#4A4D54]" />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1A1B1E;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
