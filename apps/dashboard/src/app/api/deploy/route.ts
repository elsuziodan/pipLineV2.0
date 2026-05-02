import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Importación corregida a nivel local del dashboard
import { deployLandingPage } from '@/services/vercel_deployer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verified Unsplash image banks by industry category
const IMAGE_BANKS: Record<string, { hero: string; gallery: string[] }> = {
  auto: {
    hero: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop",
    ]
  },
  dental: {
    hero: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop",
    ]
  },
  food: {
    hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&auto=format&fit=crop",
    ]
  },
  generic: {
    hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop",
    ]
  }
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/mecánic|hojalater|pintura|auto|taller|motor|car wash/i.test(lower)) return "auto";
  if (/dental|dent|clínica|doctor|salud|médic|hospital|farma/i.test(lower)) return "dental";
  if (/restaurant|comida|taco|pizza|café|cocina|panadería|carnicería/i.test(lower)) return "food";
  return "generic";
}

export async function POST(req: Request) {
  try {
    const { clientId, clientName, rawData } = await req.json();

    if (!clientId || !clientName) {
      return NextResponse.json({ error: "Missing clientId or clientName" }, { status: 400 });
    }

    // Detect category from all available data
    const category = detectCategory(`${clientName} ${rawData || ''}`);
    const images = IMAGE_BANKS[category];

    // Extract basic fields from rawData
    const lines = (rawData || '').split('\n');
    const getField = (key: string) => {
      const line = lines.find((l: string) => l.toLowerCase().startsWith(key.toLowerCase()));
      return line ? line.split(': ').slice(1).join(': ').trim() : '';
    };

    const phone = getField('Teléfono').replace(/[^0-9]/g, '');
    const address = getField('Dirección');

    // Use AI ONLY for creative content (headline, services, testimonials)
    let aiContent: any = null;

    if (rawData) {
      try {
        const systemPrompt = `Genera contenido para la landing page de "${clientName}" (${category}). Responde SOLO JSON, sin markdown:
{"headline":"frase impactante en español","subheadline":"descripción corta y profesional","services":[{"title":"","description":"","icon":"Wrench"},{"title":"","description":"","icon":"Shield"},{"title":"","description":"","icon":"Star"}],"testimonials":[{"author":"nombre mexicano","quote":"reseña positiva"},{"author":"","quote":""},{"author":"","quote":""}],"color":"#HEX apropiado"}
Icons válidos: Wrench, Shield, Star, Paintbrush, Heart, Sparkles, Scissors, ShieldCheck, Cog, Zap, Award`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: rawData }
            ],
            temperature: 0.3
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          let rawOutput = aiData.choices[0].message.content.trim();
          rawOutput = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          rawOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          console.log("[Deploy] AI creative content:", rawOutput.substring(0, 500));
          aiContent = JSON.parse(rawOutput);
        }
      } catch (aiErr: any) {
        console.error("[Deploy] AI failed, using fallback:", aiErr.message);
      }
    }

    // Build the COMPLETE siteConfig - AI only enriches, never controls structure
    const siteConfigJSON = {
      theme: { 
        primaryColor: aiContent?.color || "#0EA5E9", 
        fontFamily: "Inter" 
      },
      navbar: { ctaText: "Agendar Cita" },
      business: { 
        name: clientName, 
        whatsapp: phone, 
        address: address, 
        logoUrl: null 
      },
      hero: {
        headline: aiContent?.headline || `${clientName} — Calidad y Servicio Profesional`,
        subheadline: aiContent?.subheadline || "Soluciones de confianza para tu negocio. Contáctanos hoy.",
        ctaText: "Cotizar por WhatsApp",
        heroImage: images.hero
      },
      services: {
        sectionTitle: "Nuestros Servicios",
        sectionSubtitle: "Soluciones profesionales para cada necesidad.",
        items: (aiContent?.services || [
          { title: "Servicio Premium", description: "Atención personalizada con los más altos estándares.", icon: "Star" },
          { title: "Asesoría Gratuita", description: "Te orientamos sin compromiso para encontrar la mejor solución.", icon: "Shield" },
          { title: "Garantía Total", description: "Respaldamos nuestro trabajo con garantía de satisfacción.", icon: "ShieldCheck" }
        ]).map((s: any, i: number) => ({ ...s, id: String(i + 1) }))
      },
      gallery: images.gallery.map((src: string, i: number) => ({
        src,
        title: ["Calidad", "Precisión", "Confianza", "Excelencia"][i]
      })),
      testimonials: (aiContent?.testimonials || [
        { author: "Carlos M.", quote: "Excelente servicio y atención. Muy profesionales." },
        { author: "María G.", quote: "Quedé muy satisfecha con el resultado. 100% recomendados." },
        { author: "Roberto S.", quote: "Precios justos y trabajo de primera calidad." }
      ]).map((t: any, i: number) => ({ ...t, id: String(i + 1), rating: 5 })),
      contact: {
        phone: phone,
        address: address,
        hours: [
          { days: "Lunes a Viernes", time: "9:00 AM - 6:00 PM" },
          { days: "Sábado", time: "9:00 AM - 2:00 PM" }
        ]
      }
    };

    console.log("[Deploy] Final config sections:", Object.keys(siteConfigJSON));

    const deployUrl = await deployLandingPage(clientName, siteConfigJSON);

    const { error } = await supabase
      .from('clients')
      .update({ landing_url: deployUrl, status: 'COBRANZA' })
      .eq('id', clientId);

    if (error) throw error;

    return NextResponse.json({ success: true, url: deployUrl });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
