"use client";

import { 
  Bot, 
  ArrowLeft, 
  Star, 
  MoreVertical, 
  MessageSquare 
} from "lucide-react";
import { getAvatarColor } from "./utils";

export function ChatHeader({ 
  client, 
  selectedContact, 
  onBack, 
  onToggleBot, 
  onToggleCrm, 
  onToggleLead,
  onShowProfile,
  isBotActive,
  isLead
}: any) {
  const displayName = client?.name || selectedContact || 'Desconocido';
  const hasTelegramBridge = !!(client?.metadata?.telegram_thread_id);
  const actualId = client?.id || selectedContact;

  return (
    <div className="h-14 bg-[#0D0D0D] border-b border-[#1A1B1E] relative px-4 flex items-center justify-between z-10 flex-shrink-0 font-mono">
      {/* Dynamic Gradient Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/20 to-transparent" />

      {/* Left: Console Branding & Client ID */}
      <div className="flex items-center gap-4 cursor-pointer" onClick={onShowProfile}>
        <ArrowLeft size={18} className="text-[#4A4D54] lg:hidden" onClick={(e) => { e.stopPropagation(); onBack(); }} />
        
        {/* Mac Window Controls (Visual Only) */}
        <div className="hidden sm:flex gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[#00FF41] text-[10px] font-bold opacity-70">AUDITOR_SH::</span>
            <span className="text-[#e9edef] text-[13px] font-bold truncate max-w-[120px] sm:max-w-[200px]">
              {displayName.toLowerCase().replace(/\s+/g, '_')}.obj
            </span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] text-[#4A4D54] uppercase tracking-tighter">
               ID::{actualId.toString().slice(-6)}
             </span>
             <div className="w-1 h-1 rounded-full bg-[#00FF41] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right: IDE Controls (Toggles) */}
      <div className="flex items-center gap-3 sm:gap-6 text-[#4A4D54] flex-shrink-0">
        
        {/* Toggle: Bot IA (Run/Stop style) */}
        <div className="flex items-center gap-2" title={isBotActive ? "Sebastian::Running" : "Sebastian::Paused"}>
          <span className="text-[9px] font-bold uppercase hidden xs:inline tracking-widest">Bot_Engine</span>
          <button
            onClick={() => onToggleBot(actualId, !isBotActive)}
            className={`flex items-center justify-center p-1.5 rounded border transition-all ${
              isBotActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
                : 'bg-red-500/10 border-red-500/30 text-red-500 opacity-50'
            }`}
          >
            <Bot size={16} />
          </button>
        </div>

        {/* Toggle: Telegram Bridge (Cloud/Sync style) */}
        <div className="flex items-center gap-2" title={hasTelegramBridge ? "Sync::Active" : "Sync::Disconnected"}>
          <span className="text-[9px] font-bold uppercase hidden xs:inline tracking-widest">Bridge</span>
          <button
            onClick={() => onToggleCrm(actualId, !hasTelegramBridge)}
            className={`flex items-center justify-center p-1.5 rounded border transition-all ${
              hasTelegramBridge 
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.1)]' 
                : 'bg-[#1A1B1E] border-[#26282B] text-[#4A4D54]'
            }`}
          >
            <MessageSquare size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-[#1A1B1E] hidden sm:block" />

        {/* Lead Star */}
        <button 
          onClick={() => onToggleLead(actualId, !isLead)} 
          className={`cursor-pointer transition-all p-1.5 rounded border border-transparent hover:bg-[#1A1B1E] ${
            isLead ? 'text-amber-400' : 'text-[#4A4D54]'
          }`}
          title={isLead ? "State::Marked_Lead" : "State::Archive"}
        >
          <Star size={18} fill={isLead ? "currentColor" : "none"} />
        </button>

        <button className="p-1.5 hover:bg-[#1A1B1E] rounded transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}
