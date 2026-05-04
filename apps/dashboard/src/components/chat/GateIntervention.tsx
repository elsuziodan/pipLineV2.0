import { Bot, AlertTriangle, ShieldAlert } from "lucide-react";

export function GateIntervention({ gate, onReject, onApprove }: any) {
  if (!gate) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#080808]/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-xl bg-[#0D0D0D] border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.15)] rounded-sm overflow-hidden">
        {/* Console Alert Header */}
        <div className="p-6 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <ShieldAlert size={24} className="text-black" />
            </div>
            <div>
              <h2 className="text-amber-500 text-sm font-black uppercase tracking-[0.2em]">System::Gate_Protocol_Interruption</h2>
              <p className="text-[#4A4D54] text-[10px] mt-0.5 uppercase tracking-tighter">Instance_ID::{gate.id} • Auth_Required</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-amber-500 text-xl font-black">{gate.report?.score}</div>
             <div className="text-[8px] text-[#4A4D54] uppercase tracking-widest font-bold">Confidence_Score</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[#4A4D54] uppercase tracking-[0.3em] flex items-center gap-2">
              <Bot size={14} /> AI_Reasoning_Analysis
            </h4>
            <div className="p-5 bg-[#080808] border border-[#1A1B1E] rounded-sm">
              <p className="text-[12px] text-[#E1E2E4] leading-relaxed italic">
                &quot;{gate.report?.recommendation}&quot;
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onReject} 
              className="py-4 bg-transparent border border-[#1A1B1E] text-[#4A4D54] hover:text-red-500 hover:border-red-500/50 transition-all text-[11px] uppercase font-bold tracking-widest"
            >
              Abort::Reject
            </button>
            <button 
              onClick={onApprove} 
              className="py-4 bg-amber-500 text-black hover:bg-amber-400 transition-all text-[11px] uppercase font-bold tracking-widest shadow-[0_4px_15px_rgba(245,158,11,0.3)]"
            >
              Execute::Approve
            </button>
          </div>
        </div>

        {/* Footer Data */}
        <div className="px-8 py-3 bg-[#080808] border-t border-[#1A1B1E] flex justify-between">
           <span className="text-[8px] text-[#4A4D54] uppercase tracking-widest">Protocol_Type::AI_Confidence_Audit</span>
           <span className="text-[8px] text-[#4A4D54] uppercase tracking-widest">Checksum::OK</span>
        </div>
      </div>
    </div>
  );
}
