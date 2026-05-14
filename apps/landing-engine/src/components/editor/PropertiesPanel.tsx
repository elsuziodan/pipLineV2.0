'use client';
import { useEditorStore } from '@/store/editorStore';
import { Settings2, Layout as LayoutIcon, Palette, Briefcase, Type, Copy, Eye, EyeOff, Trash2, Search } from 'lucide-react';
import { useState, useRef } from 'react';
import SectionTitle from './properties/SectionTitle';
import HeroProperties from './properties/HeroProperties';
import FeaturesProperties from './properties/FeaturesProperties';
import FaqProperties from './properties/FaqProperties';
import PricingProperties from './properties/PricingProperties';
import TestimonialProperties from './properties/TestimonialProperties';

export default function PropertiesPanel() {
  const [tab, setTab] = useState<'block' | 'global'>('block');
  
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const blocks = useEditorStore((state) => state.document.blocks);
  const updateBlock = useEditorStore((state) => state.updateBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const cloneBlock = useEditorStore((state) => state.cloneBlock);
  const toggleVisibility = useEditorStore((state) => state.toggleVisibility);
  const commitHistory = useEditorStore((state) => state.commitHistory);

  const businessName = useEditorStore((state) => state.document.businessName);
  const setBusinessName = useEditorStore((state) => state.setBusinessName);
  const primaryColor = useEditorStore((state) => state.document.primaryColor);
  const setPrimaryColor = useEditorStore((state) => state.setPrimaryColor);

  const block = blocks.find((b) => b.id === selectedBlockId);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdate = (key: string, value: any, saveToHistory = false) => {
    if (!block) return;
    updateBlock(block.id, { [key]: value }, saveToHistory);
    if (!saveToHistory) {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = setTimeout(() => commitHistory(), 800);
    }
  };

  const handleArrayUpdate = (key: string, index: number, field: string, value: any) => {
    if (!block) return;
    const array = [...(block as any)[key]];
    array[index] = { ...array[index], [field]: value };
    handleUpdate(key, array);
  };

  const handleAddArrayItem = (key: string, defaultValue: any) => {
    if (!block) return;
    const array = [...((block as any)[key] || [])];
    handleUpdate(key, [...array, defaultValue], true);
  };

  const handleRemoveArrayItem = (key: string, index: number) => {
    if (!block) return;
    const array = [...(block as any)[key]];
    array.splice(index, 1);
    handleUpdate(key, array, true);
  };

  const renderBlockSpecificProperties = () => {
    if (!block) return null;
    
    switch (block.type) {
      case 'Hero':
        return <HeroProperties block={block as any} onUpdate={handleUpdate} />;
      case 'FeaturesBento':
        return <FeaturesProperties block={block as any} onArrayUpdate={handleArrayUpdate} onAddItem={handleAddArrayItem} onRemoveItem={handleRemoveArrayItem} />;
      case 'FaqAccordion':
        return <FaqProperties block={block as any} onArrayUpdate={handleArrayUpdate} onAddItem={handleAddArrayItem} onRemoveItem={handleRemoveArrayItem} />;
      case 'PricingTable':
        return <PricingProperties block={block as any} onArrayUpdate={handleArrayUpdate} onAddItem={handleAddArrayItem} onRemoveItem={handleRemoveArrayItem} />;
      case 'TestimonialCarousel':
        return <TestimonialProperties block={block as any} onArrayUpdate={handleArrayUpdate} onAddItem={handleAddArrayItem} onRemoveItem={handleRemoveArrayItem} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-40 relative overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full">
          <button
            onClick={() => setTab('block')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'block' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Bloque
          </button>
          <button
            onClick={() => setTab('global')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'global' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
            Global
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'global' ? (
          <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Business Name */}
            <div>
              <SectionTitle title="Negocio" icon={Briefcase} />
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Nombre Comercial</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onBlur={() => commitHistory()}
                  className="w-full p-3 text-sm font-bold border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Nombre de tu empresa"
                />
              </div>
            </div>

            {/* Branding */}
            <div>
              <SectionTitle title="Marca" icon={Palette} />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Color Primario</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      onBlur={() => commitHistory()}
                      className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden shadow-sm hover:scale-105 transition-transform"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      onBlur={() => commitHistory()}
                      className="flex-1 p-3 text-sm font-mono border border-slate-200 rounded-2xl outline-none"
                    />
                  </div>
                </div>

                {/* SEO & Meta */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SEO y Metadatos</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Meta Título</label>
                      <input
                        type="text"
                        value={seo.title || ''}
                        onChange={(e) => updateSeo({ title: e.target.value })}
                        onBlur={() => commitHistory()}
                        placeholder={businessName}
                        className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Meta Descripción</label>
                      <textarea
                        value={seo.description || ''}
                        onChange={(e) => updateSeo({ description: e.target.value })}
                        onBlur={() => commitHistory()}
                        placeholder="Descripción para Google y redes sociales..."
                        rows={3}
                        className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">URL Imagen Compartir (OG)</label>
                      <input
                        type="text"
                        value={seo.ogImage || ''}
                        onChange={(e) => updateSeo({ ogImage: e.target.value })}
                        onBlur={() => commitHistory()}
                        placeholder="https://...imagen.jpg"
                        className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Presets</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      '#6366f1', // Indigo
                      '#8b5cf6', // Violet
                      '#ec4899', // Pink
                      '#ef4444', // Red
                      '#f97316', // Orange
                      '#eab308', // Yellow
                      '#22c55e', // Green
                      '#06b6d4', // Cyan
                      '#3b82f6', // Blue
                      '#0f172a', // Slate 900
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => { setPrimaryColor(color); commitHistory(); }}
                        className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                          primaryColor === color ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reset */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro? Esto eliminará todos los bloques y restaurará los valores por defecto.')) {
                    useEditorStore.getState().resetDocument();
                  }
                }}
                className="w-full p-3 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl transition-all"
              >
                🗑️ Nuevo Proyecto (Resetear Todo)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            {!block ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                  <LayoutIcon className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Sin selección</p>
                <p className="text-xs text-slate-400 leading-relaxed">Selecciona un bloque en el lienzo para editar sus propiedades</p>
              </div>
            ) : (
              <>
                {/* Block Header */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter">{block.type}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Propiedades del Bloque</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => cloneBlock(block.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm"
                      title="Clonar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleVisibility(block.id)}
                      className={`p-2.5 rounded-xl transition-all shadow-sm ${block.hidden ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                      title={block.hidden ? 'Mostrar' : 'Ocultar'}
                    >
                      {block.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => removeBlock(block.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Theme & Layout */}
                <div className="space-y-6">
                  <SectionTitle title="Layout y Estilo" icon={LayoutIcon} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Tema</label>
                      <select 
                        value={block.theme || 'light'}
                        onChange={(e) => handleUpdate('theme', e.target.value, true)}
                        className="w-full p-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white"
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Oscuro</option>
                        <option value="brand">Marca</option>
                      </select>
                    </div>
                    {block.type === 'Hero' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Layout</label>
                        <select 
                          value={(block as any).layout || 'centered'}
                          onChange={(e) => handleUpdate('layout', e.target.value, true)}
                          className="w-full p-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white"
                        >
                          <option value="centered">Centrado</option>
                          <option value="split">Dividido</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Common Content Fields */}
                <div className="space-y-6">
                  <SectionTitle title="Contenido Principal" icon={Type} />
                  
                  <div className="space-y-4">
                    {/* Headline / Title */}
                    {(block as any).headline !== undefined || (block as any).title !== undefined ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Título</label>
                        <textarea
                          value={(block as any).headline || (block as any).title || ''}
                          onChange={(e) => handleUpdate((block as any).headline !== undefined ? 'headline' : 'title', e.target.value)}
                          className="w-full p-3 text-sm font-bold border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                          rows={2}
                        />
                      </div>
                    ) : null}

                    {/* Subheadline / Subtitle */}
                    {(block as any).subheadline !== undefined || (block as any).subtitle !== undefined ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Subtítulo</label>
                        <textarea
                          value={(block as any).subheadline || (block as any).subtitle || ''}
                          onChange={(e) => handleUpdate((block as any).subheadline !== undefined ? 'subheadline' : 'subtitle', e.target.value)}
                          className="w-full p-3 text-xs font-medium text-slate-600 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                          rows={3}
                        />
                      </div>
                    ) : null}

                    {/* CTA Text */}
                    {(block as any).ctaText !== undefined ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Texto del Botón</label>
                        <input
                          type="text"
                          value={(block as any).ctaText || ''}
                          onChange={(e) => handleUpdate('ctaText', e.target.value)}
                          className="w-full p-3 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Specific Fields */}
                {renderBlockSpecificProperties()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
          <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
            <span className="text-white text-[10px] font-black italic">7</span>
          </div>
          <span className="text-[10px] font-bold text-slate-900 tracking-tighter uppercase">Seven Factor Engine</span>
        </div>
      </div>
    </div>
  );
}
