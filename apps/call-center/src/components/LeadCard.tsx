"use client";

import { Phone, MessageCircle, Star } from "lucide-react";
import type { Lead } from "@/lib/types";
import { getMetaStr, getMetaNum, getTierClass, normalizePhone } from "@/lib/types";

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

  const phoneInfo = normalizePhone(lead.phone);
  const waLink = phoneInfo.waLinkBase ? `https://wa.me/${phoneInfo.waLinkBase}?text=${encodeURIComponent(WA_TEMPLATE)}` : '#';

  return (
    <div
      className={`group flex items-center p-4 rounded-2xl border transition-all duration-300 cursor-pointer gap-3 mb-2 ${
        isActive 
          ? "bg-white border-[var(--color-accent-aqua)] shadow-[var(--shadow-glow-aqua)] transform scale-[1.01]" 
          : "bg-white/60 border-[var(--color-border)] hover:bg-white hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5"
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div 
        className="flex items-center justify-center rounded-xl shrink-0 font-display font-bold text-sm"
        style={{
          width: 42,
          height: 42,
          background: isActive ? "var(--color-accent-aqua)" : "var(--color-bg-hover)",
          color: isActive ? "white" : "var(--color-text-secondary)",
          transition: "all 0.3s ease"
        }}
      >
        {lead.name.substring(0, 2).toUpperCase()}
      </div>

      {/* Lead info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-display truncate"
            style={{ fontSize: 16, fontWeight: 700, color: isActive ? "var(--color-text-primary)" : "var(--color-text-primary)" }}
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
              <Star size={11} fill="var(--color-text-tertiary)" color="var(--color-text-tertiary)" />
              <span style={{ color: "var(--color-text-secondary)" }}>{rating}</span>
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
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={phoneInfo.linkBase ? `tel:+${phoneInfo.linkBase}` : '#'}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center transition-all hover:bg-[var(--color-bg-hover)]"
          title="Llamar"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            color: "var(--color-text-tertiary)",
          }}
        >
          <Phone size={14} />
        </a>
        <a
          href={waLink}
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center transition-all hover:bg-[var(--color-bg-hover)]"
          title="WhatsApp"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            color: "var(--color-text-tertiary)",
          }}
        >
          <MessageCircle size={14} />
        </a>
      </div>
    </div>
  );
}
