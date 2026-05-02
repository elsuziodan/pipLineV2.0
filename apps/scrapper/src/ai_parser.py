import os
import json
import re
from openai import OpenAI

# Initialize OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_KEY")
)

def parse_scraped_data_to_json(raw_text: str) -> dict:
    system_prompt = """
    You are an expert JSON data extractor. Extract the business name, WhatsApp number (formatted without '+'), address, a compelling hero headline, and find or generate a relevant image URL.
    You MUST return ONLY strictly valid JSON matching this exact structure, with no markdown formatting, no conversational text, and no backticks:
    {
      "theme": { "primaryColor": "#0EA5E9", "fontFamily": "Inter" },
      "navbar": { "ctaText": "Agendar Cita" },
      "business": { "name": "", "whatsapp": "", "address": "", "logoUrl": null },
      "hero": { "headline": "", "subheadline": "", "ctaText": "Cotizar por WhatsApp", "heroImage": "" },
      "services": {
        "sectionTitle": "Nuestros Servicios",
        "sectionSubtitle": "",
        "items": [ { "id": "1", "title": "", "description": "", "icon": "Wrench" } ]
      },
      "testimonials": []
    }
    """

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-3-8b-instruct:free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract data from this raw text:\n{raw_text}"}
            ],
            temperature=0.1
        )
        
        raw_output = response.choices[0].message.content.strip()
        
        # Defensive cleanup: Strip Markdown backticks hallucinated by free models
        clean_json_str = re.sub(r'^```json\s*', '', raw_output, flags=re.MULTILINE)
        clean_json_str = re.sub(r'\s*```$', '', clean_json_str, flags=re.MULTILINE)
        
        return json.loads(clean_json_str)

    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}\nRaw output: {raw_output}")
        # Return safe fallback to prevent pipeline failure
        return {
            "theme": { "primaryColor": "#0EA5E9", "fontFamily": "Inter" },
            "navbar": { "ctaText": "Contactar" },
            "business": { "name": "Negocio Local", "whatsapp": "", "address": "", "logoUrl": None },
            "hero": { "headline": "Soluciones Profesionales", "subheadline": "Contáctanos hoy.", "ctaText": "Saber más", "heroImage": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070" },
            "services": { "items": [] },
            "testimonials": []
        }
