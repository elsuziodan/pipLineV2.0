"use client";

import { usePipelineWS } from "@/hooks/usePipelineWS";
import { Loader2, Terminal, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PipelineStatusStrip() {
  const { state } = usePipelineWS();
  
  // Solo mostramos la barra si el pipeline NO está en estado IDLE, STOPPED, o COMPLETED
  // o si tenemos datos activos del scraper.
  const isRunning = state.status !== 'IDLE' && state.status !== 'STOPPED' && state.status !== 'COMPLETED';
  const showScraper = !!state.scraper;

  if (!isRunning && !showScraper) {
    return null; // Ocultar si no hay actividad
  }

  // Cálculos de progreso
  const current = state.scraper?.current || 0;
  const total = state.scraper?.total || 1;
  const percentage = Math.round((current / total) * 100) || 0;
  const batchCurrent = state.scraper?.batchCurrent;
  const batchTotal = state.scraper?.batchTotal;

  return (
    <div className="w-full bg-[#080808] border-b border-[#26282B] flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-500">
      
      {/* Lado izquierdo: Estado y Ciudad */}
      <div className="flex items-center gap-3 mb-2 md:mb-0">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#00FF41] animate-spin" />
          <span className="text-[11px] font-mono text-[#00FF41] tracking-wider font-bold">
            SCRAPING
          </span>
        </div>
        
        <ChevronRight className="w-3 h-3 text-zinc-600" />
        
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <span className="text-[13px] font-semibold text-zinc-100">
            {state.scraper?.city || 'Iniciando...'}
          </span>
          {batchTotal && batchCurrent && (
            <span className="text-[11px] font-mono text-zinc-500 bg-white/[0.05] px-2 py-0.5 rounded-sm">
              LOTE {batchCurrent}/{batchTotal}
            </span>
          )}
        </div>
      </div>

      {/* Lado derecho: Progreso del keyword actual */}
      {showScraper && (
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Info del Keyword */}
          <div className="flex flex-col items-start md:items-end flex-1 md:flex-none">
            <span className="text-[11px] text-zinc-400 max-w-[150px] md:max-w-[200px] truncate">
              {state.scraper.keyword}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Leads encontrados: {state.scraper.found || 0}
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="flex items-center gap-3 flex-1 md:flex-none min-w-[120px]">
            <div className="h-1.5 w-full md:w-32 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.4)] transition-all duration-300 ease-out" 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-zinc-300 min-w-[35px] text-right">
              {percentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
