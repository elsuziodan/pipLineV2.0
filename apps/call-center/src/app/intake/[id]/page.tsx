"use client";

import { use, useEffect, useState, useCallback } from "react";
import { ArrowLeft, Save, Bot } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";
import { getMetaStr, getMetaNum } from "@/lib/types";
import Link from "next/link";

interface IntakeFormData {
  owner_name: string;
  secondary_phone: string;
  email: string;
  business_hours: string;
  main_services: string;
  differentiator: string;
  brands: string;
  years_experience: string;
  facebook_url: string;
  instagram_url: string;
  has_logo: boolean;
  preferred_colors: string;
  tagline: string;
  coverage_area: string;
  offers_free_quotes: boolean;
  primary_cta: string;
  has_work_photos: boolean;
  seller_notes: string;
  urgency: string;
}

const EMPTY_FORM: IntakeFormData = {
  owner_name: "",
  secondary_phone: "",
  email: "",
  business_hours: "",
  main_services: "",
  differentiator: "",
  brands: "",
  years_experience: "",
  facebook_url: "",
  instagram_url: "",
  has_logo: false,
  preferred_colors: "",
  tagline: "",
  coverage_area: "",
  offers_free_quotes: true,
  primary_cta: "whatsapp",
  has_work_photos: false,
  seller_notes: "",
  urgency: "",
};

