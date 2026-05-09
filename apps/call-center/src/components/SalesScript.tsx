"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Lead } from "@/lib/types";
import { getMetaStr, getMetaNum, getMetaBool } from "@/lib/types";

interface SalesScriptProps {
  lead: Lead;
}

interface ScriptBlock {
  label: string;
  text: string;
}

function generateScript(lead: Lead): ScriptBlock[] {
  const name = lead.name || "su negocio";
  const rating = getMetaNum(lead, "rating");
  const reviews = getMetaNum(lead, "review_count");
  const hasWeb = getMetaBool(lead, "has_website");
  const webUrl = getMetaStr(lead, "website_url");
  const category = getMetaStr(lead, "google_category");

  const blocks: ScriptBlock[] = [];

  // Opener
  blocks.push({
    label: "🎯 Apertura",
    text: `"Buenas tardes, ¿hablo con el encargado de ${name}?"`,
  });

  // Hook - conditional
  if (rating > 0 && reviews > 10) {
    blocks.push({
      label: "🪝 Gancho",
      text: `"Le llamo porque estuve revisando su negocio en Google Maps y vi que tiene ${reviews} reseñas con ${rating} estrellas — eso es excelente. Pero noté que ${
        hasWeb
          ? `su página web actual se podría mejorar mucho para convertir esas búsquedas en clientes reales...`
          : `aún no tienen una página web donde sus clientes puedan ver sus trabajos y contactarlos fácilmente...`
      }"`,
    });
  } else {
    blocks.push({
      label: "🪝 Gancho",
      text: `"Le llamo porque estuve revisando negocios de ${category || "su ramo"} en la zona y noté que ${
        hasWeb
          ? `su página actual podría mejorarse para atraer más clientes...`
          : `no cuentan con una página web profesional, y hoy en día eso es como no existir para muchos clientes...`
      }"`,
    });
  }

  // Proposal
  blocks.push({
    label: "💡 Propuesta",
    text: `"Nosotros nos dedicamos a hacer páginas web profesionales para negocios como el suyo. Le diseñamos una página moderna y atractiva a un precio muy accesible. Sin compromisos, podemos platicar los detalles."`,
  });

  // Close
  blocks.push({
    label: "🎯 Cierre",
    text: `"¿Le gustaría que le explique cómo funciona? Son solo 5 minutos."`,
  });

  return blocks;
}

export function SalesScript({ lead }: SalesScriptProps) {
  const [open, setOpen] = useState(false);
  const blocks = generateScript(lead);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="section-title w-full"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}
      >
        <span>Guion Sugerido</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div
          className="animate-fadeIn"
          style={{
            marginTop: 4,
            padding: 16,
            background: "var(--color-bg-deep)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex flex-col gap-4">
            {blocks.map((block, i) => (
              <div key={i}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-accent-blue)",
                  }}
                >
                  {block.label}
                </span>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    color: "var(--color-text-primary)",
                    marginTop: 4,
                  }}
                >
                  {block.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
