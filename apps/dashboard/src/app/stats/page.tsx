"use client";

import { useState, useEffect } from "react";
import { usePipelineWS } from "@/hooks/usePipelineWS";

export default function StatsPage() {
  const { state } = usePipelineWS();
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState({
    backend: 'UNKNOWN',
    ngrok: 'UNKNOWN',
    websocket: 'UNKNOWN'
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      
      if (!res.ok) {
        console.warn('[Stats] Backend response not OK');
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn('[Stats] Response is not JSON');
        return;
      }

      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('[Stats] Error fetching stats:', e);
    }
  };

  const checkHealth = async () => {
    // Backend Check
    try {
      const res = await fetch('/api/stats', { 
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const isOnline = res.ok;
      setHealth(prev => ({ 
        ...prev, 
        backend: isOnline ? 'ONLINE' : 'OFFLINE',
        ngrok: isOnline ? 'ACTIVE' : 'OFFLINE'
      }));
    } catch {
      setHealth(prev => ({ ...prev, backend: 'OFFLINE', ngrok: 'OFFLINE' }));
    }
  };

  useEffect(() => {
    fetchStats();
    checkHealth();
    const statsInterval = setInterval(fetchStats, 30000);
    const healthInterval = setInterval(checkHealth, 15000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(healthInterval);
    };
  }, []);

  useEffect(() => {
    setHealth(prev => ({ ...prev, websocket: state.connected ? 'CONNECTED' : 'DISCONNECTED' }));
  }, [state.connected]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto pb-20 font-mono select-none">
      {/* Console Header */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1B1E] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
          </div>
          <div className="flex flex-col ml-2">
            <span className="text-[10px] text-[#4A4D54] leading-none uppercase tracking-widest font-bold">System_Monitor</span>
            <span className="text-[11px] text-[#E1E2E4] mt-0.5">performance_report.sh</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1A1B1E] px-2 py-1 rounded border border-[#26282B]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-green-500 font-bold tracking-tighter uppercase">Polling_Active</span>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* BLOQUE 1: Agent::Pulse */}
        <section>
          <h2 className="text-[#4A4D54] uppercase tracking-[0.3em] text-[10px] font-bold mb-3">Agent::Pulse_Activity</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm">
              <div className="text-[9px] text-[#00FF41] mb-1 font-bold tracking-widest">BOT_OUT_TODAY</div>
              <div className="text-3xl text-white font-bold tracking-tighter">{stats?.agents?.bot_messages_today || 0}</div>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm">
              <div className="text-[9px] text-[#79C0FF] mb-1 font-bold tracking-widest">USR_IN_TODAY</div>
              <div className="text-3xl text-white font-bold tracking-tighter">{stats?.agents?.user_messages_today || 0}</div>
            </div>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[9px] text-amber-500 mb-1 font-bold tracking-widest">ACTIVE_THREADS_24H</div>
                <div className="text-3xl text-white font-bold tracking-tighter">{stats?.agents?.active_conversations || 0}</div>
              </div>
              <div className="text-[10px] text-[#4A4D54] opacity-50 mb-1">
                CRC32::ACTIVE
              </div>
            </div>
          </div>
        </section>

        {/* BLOQUE 2: Pipeline::Funnel */}
        <section>
          <h2 className="text-[#4A4D54] uppercase tracking-[0.3em] text-[10px] font-bold mb-3">Pipeline::Funnel_State</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'PROS', key: 'prospecto', color: 'text-sky-400' },
              { label: 'FABR', key: 'FABRICA', color: 'text-zinc-400' },
              { label: 'COBR', key: 'COBRANZA', color: 'text-amber-500' },
              { label: 'LIQD', key: 'LIQUIDADO', color: 'text-[#5E6AD2]' },
            ].map(col => (
              <div key={col.key} className="bg-[#0D0D0D] border border-[#1A1B1E] p-3 text-center rounded-sm">
                <div className={`text-[18px] font-bold ${col.color}`}>{stats?.pipeline?.[col.key] || 0}</div>
                <div className="text-[8px] text-[#4A4D54] mt-1 font-bold tracking-widest">{col.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#16181D] border border-[#26282B] p-3 rounded-sm flex justify-between items-center px-4">
             <span className="text-[10px] text-[#8A8F98] uppercase tracking-widest font-bold">New_Entries_Today</span>
             <span className="text-white font-bold text-sm">{stats?.new_leads_today || 0}</span>
          </div>
        </section>

        {/* BLOQUE 3: System::Health */}
        <section>
          <h2 className="text-[#4A4D54] uppercase tracking-[0.3em] text-[10px] font-bold mb-3">System::Health_Diagnostics</h2>
          <div className="bg-[#0D0D0D] border border-[#1A1B1E] rounded-sm divide-y divide-[#1A1B1E]">
            {[
              { name: 'Backend_API', status: health.backend },
              { name: 'WebSocket_Stream', status: health.websocket },
              { name: 'Ngrok_Tunnel', status: health.ngrok },
            ].map(svc => (
              <div key={svc.name} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${svc.status === 'ONLINE' || svc.status === 'CONNECTED' || svc.status === 'ACTIVE' ? 'bg-[#00FF41]' : svc.status === 'UNKNOWN' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-[11px] text-[#E1E2E4] font-bold">{svc.name}</span>
                </div>
                <span className={`text-[9px] font-bold tracking-widest ${svc.status === 'ONLINE' || svc.status === 'CONNECTED' || svc.status === 'ACTIVE' ? 'text-[#00FF41]' : svc.status === 'UNKNOWN' ? 'text-amber-500' : 'text-red-500'}`}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>

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
