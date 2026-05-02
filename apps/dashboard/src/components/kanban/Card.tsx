"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Globe, Download, Bell, FileCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CardProps {
  card: any;
}

export function Card({ card }: CardProps) {
  const [isDeploying, setIsDeploying] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const daysElapsed = card.board_moved_at 
    ? Math.floor((Date.now() - new Date(card.board_moved_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const showTimer = card.status === 'COBRANZA';

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // 1. Obtener datos completos del cliente desde el backend
      const clientRes = await fetch(`/api/client/${card.id}`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!clientRes.ok) throw new Error('No se pudo obtener datos del cliente');
      const clientData = await clientRes.json();

      // 2. Construir rawData rico para la IA
      const rawData = [
        `Nombre del negocio: ${clientData.name || card.name}`,
        `Teléfono / WhatsApp: ${clientData.phone || ''}`,
        `Dirección: ${clientData.address || ''}`,
        `Categoría: ${clientData.metadata?.google_category || ''}`,
        `Rating Google: ${clientData.metadata?.rating || ''}`,
        `Reseñas: ${clientData.metadata?.review_count || ''}`,
        `Sitio web: ${clientData.metadata?.website_url || ''}`,
        `URL de Google Maps: ${clientData.metadata?.listing_url || ''}`,
      ].filter(line => line.split(': ')[1]).join('\n');

      // 3. Enviar a la API de deploy CON rawData
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: card.id, clientName: card.name, rawData })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en el deploy');
      // Open the deployed landing page directly in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      alert(`Fallo la generación: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const shortId = card.id ? String(card.id).substring(0, 4).toLowerCase() : 'xxx';

  // Determine Diff styling
  const isDelayed = showTimer && daysElapsed >= 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-[#18191B] border border-white/[0.05] rounded-lg overflow-hidden flex flex-col shadow-sm transition-all duration-200",
        isDelayed ? "border-l-[3px] border-l-[#F85149] bg-[#F85149]/[0.02]" : "border-l-[3px] border-l-transparent",
        isDragging && "opacity-80 scale-[0.98] shadow-2xl z-50 border-white/[0.15]"
      )}
    >
      {/* Drag Handle Area */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing z-0" />

      {/* Header: Minimal Mono ID & Integrated Actions */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.03] bg-black/20">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 pointer-events-none">
          <FileCode className="w-3 h-3 opacity-70" />
          <span>lead-{shortId}</span>
        </div>

        {/* Integrated Actions */}
        <div className="flex items-center gap-0.5 z-20 pointer-events-auto">
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className={cn(
              "p-1 rounded hover:bg-white/10 text-blue-400 transition-colors",
              isDeploying && "opacity-50 cursor-not-allowed text-blue-400"
            )} 
            title="Deploy Landing"
          >
            {isDeploying ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
          </button>
          <button className="p-1 rounded hover:bg-white/10 text-emerald-400 transition-colors" title="Extract Data">
            <Download size={12} />
          </button>
          <button className="p-1 rounded hover:bg-white/10 text-amber-400 transition-colors" title="Set Reminder">
            <Bell size={12} />
          </button>
        </div>
      </div>

      {/* Content: Console Aesthetic */}
      <div className="p-3 flex flex-col gap-2 relative z-10 pointer-events-none">
        <h3 className="text-[11.5px] text-[#79C0FF] font-mono truncate">
          "{card.name}"
        </h3>
        
        <div className="flex items-center justify-between mt-0.5">
          <div className="font-mono text-[10px] text-[#D2A8FF] truncate">
            "{card.phone ? `+${card.phone}` : 'N/A'}"
          </div>
          
          {showTimer && (
            <div className={cn(
              "font-mono text-[10px] px-1.5 py-0.5 rounded border",
              isDelayed 
                ? "text-[#F85149] bg-[#F85149]/10 border-[#F85149]/20" 
                : "text-zinc-400 bg-white/5 border-white/10"
            )}>
              {daysElapsed}d wait
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
