"use client";

import { useState } from "react";
import type { Lead, OutcomeType } from "@/lib/types";
import { toast } from "@/components/Toaster";

interface CallLoggerProps {
  lead: Lead;
  onSaved: () => void;
}

const OUTCOMES: { key: OutcomeType; label: string; emoji: string; className: string }[] = [
  { key: "interesado", label: "Le interesó", emoji: "🟢", className: "outcome-interested" },
  { key: "seguimiento", label: "Volver a llamar", emoji: "🟡", className: "outcome-callback" },
  { key: "no_interesado", label: "No", emoji: "🔴", className: "outcome-rejected" },
  { key: "no_contesta", label: "No contestó", emoji: "📵", className: "outcome-noanswer" },
  { key: "equivocado", label: "Equivocado", emoji: "❌", className: "outcome-noanswer" },
];

export function CallLogger({ lead, onSaved }: CallLoggerProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!selectedOutcome) return;

    setSaving(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: lead.id,
          outcome: selectedOutcome,
          notes,
          follow_up_at: selectedOutcome === "seguimiento" && followUpDate
            ? new Date(followUpDate).toISOString()
            : null,
        }),
      });

      if (res.ok) {
        setSaved(true);
        toast.success("Llamada guardada correctamente");
        setTimeout(() => {
          setSaved(false);
          setSelectedOutcome(null);
          setNotes("");
          setFollowUpDate("");
          onSaved();
        }, 2000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Error al guardar la llamada");
      }
    } catch (err) {
      console.error("Error saving call:", err);
      toast.error("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        paddingTop: 16,
        marginTop: 16,
      }}
    >
      <div className="section-title">
        <span>Registrar Resultado</span>
      </div>

      {/* Outcome pills */}
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            className={`outcome-pill ${o.className}`}
            data-active={selectedOutcome === o.key ? "true" : undefined}
            onClick={() => setSelectedOutcome(o.key)}
            style={{ fontSize: 12, padding: "6px 14px" }}
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      <textarea
        className="textarea-field"
        placeholder="Notas de la llamada (opcional)..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ marginTop: 12, minHeight: 50 }}
      />

      {/* Follow-up date (only for 'seguimiento') */}
      {selectedOutcome === "seguimiento" && (
        <div className="animate-fadeIn" style={{ marginTop: 8 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-secondary)",
              display: "block",
              marginBottom: 4,
            }}
          >
            📅 Agendar seguimiento
          </label>
          <input
            type="datetime-local"
            className="input-field"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
      )}

      {/* Save button */}
      <button
        className="btn-call w-full"
        style={{
          marginTop: 12,
          padding: "10px 20px",
          background: saved
            ? "linear-gradient(135deg, #00FF88, #00D9A6)"
            : undefined,
        }}
        disabled={!selectedOutcome || saving}
        onClick={handleSave}
      >
        {saving ? "Guardando..." : saved ? "✅ Guardado" : "GUARDAR"}
      </button>
    </div>
  );
}
