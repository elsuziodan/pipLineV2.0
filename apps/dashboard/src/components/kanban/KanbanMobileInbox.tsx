"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Factory, 
  CircleDollarSign, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Folder,
  FolderOpen,
  Terminal,
  Cpu,
  Archive
} from "lucide-react";
import { Drawer } from "vaul";
import { formatRelativeTime } from "../chat/utils";
import { useRouter } from "next/navigation";

const COLUMNS = [
  { id: 'prospecto', name: 'NUEVOS', icon: Sparkles, color: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.1)]' },
  { id: 'FABRICA', name: 'FABRICA', icon: Factory, color: 'text-fuchsia-500', glow: 'shadow-[0_0_15px_rgba(217,70,239,0.15)]' },
  { id: 'COBRANZA', name: 'COBRANZA', icon: CircleDollarSign, color: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
  { id: 'LIQUIDADO', name: 'LIQUIDADO', icon: CheckCircle2, color: 'text-[#00FF41]', glow: 'shadow-[0_0_15px_rgba(0,255,65,0.1)]' },
  { id: 'CANCELADO', name: 'CANCELADO', icon: XCircle, color: 'text-red-500/80', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' },
];

export function KanbanMobileInbox({ cards, onUpdateStatus }: any) {
  const [expandedCols, setExpandedCols] = useState<string[]>(['prospecto', 'FABRICA']);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const router = useRouter();

  const toggleExpand = (colId: string) => {
    setExpandedCols(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const cardsByCol = COLUMNS.reduce((acc: any, col) => {
    acc[col.id] = cards.filter((c: any) => c.status === col.id);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-[#080808] overflow-y-auto pb-24 font-mono select-none">
      {/* Code Console Style Header */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1B1E] px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 opacity-50">
            <div className="w-2 h-2 rounded-full bg-[#FF5F56]" />
            <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
            <div className="w-2 h-2 rounded-full bg-[#27C93F]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#4A4D54] leading-none uppercase tracking-[0.2em] font-bold">orchestrator::v2.0</span>
            <span className="text-[11px] text-[#E1E2E4] mt-1 font-bold tracking-tight">production_board.sh</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#080808] px-2 py-1 rounded-sm border border-[#1A1B1E]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
          <span className="text-[8px] text-[#00FF41] font-bold tracking-widest uppercase">Live_Sync</span>
        </div>
      </div>

      <div className="flex flex-col">
        {COLUMNS.map((col) => {
          const colCards = cardsByCol[col.id] || [];
          const isExpanded = expandedCols.includes(col.id);

          return (
            <div key={col.id} className={`border-b border-[#1A1B1E] transition-all ${isExpanded ? 'bg-[#0A0A0A]' : ''}`}>
              <button 
                onClick={() => toggleExpand(col.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#111111] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <FolderOpen size={14} className={col.color} /> : <Folder size={14} className="text-[#4A4D54]" />}
                  <span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${isExpanded ? col.color : 'text-[#8A8F98]'}`}>
                    DIR::{col.name}
                  </span>
                  <span className="text-[9px] text-[#4A4D54] font-bold">
                    [count::{colCards.length}]
                  </span>
                </div>
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown size={14} className="text-[#4A4D54]" />
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col">
                  {colCards.length === 0 ? (
                    <div className="p-6 text-center text-[9px] text-[#4A4D54] uppercase tracking-widest font-bold border-t border-[#1A1B1E]/30 italic opacity-50">
                      &lt; EOF::NO_ENTRIES_FOUND &gt;
                    </div>
                  ) : (
                    colCards.map((card: any) => {
                      const timeStr = formatRelativeTime(new Date(card.board_moved_at || card.created_at).getTime()).toUpperCase();
                      return (
                        <div 
                          key={card.id} 
                          onClick={() => setSelectedCard(card)}
                          className="group flex flex-col gap-2 p-5 border-t border-[#1A1B1E] active:bg-[#0D0D0D] transition-colors relative overflow-hidden"
                        >
                          {/* Lead Entry Struct Style */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[#4A4D54] text-[10px] shrink-0">ENTRY::{card.id.toString().slice(-4)}</span>
                                <span className="text-[#00FF41] text-[10px]">&gt;</span>
                                <h4 className="text-[14px] font-bold text-[#E1E2E4] truncate tracking-tight uppercase">
                                  {card.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <span className="text-[#4A4D54] text-[9px] font-bold">{timeStr}</span>
                                <div className="flex items-center gap-1.5">
                                  <Cpu size={10} className="text-[#4A4D54]" />
                                  <span className="text-[9px] text-[#4A4D54] font-bold uppercase tracking-tighter">
                                    {card.status === 'FABRICA' ? 'CORE::BUILD' : card.status === 'COBRANZA' ? 'IO::PAYMENT' : 'SYS::IDLE'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`px-2 py-0.5 rounded-sm border border-[#1A1B1E] bg-[#0D0D0D] text-[8px] font-black tracking-widest uppercase ${col.color}`}>
                              {col.name}
                            </div>
                          </div>

                          {/* Data Snippet */}
                          <div className="mt-1 ml-4 border-l border-[#1A1B1E] pl-3 py-1 opacity-60">
                             <span className="text-[10px] text-[#D2A8FF] font-mono select-all tracking-tighter">
                               &quot;+{card.phone}&quot;
                             </span>
                          </div>

                          {/* Side Glow */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] opacity-40 ${col.color.replace('text-', 'bg-')} ${col.glow}`} />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Picker Drawer (GLASSMOPRHISM) */}
      <Drawer.Root open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
          <Drawer.Content className="bg-[#0D0D0D] border-t border-[#1A1B1E] rounded-t-xl fixed bottom-0 left-0 right-0 z-[70] outline-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-[#26282B] my-4" />
            <div className="px-6 pb-10">
              <div className="flex items-center gap-2 mb-6">
                <Terminal size={14} className="text-[#4A4D54]" />
                <Drawer.Title className="font-mono text-[10px] text-[#4A4D54] uppercase tracking-widest font-bold">
                  Command::Execute_Transition
                </Drawer.Title>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">{selectedCard?.name}</h3>
                <div className="text-[#4A4D54] text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                  Current_State:: <span className="text-amber-500">{selectedCard?.status}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2.5">
                {/* DEEP LINK COMMAND */}
                <button
                  onClick={() => router.push(`/auditoria-ia?select=${selectedCard.id}`)}
                  className="flex items-center justify-between p-4 rounded-sm transition-all border bg-purple-500/10 border-purple-500/30 text-purple-400 mb-2 hover:bg-purple-500/20"
                >
                  <div className="flex items-center gap-4">
                    <Terminal size={14} className="text-purple-400" />
                    <span className="font-bold text-[11px] uppercase tracking-widest">EXEC::VIEW_CONVERSATION</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
               {(selectedCard?.status === 'LIQUIDADO' || selectedCard?.status === 'CANCELADO') && (
                 <button
                   onClick={async (e) => {
                     e.stopPropagation();
                     if (!confirm('¿Archivar este lead y mover a La Bóveda?')) return;
                     try {
                       const res = await fetch(`/api/kanban/archive/${selectedCard.id}`, { 
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ deal_notes: 'Archivado desde móvil' })
                       });
                       if (res.ok) {
                         onUpdateStatus(selectedCard.id, selectedCard.status); // Trigger refresh
                         setSelectedCard(null);
                       }
                     } catch (err) {
                       console.error('Error archiving:', err);
                     }
                   }}
                   className="flex items-center justify-between p-4 rounded-sm border bg-red-500/10 border-red-500/30 text-red-400 mb-2 active:bg-red-500/20 transition-all"
                 >
                   <div className="flex items-center gap-4">
                     <Archive size={14} className="text-red-400" />
                     <span className="font-bold text-[11px] uppercase tracking-widest">EXEC::ARCHIVE_TO_VAULT</span>
                   </div>
                   <ChevronRight size={14} />
                 </button>
               )}

                 <div className="h-px bg-[#1A1B1E] my-2" />
                {COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onUpdateStatus(selectedCard.id, col.id);
                      setSelectedCard(null);
                    }}
                    className={`flex items-center justify-between p-4 rounded-sm transition-all border ${
                      selectedCard?.status === col.id 
                        ? 'bg-[#1A1B1E]/50 border-white/10 text-white' 
                        : 'bg-[#080808] border-[#1A1B1E] text-[#4A4D54] hover:border-[#26282B] hover:text-[#8A8F98]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <col.icon className={`w-4 h-4 ${selectedCard?.status === col.id ? 'text-[#00FF41]' : col.color}`} />
                      <span className="font-bold text-[11px] uppercase tracking-widest">EXEC::{col.name}</span>
                    </div>
                    {selectedCard?.status === col.id && (
                       <span className="text-[8px] font-black bg-[#00FF41] text-black px-1.5 py-0.5 rounded-sm">ACTIVE</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
