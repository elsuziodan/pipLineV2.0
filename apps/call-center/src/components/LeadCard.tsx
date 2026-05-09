"use client";

import { Phone, MessageCircle, Star } from "lucide-react";
import type { Lead } from "@/lib/types";
import { getMetaStr, getMetaNum, getTierClass } from "@/lib/types";

interface LeadCardProps {
  lead: Lead;
  isActive: boolean;
  onClick: () => void;
  callOutcomes: string[];
}

const WA_TEMPLATE = `¡Hola! Soy Daniel de Seven Factor 👋
Hace un momento hablamos por teléfono sobre el diseño de su página web.
Le envío este mensaje para que tenga mi contacto directo.`;

export function LeadCard({ lead, isActive, onClick, callOutcomes }: LeadCardProps) {
  const tier = getMetaStr(lead, "prospect_tier");
  const rating = getMetaNum(lead, "rating");
  const reviewCount = getMetaNum(lead, "review_count");
  const city = getMetaStr(lead, "city");
  const category = getMetaStr(lead, "google_category");

  // Status indicator color
  const getIndicatorColor = () => {
    if (callOutcomes.includes("interesado")) return "var(--color-success)";
    if (callOutcomes.length > 0) return "var(--color-accent-blue)";
    if (lead.follow_up_date) return "var(--color-warning)";
    return "var(--color-neutral)";
  };

  const phone = lead.phone?.replace(/\D/g, "") || "";
  const waLink = `https://wa.me/52${phone}?text=${encodeURIComponent(WA_TEMPLATE)}`;

  return (
    <div
      className={`lead-row ${isActive ? "lead-row-active" : ""}`}
      onClick={onClick}
    >
      {/* Status indicator bar */}
      <div
        style={{
          width: 3,
          height: 36,
          borderRadius: 2,
          background: getIndicatorColor(),
          flexShrink: 0,
        }}
      />

      {/* Lead info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-display truncate"
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            {lead.name}
          </span>
          {tier && (
            <span className={`pill ${getTierClass(tier)}`}>
              {tier.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
          <span
            className="truncate"
            style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
          >
            {[city, category].filter(Boolean).join(" · ") || "Sin datos"}
          </span>
          {rating > 0 && (
            <span
              className="flex items-center gap-1 shrink-0"
              style={{ fontSize: 12 }}
            >
              <Star size={11} fill="#FFB800" color="#FFB800" />
              <span style={{ color: "#FFB800" }}>{rating}</span>
              {reviewCount > 0 && (
                <span style={{ color: "var(--color-text-tertiary)" }}>
                  ({reviewCount})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`tel:+52${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center transition-all"
          title="Llamar"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(76,111,255,0.12)",
            border: "1px solid rgba(76,111,255,0.25)",
            color: "var(--color-accent-blue)",
          }}
        >
          <Phone size={16} />
        </a>
        <a
          href={waLink}
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center transition-all"
          title="WhatsApp"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(37,211,102,0.12)",
            border: "1px solid rgba(37,211,102,0.25)",
            color: "#25D366",
          }}
        >
          <MessageCircle size={16} />
        </a>
      </div>
    </div>
  );
}
