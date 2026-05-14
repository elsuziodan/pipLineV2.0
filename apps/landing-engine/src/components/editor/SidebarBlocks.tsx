'use client';
import { useEditorStore } from '@/store/editorStore';
import { BlockType } from '@/types/schema';
import { Plus, Layout, Users, MessageSquare, CreditCard, HelpCircle, Zap, Image as ImageIcon, Video, Building } from 'lucide-react';

const AVAILABLE_BLOCKS: { type: BlockType; label: string; icon: any }[] = [
  { type: 'Hero', label: 'Hero Section', icon: Layout },
  { type: 'FeaturesBento', label: 'Características', icon: Users },
  { type: 'TestimonialCarousel', label: 'Testimonios', icon: MessageSquare },
  { type: 'PricingTable', label: 'Tabla de Precios', icon: CreditCard },
  { type: 'FaqAccordion', label: 'Preguntas (FAQ)', icon: HelpCircle },
  { type: 'CallToAction', label: 'Cierre (CTA)', icon: Zap },
  { type: 'Gallery', label: 'Galería de Imágenes', icon: ImageIcon },
  { type: 'VideoPlayer', label: 'Video Embed', icon: Video },
  { type: 'Team', label: 'Nuestro Equipo', icon: Users },
  { type: 'LogoCloud', label: 'Logos Clientes', icon: Building },
];

export default function SidebarBlocks() {
  const addBlock = useEditorStore((state) => state.addBlock);

  const handleAddBlock = (type: BlockType) => {
    const id = `${type.toLowerCase()}-${Date.now()}`;
    let newBlock: any = { id, type, theme: 'light' };

    // Default props based on type
    if (type === 'Hero') {
      newBlock = {
        ...newBlock,
        layout: 'centered',
        headline: 'Nuevo Título Hero',
        subheadline: 'Describe tu negocio de forma impactante aquí.',
        ctaText: 'Contactar ahora',
        media: { type: 'solid', color: '#f1f5f9' }
      };
    } else if (type === 'FeaturesBento') {
      newBlock = {
        ...newBlock,
        title: 'Nuestros Servicios',
        subtitle: 'Ofrecemos soluciones integrales para tu negocio.',
        features: [
          { title: 'Servicio 1', description: 'Descripción breve', iconName: 'Star' },
          { title: 'Servicio 2', description: 'Descripción breve', iconName: 'Shield' },
          { title: 'Servicio 3', description: 'Descripción breve', iconName: 'Zap' }
        ]
      };
    } else if (type === 'TestimonialCarousel') {
      newBlock = {
        ...newBlock,
        title: 'Opiniones Reales',
        testimonials: [
          { authorName: 'Cliente Feliz', quote: '¡Me encantó el servicio!', rating: 5 }
        ]
      };
    } else if (type === 'PricingTable') {
      newBlock = {
        ...newBlock,
        title: 'Planes y Precios',
        subtitle: 'Elige el plan que mejor se adapte a ti.',
        tiers: [
          { name: 'Básico', price: '$99', description: 'Ideal para empezar', features: ['Feature 1', 'Feature 2'], ctaText: 'Elegir Plan' },
          { name: 'Pro', price: '$199', description: 'El más popular', features: ['Feature 1', 'Feature 2', 'Feature 3'], ctaText: 'Elegir Plan', popular: true },
          { name: 'Empresa', price: '$499', description: 'Poder total', features: ['Todo lo anterior', 'Soporte 24/7'], ctaText: 'Elegir Plan' }
        ]
      };
    } else if (type === 'FaqAccordion') {
      newBlock = {
        ...newBlock,
        title: 'Preguntas Frecuentes',
        items: [
          { question: '¿Cómo funciona el servicio?', answer: 'Es muy sencillo, solo tienes que...' },
          { question: '¿Qué formas de pago aceptan?', answer: 'Aceptamos todas las tarjetas de crédito...' }
        ]
      };
    } else if (type === 'CallToAction') {
      newBlock = {
        ...newBlock,
        theme: 'brand',
        title: '¿Listo para empezar?',
        subtitle: 'Únete a más de 1,000 clientes satisfechos hoy mismo.',
        ctaText: 'Comenzar Ahora'
      };
    } else if (type === 'Gallery') {
      newBlock = {
        ...newBlock,
        title: 'Nuestra Galería',
        columns: 3,
        images: [
          { url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80', caption: 'Proyecto 1' },
          { url: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=800&q=80', caption: 'Proyecto 2' },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', caption: 'Proyecto 3' }
        ]
      };
    } else if (type === 'VideoPlayer') {
      newBlock = {
        ...newBlock,
        title: 'Conoce nuestro proceso',
        subtitle: 'Un vistazo a cómo trabajamos',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      };
    } else if (type === 'Team') {
      newBlock = {
        ...newBlock,
        title: 'Liderazgo y Talento',
        members: [
          { name: 'Alex Rivera', role: 'Fundador & CEO', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
          { name: 'Elena Smith', role: 'Directora de Diseño', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
          { name: 'Marc Wilson', role: 'CTO', image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
        ]
      };
    } else if (type === 'LogoCloud') {
      newBlock = {
        ...newBlock,
        title: 'EMPRESAS QUE CONFÍAN EN NOSOTROS',
        logos: [
          'https://tailwindui.com/img/logos/158x48/transistor-logo-slate-900.svg',
          'https://tailwindui.com/img/logos/158x48/reform-logo-slate-900.svg',
          'https://tailwindui.com/img/logos/158x48/tuple-logo-slate-900.svg',
          'https://tailwindui.com/img/logos/158x48/savvycal-logo-slate-900.svg',
        ]
      };
    }

    addBlock(newBlock);
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col z-40 relative shadow-sm">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Librería de Bloques</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {AVAILABLE_BLOCKS.map((block) => (
          <button
            key={block.type}
            onClick={() => handleAddBlock(block.type)}
            className="w-full flex items-center gap-3 p-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-slate-200 group"
          >
            <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-indigo-50 transition-colors">
              <block.icon className="w-4 h-4" />
            </div>
            <span className="font-semibold">{block.label}</span>
            <Plus className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <p className="text-[10px] text-slate-400 text-center">Haz clic para añadir al lienzo</p>
      </div>
    </div>
  );
}
