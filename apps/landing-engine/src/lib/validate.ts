import { BlockProps, BlockType } from '@/types/schema';

const VALID_TYPES: BlockType[] = [
  'Hero', 'FeaturesBento', 'TestimonialCarousel', 
  'PricingTable', 'FaqAccordion', 'CallToAction',
  'Gallery', 'VideoPlayer', 'Team', 'LogoCloud'
];

/**
 * Valida y sanitiza un array de bloques proveniente de la IA o de importación manual.
 * - Filtra bloques con type inválido
 * - Asigna IDs si faltan
 * - Completa campos obligatorios con defaults para evitar crashes
 */
export function validateBlocks(rawBlocks: any[]): BlockProps[] {
  if (!Array.isArray(rawBlocks)) return [];

  return rawBlocks
    .filter((block) => {
      if (!block || typeof block !== 'object') return false;
      if (!VALID_TYPES.includes(block.type)) {
        console.warn(`[Validate] Bloque descartado: type "${block.type}" no es válido.`);
        return false;
      }
      return true;
    })
    .map((block, index) => {
      // Asegurar ID único si falta
      if (!block.id || typeof block.id !== 'string') {
        block.id = `${block.type.toLowerCase()}-${Date.now()}-${index}`;
      }

      // Asegurar tema por defecto
      if (!block.theme) block.theme = 'light';

      // Validación específica por tipo para asegurar que los componentes no crasheen
      switch (block.type) {
        case 'Hero':
          block.headline = block.headline || 'Título del Hero';
          block.subheadline = block.subheadline || '';
          block.ctaText = block.ctaText || 'Comenzar';
          block.layout = block.layout || 'centered';
          if (block.media && block.media.type === 'image' && !block.media.src) {
             block.media.src = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80';
          }
          break;

        case 'FeaturesBento':
          block.title = block.title || 'Nuestros Servicios';
          if (!Array.isArray(block.features)) block.features = [];
          block.features = block.features.map((f: any) => ({
            title: f?.title || 'Servicio',
            description: f?.description || '',
            iconName: f?.iconName || 'Star',
          }));
          break;

        case 'TestimonialCarousel':
          block.title = block.title || 'Testimonios';
          if (!Array.isArray(block.testimonials)) block.testimonials = [];
          block.testimonials = block.testimonials.map((t: any) => ({
            authorName: t?.authorName || 'Cliente',
            authorRole: t?.authorRole || '',
            quote: t?.quote || '',
            rating: typeof t?.rating === 'number' ? t.rating : 5,
          }));
          break;

        case 'PricingTable':
          block.title = block.title || 'Planes';
          if (!Array.isArray(block.tiers)) block.tiers = [];
          block.tiers = block.tiers.map((t: any) => ({
            name: t?.name || 'Plan',
            price: t?.price || '$0',
            description: t?.description || '',
            features: Array.isArray(t?.features) ? t.features : [],
            ctaText: t?.ctaText || 'Elegir Plan',
            popular: !!t?.popular,
          }));
          break;

        case 'FaqAccordion':
          block.title = block.title || 'Preguntas Frecuentes';
          if (!Array.isArray(block.items)) block.items = [];
          block.items = block.items.map((i: any) => ({
            question: i?.question || '¿Pregunta?',
            answer: i?.answer || 'Respuesta.',
          }));
          break;

        case 'CallToAction':
          block.title = block.title || '¿Listo para empezar?';
          block.subtitle = block.subtitle || '';
          block.ctaText = block.ctaText || 'Comenzar';
          break;

        case 'Gallery':
          block.title = block.title || 'Nuestra Galería';
          block.columns = block.columns || 3;
          if (!Array.isArray(block.images)) block.images = [];
          block.images = block.images.map((img: any) => ({
            url: img?.url || 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80',
            alt: img?.alt || '',
            caption: img?.caption || '',
          }));
          break;

        case 'VideoPlayer':
          block.title = block.title || 'Video Destacado';
          block.videoUrl = block.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
          break;

        case 'Team':
          block.title = block.title || 'Nuestro Equipo';
          if (!Array.isArray(block.members)) block.members = [];
          block.members = block.members.map((m: any) => ({
            name: m?.name || 'Nombre',
            role: m?.role || 'Cargo',
            image: m?.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          }));
          break;

        case 'LogoCloud':
          block.title = block.title || 'Confían en nosotros';
          if (!Array.isArray(block.logos)) block.logos = [];
          if (block.logos.length === 0) {
            block.logos = [
              'https://tailwindui.com/img/logos/158x48/transistor-logo-slate-900.svg',
              'https://tailwindui.com/img/logos/158x48/reform-logo-slate-900.svg',
              'https://tailwindui.com/img/logos/158x48/tuple-logo-slate-900.svg',
              'https://tailwindui.com/img/logos/158x48/savvycal-logo-slate-900.svg',
            ];
          }
          break;
      }

      return block as BlockProps;
    });
}

/**
 * Valida un documento completo de la IA o importación
 */
export function validateAiResponse(data: any): {
  businessName: string;
  blocks: BlockProps[];
} {
  return {
    businessName: typeof data?.businessName === 'string' ? data.businessName : 'Mi Negocio',
    blocks: validateBlocks(data?.blocks || []),
  };
}
