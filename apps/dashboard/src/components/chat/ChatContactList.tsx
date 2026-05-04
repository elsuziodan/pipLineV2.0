import { useState, useMemo } from "react";
import { Pause, Play, Database, FileText, Hash, Search, Filter } from "lucide-react";
import { normalizePhone, formatRelativeTime } from "./utils";

export function ChatContactList({ 
  contacts, 
  liveMessages, 
  selectedContact, 
  onSelect,
  botPaused,
  connected,
  onCommand,
  onExportLeads,
  loading,
  lastReadRef
}: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");

  const filteredContacts = useMemo(() => {
    const contactMap = new Map<string, { id: string; dbId: string; name: string; status: string; isLead: boolean; timestamp: number }>();
    
    contacts.forEach((c: any) => {
      const rawPhone = c.phone || '';
      const norm = normalizePhone(rawPhone);
      if (!norm) return;
      const wsId = rawPhone.length === 10 ? `521${rawPhone}` : rawPhone;
      contactMap.set(norm, {
        id: wsId, 
        dbId: c.id, 
        name: c.name || rawPhone || 'Unknown', 
        status: c.status || c.metadata?.bot_status || 'Archived', 
        isLead: c.status === 'FINAL_REPLY' || c.metadata?.bot_status === 'FINAL_REPLY',
        timestamp: c.metadata?.last_activity ? new Date(c.metadata.last_activity).getTime() : new Date(c.created_at || 0).getTime(),
      });
    });

    const livePhones = Array.from(new Set(liveMessages.map((m: any) => m.phone).filter(Boolean)));
    livePhones.forEach((phone: any) => {
      const norm = normalizePhone(phone);
      if (contactMap.has(norm)) {
        const existing = contactMap.get(norm)!;
        const latestMsg = [...liveMessages].reverse().find((m: any) => normalizePhone(m.phone) === norm);
        if (latestMsg) {
          const msgTime = new Date(latestMsg.timestamp).getTime();
          if (msgTime > existing.timestamp) existing.timestamp = msgTime;
          if (existing.name === existing.id || existing.name === 'Unknown') existing.name = latestMsg.name || existing.name;
        }
      } else {
        const msg = liveMessages.find((m: any) => m.phone === phone);
        contactMap.set(norm, { 
            id: phone, 
            dbId: phone, 
            name: msg?.name || phone, 
            status: 'Active', 
            isLead: false, 
            timestamp: new Date(msg?.timestamp || 0).getTime() 
        });
      }
    });

    const rawContacts = Array.from(contactMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    
    return rawContacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.id.includes(searchQuery)
    ).filter(c => {
      if (activeFilter === 'Todos') return true;
      if (activeFilter === 'Leads') return c.isLead;
      if (activeFilter === 'Activos') return ['SENT_GREETING', 'SENT_PROPOSAL', 'SENT_CLIMAX'].includes(contacts.find((ac: any) => ac.id === c.dbId)?.metadata?.bot_status);
      if (activeFilter === 'Pendientes') return (contacts.find((ac: any) => ac.id === c.dbId)?.tags || []).includes('pendiente');
      if (activeFilter === 'Rechazados') return contacts.find((ac: any) => ac.id === c.dbId)?.metadata?.bot_status === 'REJECTED';
      return true;
    });
  }, [contacts, liveMessages, searchQuery, activeFilter]);

  return (
    <div className="flex flex-col h-full bg-[#080808] font-mono border-r border-[#1A1B1E]">
      {/* Explorer Header with Engine Controls */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#1A1B1E] bg-[#0A0A0A]">
        <div className="flex items-center gap-3">
           <span className="text-[10px] text-[#4A4D54] uppercase tracking-widest font-bold hidden xl:inline">Explorer</span>
           <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1A1B1E] px-2 py-1 rounded">
             <span className="text-[9px] text-[#4A4D54] font-bold">ENGINE::{botPaused ? 'HALTED' : 'RUNNING'}</span>
             <div className="flex gap-1 ml-1 border-l border-[#1A1B1E] pl-2">
                <button onClick={() => onCommand(botPaused ? 'RESUME_BOT' : 'STOP_BOT')} className={`p-1 rounded hover:bg-[#1A1B1E] transition-colors ${botPaused ? 'text-[#00FF41]' : 'text-amber-500'}`}>
                  {botPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
                </button>
                <button onClick={() => onCommand('STOP_ALL')} className="p-1 rounded hover:bg-[#1A1B1E] transition-colors text-red-500">
                  <div className="w-2 h-2 bg-current rounded-sm" />
                </button>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onExportLeads} className="text-[#4A4D54] hover:text-[#E1E2E4] transition-colors" title="Export CSV">
            <Database size={12} />
          </button>
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${connected ? 'bg-[#00FF41] text-[#00FF41]' : 'bg-red-500 text-red-500 animate-pulse'}`} />
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2">
        <div className="relative flex items-center bg-[#0D0D0D] border border-[#1A1B1E] rounded px-2 py-1.5 focus-within:border-[#4A4D54] transition-all">
          <Search size={12} className="text-[#4A4D54] mr-2" />
          <input 
            type="text" 
            placeholder="search_module..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-transparent text-[#E1E2E4] placeholder-[#4A4D54] outline-none text-[11px]" 
          />
        </div>
      </div>

      {/* Filters (File Tags) */}
      <div className="flex gap-1 px-3 py-1 overflow-x-auto scrollbar-hide mb-2">
        {['Todos', 'Leads', 'Activos', 'Rechazados'].map(f => {
          let activeColorClass = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
          if (f === 'Leads') activeColorClass = 'bg-amber-500/10 border-amber-500/30 text-amber-500';
          if (f === 'Activos') activeColorClass = 'bg-sky-500/10 border-sky-500/30 text-sky-400';
          if (f === 'Rechazados') activeColorClass = 'bg-red-500/10 border-red-500/30 text-red-500';

          return (
            <button 
              key={f} 
              onClick={() => setActiveFilter(f)} 
              className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-tighter border transition-all ${
                activeFilter === f 
                  ? activeColorClass
                  : 'bg-transparent border-transparent text-[#4A4D54] hover:text-[#8A8F98]'
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>



      {/* Contact List (File List) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1A1B1E]/30">
        {loading && (
          <div className="p-4 flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-[#1A1B1E] animate-pulse rounded w-3/4" />)}
          </div>
        )}
        
        {filteredContacts.map(c => {
          const isSelected = selectedContact === c.id;
          const lastRead = lastReadRef?.current?.get(c.id) || 0;
          const unread = liveMessages.filter((m: any) => 
            m.direction === 'IN' && 
            normalizePhone(m.phone) === normalizePhone(c.id) && 
            new Date(m.timestamp).getTime() > lastRead
          ).length;

          const lastLive = [...liveMessages].reverse().find((m: any) => normalizePhone(m.phone) === normalizePhone(c.id));
          const lastText = lastLive ? lastLive.text : c.status;
          
          // Determine status color
          const statusLower = c.status.toLowerCase();
          let statusColor = 'text-[#4A4D54]';
          let iconColor = 'text-[#4A4D54]';
          
          if (statusLower.includes('liquidado')) { statusColor = 'text-[#00FF41]'; iconColor = 'text-[#00FF41]'; }
          else if (statusLower.includes('cancelado') || statusLower.includes('rejected')) { statusColor = 'text-red-500'; iconColor = 'text-red-500'; }
          else if (statusLower.includes('fabrica') || statusLower.includes('contactado')) { statusColor = 'text-fuchsia-400'; iconColor = 'text-fuchsia-400'; }
          else if (statusLower.includes('cobranza') || c.isLead) { statusColor = 'text-amber-400'; iconColor = 'text-amber-400'; }
          else if (statusLower.includes('prospecto')) { statusColor = 'text-sky-400'; iconColor = 'text-sky-400'; }
          else if (statusLower.includes('active') || statusLower.includes('sent_')) { statusColor = 'text-cyan-400'; iconColor = 'text-cyan-400'; }

          return (
            <div 
              key={c.id} 
              onClick={() => onSelect(c.id)} 
              className={`group flex flex-col gap-0.5 px-4 py-3 cursor-pointer transition-all relative ${
                isSelected 
                  ? 'bg-gradient-to-r from-[#00FF41]/10 to-transparent border-l-2 border-l-[#00FF41]' 
                  : 'hover:bg-[#0D0D0D] border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={12} className={isSelected ? 'text-[#00FF41]' : iconColor} />
                  <span className={`text-[12px] truncate font-bold ${isSelected ? 'text-[#E1E2E4]' : 'text-[#8A8F98] group-hover:text-[#E1E2E4]'}`}>
                    {c.isLead ? 'lead::' : 'obj::'}{c.name.toLowerCase().replace(/\s+/g, '_')}.sh
                  </span>
                </div>
                <span className="text-[8px] text-[#4A4D54] uppercase shrink-0">
                  {formatRelativeTime(c.timestamp)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-[10px] truncate italic ${isSelected ? 'text-[#8A8F98]' : statusColor}`}>
                  // {lastText.substring(0, 35)}...
                </span>
                {unread > 0 && (
                  <span className="bg-[#00FF41] text-black text-[8px] font-bold px-1 rounded-sm">
                    {unread}
                  </span>
                )}
              </div>

              {/* Status Glow for active selection */}
              {isSelected && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#00FF41] rounded-full blur-[4px] opacity-50" />
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1B1E; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
