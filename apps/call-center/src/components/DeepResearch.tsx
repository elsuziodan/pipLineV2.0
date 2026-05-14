"use client";

import { useState, useCallback } from "react";
import { Search, Star, Clock, Mail, Globe, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DeepResearchData {
  success: boolean;
  photos: string[];
  business_hours: Record<string, string>;
  email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  attributes: string[];
  top_reviews: {
    author: string;
    rating: number;
    text: string;
    relative_date: string;
  }[];
  website_screenshot_path: string | null;
  seo_summary: {
    page_title: string;
    has_meta_description: boolean;
    mobile_friendly: boolean;
  } | null;
  scraped_at: string;
}

interface DeepResearchProps {
  clientId: string;
  cachedData?: DeepResearchData;
}

export function DeepResearch({ clientId, cachedData }: DeepResearchProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    cachedData ? "success" : "idle"
  );
  const [data, setData] = useState<DeepResearchData | null>(cachedData || null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!cachedData);

  const trigger = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error desconocido");
        setStatus("error");
        return;
      }

      // If cached, we get data directly
      if (json.cached) {
        setData(json.data);
        setStatus("success");
        setExpanded(true);
        return;
      }

      // If not cached, we get a job_id and wait for Realtime
      const jobId = json.job_id;
      
      const channel = supabase.channel(`research_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'research_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            const updatedJob = payload.new;
            if (updatedJob.status === 'completed') {
              setData(updatedJob.result);
              setStatus("success");
              setExpanded(true);
              supabase.removeChannel(channel);
            } else if (updatedJob.status === 'error') {
              setError(updatedJob.error_message || "Error en la investigación");
              setStatus("error");
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

    } catch (err) {
      setError("Error de conexión");
      setStatus("error");
    }
  }, [clientId]);

  // Idle — just the button
  if (status === "idle") {
    return (
      <button
        className="btn-research w-full flex items-center justify-center gap-2"
        onClick={trigger}
      >
        <Search size={16} /> Investigar este negocio
      </button>
    );
  }

  // Loading
  if (status === "loading") {
    return (
      <div style={{ marginTop: 4 }}>
        <div
          className="flex items-center justify-center gap-2"
          style={{
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-accent-teal)",
            color: "var(--color-accent-teal)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid var(--color-accent-teal)", borderTopColor: "transparent", borderRadius: "50%" }} />
          Investigando...
        </div>
        {/* Shimmer placeholders */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-shimmer" style={{ width: 120, height: 80, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="loading-shimmer" style={{ height: 14, width: `${70 + i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div>
        <button
          className="btn-research w-full flex items-center justify-center gap-2"
          onClick={trigger}
        >
          <Search size={16} /> Reintentar investigación
        </button>
        {error && (
          <p style={{ fontSize: 12, color: "var(--color-danger)", marginTop: 6, textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // Success
  if (!data) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        className="section-title w-full"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}
      >
        <span>🔍 Investigación Profunda</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="animate-fadeIn flex flex-col gap-4" style={{ marginTop: 8 }}>
          {/* Photos carousel */}
          {data.photos.length > 0 && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📸 Fotos
              </span>
              <div className="flex gap-2 overflow-x-auto" style={{ marginTop: 6, paddingBottom: 4 }}>
                {data.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i + 1}`}
                    style={{
                      width: 120,
                      height: 90,
                      objectFit: "cover",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Business hours */}
          {Object.keys(data.business_hours).length > 0 && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🕐 Horario
              </span>
              <div className="grid gap-1" style={{ marginTop: 4, gridTemplateColumns: "auto 1fr", fontSize: 12 }}>
                {Object.entries(data.business_hours).map(([day, hours]) => (
                  <div key={day} className="contents">
                    <span style={{ color: "var(--color-text-secondary)" }}>{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="flex flex-col gap-2">
            {data.email && (
              <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <Mail size={14} style={{ color: "var(--color-text-secondary)" }} />
                <a href={`mailto:${data.email}`} style={{ color: "var(--color-accent-cyan)" }}>{data.email}</a>
              </div>
            )}
            {data.facebook_url && (
              <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <Globe size={14} style={{ color: "#1877F2" }} />
                <a href={data.facebook_url} target="_blank" rel="noopener" style={{ color: "var(--color-accent-blue)" }}>
                  {data.facebook_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                </a>
              </div>
            )}
            {data.instagram_url && (
              <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <Globe size={14} style={{ color: "#E1306C" }} />
                <a href={data.instagram_url} target="_blank" rel="noopener" style={{ color: "var(--color-accent-purple)" }}>
                  {data.instagram_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                </a>
              </div>
            )}
            {!data.email && !data.facebook_url && !data.instagram_url && (
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                No se encontró contacto adicional
              </span>
            )}
          </div>

          {/* Top reviews */}
          {data.top_reviews.length > 0 && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ⭐ Reseñas Destacadas
              </span>
              <div className="flex flex-col gap-2" style={{ marginTop: 6 }}>
                {data.top_reviews.map((review, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      background: "var(--color-bg-deep)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <div className="star-rating">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            size={11}
                            fill={s < review.rating ? "#FFB800" : "none"}
                            color={s < review.rating ? "#FFB800" : "var(--color-text-tertiary)"}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {review.author}
                      </span>
                      {review.relative_date && (
                        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                          · {review.relative_date}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                      &ldquo;{review.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-run button */}
          <button
            className="btn-ghost w-full flex items-center justify-center gap-2"
            onClick={trigger}
            style={{ fontSize: 12 }}
          >
            <Search size={14} /> Volver a investigar
          </button>
        </div>
      )}
    </div>
  );
}
