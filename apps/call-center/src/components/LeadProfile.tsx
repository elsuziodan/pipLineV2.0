"use client";

import { useState } from "react";
import {
  Phone,
  Globe,
  MapPin,
  Smartphone,
  Star,
  Search,
  ExternalLink,
} from "lucide-react";
import type { Lead } from "@/lib/types";
import {
  getMetaStr,
  getMetaNum,
  getMetaBool,
  getTierClass,
  getPitchClass,
} from "@/lib/types";
import { CallLogger } from "./CallLogger";
import { CallHistory } from "./CallHistory";
import { SalesScript } from "./SalesScript";
import { DeepResearch } from "./DeepResearch";

interface LeadProfileProps {
  lead: Lead | null;
  onCallSaved?: () => void;
}

export function LeadProfile({ lead, onCallSaved }: LeadProfileProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!lead) {
    return (
      <div
        className="card-elevated flex flex-col items-center justify-center gap-3 h-full"
        style={{ padding: 24, opacity: 0.5 }}
      >
        <Smartphone size={48} style={{ color: "var(--color-text-tertiary)" }} />
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Selecciona un lead de la cola
        </span>
      </div>
    );
  }

  const tier = getMetaStr(lead, "prospect_tier");
  const pitchFit = getMetaStr(lead, "pitch_fit");
  const rating = getMetaNum(lead, "rating");
  const reviewCount = getMetaNum(lead, "review_count");
  const category = getMetaStr(lead, "google_category");
  const websiteUrl = getMetaStr(lead, "website_url");
  const listingUrl = getMetaStr(lead, "listing_url");
  const hasWebsite = getMetaBool(lead, "has_website");
  const needsBetterWeb = getMetaBool(lead, "needs_better_web_presence");
  const websiteType = getMetaStr(lead, "website_structure_type");
  const city = getMetaStr(lead, "city");
  const services = lead.metadata?.services_detected;
  const servicesStr = Array.isArray(services)
    ? services.join(", ")
    : typeof services === "string"
      ? services
      : "";

  const phone = lead.phone?.replace(/\D/g, "") || "";
  const phoneDisplay = lead.phone || "Sin teléfono";

  const WA_TEMPLATE = `¡Hola! Soy Daniel de Seven Factor 👋\nHace un momento hablamos por teléfono sobre el diseño de su página web.\nLe envío este mensaje para que tenga mi contacto directo.`;
  const waLink = `https://wa.me/52${phone}?text=${encodeURIComponent(WA_TEMPLATE)}`;

  const handleCallSaved = () => {
    setRefreshKey((k) => k + 1);
    onCallSaved?.();
  };

  return (
    <div
      className="card-elevated h-full overflow-y-auto"
      style={{ padding: 24 }}
      key={lead.id}
    >
      <div className="animate-slideRight">
        {/* Header */}
        <h2
          className="font-display"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2 }}
        >
          {lead.name}
        </h2>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <div className="star-rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < Math.floor(rating) ? "#FFB800" : "none"}
                  color={i < Math.ceil(rating) ? "#FFB800" : "var(--color-text-tertiary)"}
                />
              ))}
            </div>
            <span className="font-data" style={{ fontSize: 13, color: "#FFB800" }}>
              {rating}
            </span>
            {reviewCount > 0 && (
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                ({reviewCount} reseñas)
              </span>
            )}
          </div>
        )}

        {/* Badges */}
        {(tier || pitchFit) && (
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
            {tier && <span className={`pill ${getTierClass(tier)}`}>{tier.toUpperCase()}</span>}
            {pitchFit && (
              <span className={`pill ${getPitchClass(pitchFit)}`}>
                PITCH: {pitchFit.toUpperCase()}
              </span>
            )}
          </div>
        )}

        <hr style={{ borderColor: "var(--color-border)", margin: "16px 0" }} />

        {/* Contact info */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Smartphone size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
            <span className="font-data flex-1" style={{ fontSize: 14 }}>{phoneDisplay}</span>
            <a href={`tel:+52${phone}`} className="btn-call" style={{ padding: "6px 12px", fontSize: 12 }}>
              <span className="flex items-center gap-1"><Phone size={12} /> Llamar</span>
            </a>
          </div>

          {websiteUrl && (
            <div className="flex items-center gap-3">
              <Globe size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
              <span className="flex-1 truncate" style={{ fontSize: 13, color: "var(--color-accent-cyan)" }}>
                {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
              <a
                href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener"
                className="btn-ghost flex items-center gap-1"
                style={{ padding: "6px 10px", fontSize: 11 }}
              >
                <ExternalLink size={11} /> Ver
              </a>
            </div>
          )}

          {(listingUrl || lead.address) && (
            <div className="flex items-center gap-3">
              <MapPin size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
              <span className="flex-1 truncate" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                {lead.address || city || "Ver en Maps"}
              </span>
              {listingUrl && (
                <a href={listingUrl} target="_blank" rel="noopener" className="btn-ghost flex items-center gap-1" style={{ padding: "6px 10px", fontSize: 11 }}>
                  <MapPin size={11} /> Maps
                </a>
              )}
            </div>
          )}
        </div>

        {/* Analysis */}
        {(category || servicesStr || websiteType) && (
          <>
            <div className="section-title" style={{ marginTop: 16 }}><span>Análisis</span></div>
            <div className="grid gap-y-2 gap-x-4" style={{ gridTemplateColumns: "auto 1fr", fontSize: 12 }}>
              {category && (
                <>
                  <span style={{ color: "var(--color-text-secondary)" }}>Categoría</span>
                  <span>{category}</span>
                </>
              )}
              {servicesStr && (
                <>
                  <span style={{ color: "var(--color-text-secondary)" }}>Servicios</span>
                  <span style={{ lineHeight: 1.4 }}>{servicesStr}</span>
                </>
              )}
              {websiteType && (
                <>
                  <span style={{ color: "var(--color-text-secondary)" }}>Tipo web</span>
                  <span>{websiteType}</span>
                </>
              )}
              <span style={{ color: "var(--color-text-secondary)" }}>¿Necesita web?</span>
              <span style={{ color: needsBetterWeb ? "var(--color-success)" : "var(--color-neutral)" }}>
                {needsBetterWeb ? "✅ Sí" : hasWebsite ? "Tiene web" : "Sin web"}
              </span>
            </div>
          </>
        )}

        {/* Deep Research + WhatsApp */}
        <div className="flex flex-col gap-2" style={{ marginTop: 16 }}>
          <DeepResearch
            clientId={lead.id}
            cachedData={lead.metadata?.deep_research as any}
          />
          <a
            href={waLink}
            target="_blank"
            rel="noopener"
            className="btn-whatsapp w-full flex items-center justify-center gap-2"
            style={{ textDecoration: "none" }}
          >
            💬 Enviar WhatsApp
          </a>
        </div>

        {/* Intake Form link */}
        <a
          href={`/intake/${lead.id}`}
          className="btn-ghost w-full flex items-center justify-center gap-2"
          style={{ marginTop: 8, textDecoration: "none", fontSize: 12 }}
        >
          📋 Abrir Intake Form
        </a>

        {/* Sales Script */}
        <SalesScript lead={lead} />

        {/* Call History */}
        <CallHistory clientId={lead.id} refreshKey={refreshKey} />

        {/* Quick-Log */}
        <CallLogger lead={lead} onSaved={handleCallSaved} />
      </div>
    </div>
  );
}