export default function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<IntakeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());

  // Load client data
  useEffect(() => {
    async function loadClient() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setLead(data as Lead);
        prefillForm(data as Lead);
      }
    }
    loadClient();
  }, [id]);

  const prefillForm = useCallback((client: Lead) => {
    const meta = client.metadata || {};
    const deep = (meta.deep_research || {}) as Record<string, unknown>;
    const auto = new Set<string>();
    const updates: Partial<IntakeFormData> = {};

    // Deep research data
    if (deep.email) { updates.email = deep.email as string; auto.add("email"); }
    if (deep.facebook_url) { updates.facebook_url = deep.facebook_url as string; auto.add("facebook_url"); }
    if (deep.instagram_url) { updates.instagram_url = deep.instagram_url as string; auto.add("instagram_url"); }
    if (deep.business_hours && typeof deep.business_hours === "object") {
      updates.business_hours = Object.entries(deep.business_hours as Record<string, string>)
        .map(([d, h]) => `${d}: ${h}`)
        .join("\n");
      auto.add("business_hours");
    }

    // Scrapper metadata
    const services = meta.services_detected;
    if (services) {
      updates.main_services = Array.isArray(services) ? services.join(", ") : String(services);
      auto.add("main_services");
    }

    setPrefilled(auto);
    setForm((f) => ({ ...f, ...updates }));
  }, []);

  const handleChange = (field: keyof IntakeFormData, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: lead.id, ...form }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Error saving intake:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--color-bg-base)" }}>
        <div className="loading-shimmer" style={{ width: 600, height: 400 }} />
      </div>
    );
  }

  const rating = getMetaNum(lead, "rating");
  const reviewCount = getMetaNum(lead, "review_count");
  const tier = getMetaStr(lead, "prospect_tier");

  const AutoBadge = ({ field }: { field: string }) =>
    prefilled.has(field) ? (
      <span title="Prellenado automáticamente" style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginLeft: 4 }}>
        <Bot size={10} style={{ display: "inline", marginRight: 2 }} />auto
      </span>
    ) : null;

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{ background: "var(--color-bg-base)", position: "relative", zIndex: 1 }}
    >
      <div className="max-w-3xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="card-elevated" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-ghost flex items-center gap-1" style={{ padding: "6px 10px", textDecoration: "none" }}>
              <ArrowLeft size={14} /> Volver
            </Link>
            <div className="flex-1">
              <h1 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
                📋 Intake — {lead.name}
              </h1>
              <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
                {rating > 0 && (
                  <span style={{ fontSize: 12, color: "#FFB800" }}>⭐ {rating} ({reviewCount} reseñas)</span>
                )}
                {tier && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Tier: {tier.toUpperCase()}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Form sections */}
        <div className="flex flex-col gap-6">
          {/* Section 1: Business Data */}
          <section className="card" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}><span>Datos del Negocio</span></div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <Field label="Nombre del dueño" value={form.owner_name} onChange={(v) => handleChange("owner_name", v)} />
              <Field label="Teléfono secundario" value={form.secondary_phone} onChange={(v) => handleChange("secondary_phone", v)} auto={prefilled.has("secondary_phone")} />
              <Field label="Email" value={form.email} onChange={(v) => handleChange("email", v)} type="email" auto={prefilled.has("email")} />
              <Field label="Ciudad" value={getMetaStr(lead, "city")} onChange={() => {}} disabled />
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="field-label">
                Horario <AutoBadge field="business_hours" />
              </label>
              <textarea
                className="textarea-field"
                value={form.business_hours}
                onChange={(e) => handleChange("business_hours", e.target.value)}
                placeholder="Lun-Vie: 9:00 - 18:00&#10;Sáb: 9:00 - 14:00"
                style={{ minHeight: 70 }}
              />
            </div>
          </section>

          {/* Section 2: Services */}
          <section className="card" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}><span>Servicios y Especialidades</span></div>
            <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
              <div>
                <label className="field-label">
                  Servicios principales <AutoBadge field="main_services" />
                </label>
                <textarea
                  className="textarea-field"
                  value={form.main_services}
                  onChange={(e) => handleChange("main_services", e.target.value)}
                  placeholder="cancelería, vidrio templado, ventanas..."
                  style={{ minHeight: 50 }}
                />
              </div>
              <Field label="Diferenciador" value={form.differentiator} onChange={(v) => handleChange("differentiator", v)} placeholder="¿Qué los hace diferentes?" />
              <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Marcas que manejan" value={form.brands} onChange={(v) => handleChange("brands", v)} />
                <Field label="Años de experiencia" value={form.years_experience} onChange={(v) => handleChange("years_experience", v)} type="number" />
              </div>
            </div>
          </section>

          {/* Section 3: Digital Presence */}
          <section className="card" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}><span>Presencia Digital</span></div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <Field label="Facebook" value={form.facebook_url} onChange={(v) => handleChange("facebook_url", v)} auto={prefilled.has("facebook_url")} />
              <Field label="Instagram" value={form.instagram_url} onChange={(v) => handleChange("instagram_url", v)} auto={prefilled.has("instagram_url")} />
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <Toggle label="¿Tiene logo?" value={form.has_logo} onChange={(v) => handleChange("has_logo", v)} />
              <Field label="Colores preferidos" value={form.preferred_colors} onChange={(v) => handleChange("preferred_colors", v)} placeholder="azul, gris..." />
            </div>
          </section>

          {/* Section 4: Landing page */}
          <section className="card" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}><span>Para la Landing Page</span></div>
            <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
              <Field label="Frase gancho" value={form.tagline} onChange={(v) => handleChange("tagline", v)} placeholder="La frase principal del negocio" />
              <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Área de cobertura" value={form.coverage_area} onChange={(v) => handleChange("coverage_area", v)} placeholder="Monterrey y zona metropolitana" />
                <div>
                  <label className="field-label">CTA principal</label>
                  <select
                    className="input-field"
                    value={form.primary_cta}
                    onChange={(e) => handleChange("primary_cta", e.target.value)}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Llamada</option>
                    <option value="form">Formulario</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Toggle label="¿Cotizaciones gratis?" value={form.offers_free_quotes} onChange={(v) => handleChange("offers_free_quotes", v)} />
                <Toggle label="¿Fotos de trabajos?" value={form.has_work_photos} onChange={(v) => handleChange("has_work_photos", v)} />
              </div>
            </div>
          </section>

          {/* Section 5: Seller notes */}
          <section className="card" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}><span>Notas del Vendedor</span></div>
            <div className="flex flex-col gap-4" style={{ marginTop: 12 }}>
              <div>
                <label className="field-label">Observaciones</label>
                <textarea
                  className="textarea-field"
                  value={form.seller_notes}
                  onChange={(e) => handleChange("seller_notes", e.target.value)}
                  placeholder="Notas adicionales sobre el prospecto..."
                  style={{ minHeight: 80 }}
                />
              </div>
              <div>
                <label className="field-label">Urgencia</label>
                <div className="flex gap-2">
                  {[
                    { key: "hot", emoji: "🟢", label: "Ya quiere" },
                    { key: "warm", emoji: "🟡", label: "Esta semana" },
                    { key: "cold", emoji: "🔴", label: "Lo piensa" },
                  ].map((u) => (
                    <button
                      key={u.key}
                      className={`outcome-pill ${
                        u.key === "hot" ? "outcome-interested" :
                        u.key === "warm" ? "outcome-callback" :
                        "outcome-rejected"
                      }`}
                      data-active={form.urgency === u.key ? "true" : undefined}
                      onClick={() => handleChange("urgency", u.key)}
                      style={{ fontSize: 12, padding: "6px 14px" }}
                    >
                      {u.emoji} {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            className="btn-call w-full"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "14px 24px",
              fontSize: 15,
              background: saved ? "linear-gradient(135deg, #00FF88, #00D9A6)" : undefined,
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Save size={16} />
              {saving ? "Guardando..." : saved ? "✅ Intake Guardado" : "GUARDAR INTAKE"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ── */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  auto,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  auto?: boolean;
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {auto && (
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginLeft: 4 }}>
            <Bot size={10} style={{ display: "inline", marginRight: 2 }} />auto
          </span>
        )}
      </label>
      <input
        type={type}
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={disabled ? { opacity: 0.5 } : undefined}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="field-label" style={{ marginBottom: 0 }}>{label}</label>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: value ? "var(--color-accent-teal)" : "var(--color-bg-active)",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}
