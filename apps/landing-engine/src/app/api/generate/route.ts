import { NextResponse } from 'next/server';
import { validateAiResponse } from '@/lib/validate';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;

const SYSTEM_PROMPT = `
Eres un diseñador web experto y copywriter estratégico especializado en Landing Pages B2B de alta conversión.
Genera la estructura de una landing page en formato JSON estricto.
RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO. NO INCLUYAS EXPLICACIONES, COMENTARIOS NI BLOQUES DE CÓDIGO.

Estructura esperada:
{
  "businessName": "Nombre del negocio",
  "blocks": [
    {
      "id": "hero-1",
      "type": "Hero",
      "layout": "centered" | "split",
      "headline": "Título impactante",
      "subheadline": "Propuesta de valor clara",
      "ctaText": "Texto del botón",
      "theme": "light" | "dark" | "brand",
      "media": { "type": "image", "src": "https://images.unsplash.com/photo-..." }
    },
    {
      "id": "features-1",
      "type": "FeaturesBento",
      "title": "Nuestros Servicios",
      "subtitle": "...",
      "features": [
        { "title": "...", "description": "...", "iconName": "Shield" | "Zap" | "Star" | "Globe" | "Users" }
      ]
    },
    {
      "id": "testimonials-1",
      "type": "TestimonialCarousel",
      "title": "Lo que dicen nuestros clientes",
      "testimonials": [
        { "authorName": "...", "authorRole": "...", "quote": "...", "rating": 5 }
      ]
    },
    {
      "id": "pricing-1",
      "type": "PricingTable",
      "title": "Planes y Precios",
      "tiers": [
        { "name": "Basic", "price": "$XX", "description": "...", "features": ["...", "..."], "ctaText": "Elegir", "popular": true }
      ]
    },
    {
      "id": "faq-1",
      "type": "FaqAccordion",
      "title": "Preguntas Frecuentes",
      "items": [
        { "question": "...", "answer": "..." }
      ]
    },
    {
      "id": "cta-1",
      "type": "CallToAction",
      "title": "...",
      "subtitle": "...",
      "ctaText": "...",
      "theme": "brand"
    }
  ]
}

REGLAS CRÍTICAS:
1. Devuelve ÚNICAMENTE el JSON. 
2. Usa Unsplash para imágenes profesionales.
3. El tono debe ser persuasivo y orientado a negocios.
4. Genera al menos 5 bloques relevantes.
5. Usa iconos de Lucide-React válidos.
`;


export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Genera una landing page completa para este negocio: ${prompt}` }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API Error:', response.status, errorText);
      throw new Error(`Error en la API de IA (${response.status}): ${errorText.substring(0, 100)}...`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error('La IA no devolvió ninguna respuesta');
    }

    const content = data.choices[0].message.content;

    // Limpieza robusta de JSON
    let jsonString = content.trim();
    if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1];
      if (jsonString.startsWith('json')) {
        jsonString = jsonString.substring(4);
      }
    }
    
    // Eliminar posibles comentarios o texto extra
    const startIdx = jsonString.indexOf('{');
    const endIdx = jsonString.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }

    const parsedData = JSON.parse(jsonString);
    const validated = validateAiResponse(parsedData);
    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: 'Fallo al generar la landing page: ' + error.message }, { status: 500 });
  }
}
