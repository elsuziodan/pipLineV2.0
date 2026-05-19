"use client";

import { useState } from "react";
import { Lead } from "../lib/types";
import SpeechEngine from "./SpeechEngine";
import { Check, ArrowRight, X, RotateCcw } from "lucide-react";

interface ActiveLeadProps {
  lead: Lead;
  onClose: () => void;
  onSendToFactory: (leadId: string) => void;
  onArchive: (leadId: string) => void;
  onMessageCopied: (leadId: string) => void;
  onUnmark?: (leadId: string) => void;
  isContacted?: boolean;
}

export default function ActiveLead({ lead, onClose, onSendToFactory, onArchive, onMessageCopied, onUnmark, isContacted }: ActiveLeadProps) {
  const [confirmFactory, setConfirmFactory] = useState(false);
  const isFactory = lead.status === 'FABRICA';

  return (
    <div className="glass-panel p-5 flex flex-col gap-5">
      {/* Actions */}
      <div className="flex flex-col gap-2">
        <span className="font-body text-label font-semibold tracking-[0.18em] uppercase text-ink-muted">
          Acciones
        </span>

        <div className="flex flex-wrap gap-4 items-center">
          {isFactory ? (
            <span className="font-display-italic text-body text-ink-accent flex items-center gap-1.5">
              <Check className="w-4 h-4" /> En Fábrica
            </span>
          ) : confirmFactory ? (
            <div className="animate-fade-in flex items-center gap-3">
              <span className="font-body text-detail font-normal text-ink-soft">
                ¿Enviar a Fábrica?
              </span>
              <button
                onClick={() => setConfirmFactory(false)}
                className="font-body bg-transparent border-none py-1.5 cursor-pointer text-detail font-normal text-ink-muted hover:text-ink transition-colors"
              >
                No
              </button>
              <button
                onClick={() => onSendToFactory(lead.id)}
                className="font-display bg-transparent border-none py-1.5 cursor-pointer text-detail font-bold text-ink-accent tracking-[-0.01em] hover:opacity-80 transition-opacity"
              >
                Sí, enviar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmFactory(true)}
              className="font-display-italic bg-transparent border-none py-2 cursor-pointer text-body font-normal text-ink-soft text-left transition-colors flex items-center gap-1.5 hover:text-ink-accent group"
            >
              Enviar a Fábrica <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          <div className="w-[1px] h-4 bg-ink-muted opacity-20" />

          <button
            onClick={() => onArchive(lead.id)}
            className="font-body bg-transparent border-none py-2 cursor-pointer text-detail font-normal text-ink-muted transition-colors flex items-center gap-1.5 hover:text-ink"
          >
            Archivar <X className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Unmark button — only visible when contacted */}
          {isContacted && onUnmark && (
            <>
              <div className="w-[1px] h-4 bg-ink-muted opacity-20" />
              <button
                onClick={() => onUnmark(lead.id)}
                className="font-body bg-transparent border-none py-2 cursor-pointer text-detail font-light text-ink-muted transition-opacity opacity-60 flex items-center gap-1.5 hover:opacity-100 hover:text-ink"
              >
                Restaurar <RotateCcw className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      <SpeechEngine lead={lead} onMessageCopied={onMessageCopied} />
    </div>
  );
}
