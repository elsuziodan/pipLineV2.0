"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Call } from "@/lib/types";

interface CallHistoryProps {
  clientId: string;
  refreshKey: number;
}

const OUTCOME_ICONS: Record<string, string> = {
  interesado: "🟢",
  seguimiento: "🟡",
  no_interesado: "🔴",
  no_contesta: "📵",
  equivocado: "❌",
};

const OUTCOME_LABELS: Record<string, string> = {
  interesado: "Interesado",
  seguimiento: "Seguimiento",
  no_interesado: "No interesado",
  no_contesta: "No contestó",
  equivocado: "Equivocado",
};

export function CallHistory({ clientId, refreshKey }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`/api/calls?client_id=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        setCalls(data.calls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId, refreshKey]);

  if (calls.length === 0 && !loading) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="section-title w-full"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}
      >
        <span>Historial ({calls.length})</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="flex flex-col gap-2 animate-fadeIn" style={{ marginTop: 4 }}>
          {loading ? (
            <div className="loading-shimmer" style={{ height: 40 }} />
          ) : (
            calls.map((call) => {
              const date = new Date(call.created_at);
              const dateStr = date.toLocaleDateString("es-MX", {
                month: "short",
                day: "numeric",
              });
              const icon = OUTCOME_ICONS[call.outcome || ""] || "📞";
              const label = OUTCOME_LABELS[call.outcome || ""] || call.type || "Llamada";

              return (
                <div
                  key={call.id}
                  className="flex items-start gap-3"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-bg-deep)",
                  }}
                >
                  <span
                    className="font-data shrink-0"
                    style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}
                  >
                    {dateStr}
                  </span>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
                    {call.notes && (
                      <p
                        className="truncate"
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                          marginTop: 2,
                          lineHeight: 1.3,
                        }}
                      >
                        {call.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
