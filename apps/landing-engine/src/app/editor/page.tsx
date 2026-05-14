'use client';
import SidebarBlocks from '@/components/editor/SidebarBlocks';
import CanvasArea from '@/components/editor/CanvasArea';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import JsonConsole from '@/components/editor/JsonConsole';
import AiModal from '@/components/editor/AiModal';
import PublishModal from '@/components/editor/PublishModal';
import { useEditorStore } from '@/store/editorStore';
import { Settings, Eye, Zap, Save, Monitor, Tablet, Smartphone, Code2, Undo2, Redo2, Sparkles, ExternalLink, Rocket } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function EditorPage() {
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const setViewSourceOpen = useEditorStore((state) => state.setViewSourceOpen);
  
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useEditorStore.getState().selectedBlockId;
        if (selectedId) {
          e.preventDefault();
          useEditorStore.getState().removeBlock(selectedId);
        }
      }
      if (e.key === 'Escape') {
        useEditorStore.getState().setSelectedBlockId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openPreview = () => {
    window.open('/preview', '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <JsonConsole />
      <AiModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
      <PublishModal isOpen={publishModalOpen} onClose={() => setPublishModalOpen(false)} />
      
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">Landing Engine</h1>
            <p className="text-[10px] text-slate-500 font-medium">MODO EDITOR / PRO 2.5</p>
          </div>
        </div>

        {/* Responsive Controls */}
        <div className="flex items-center bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button 
            onClick={() => setPreviewMode('desktop')}
            className={`p-2 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setPreviewMode('tablet')}
            className={`p-2 rounded-lg transition-all ${previewMode === 'tablet' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setPreviewMode('mobile')}
            className={`p-2 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Undo / Redo Controls */}
        <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30">
          <button 
            onClick={() => useEditorStore.getState().undo()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => useEditorStore.getState().redo()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/40 transition-all border border-indigo-400/20 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Sparkles className="w-4 h-4" />
            <span className="hidden lg:inline">Generar con IA</span>
          </button>
          <button 
            onClick={openPreview}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-slate-800"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden lg:inline">Vista Previa</span>
          </button>
          <button 
            onClick={() => setPublishModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/30 transition-all border border-emerald-400/20"
          >
            <Rocket className="w-4 h-4" />
            <span className="hidden lg:inline">Publicar</span>
          </button>
          <button 
            onClick={() => setViewSourceOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-slate-800"
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden lg:inline">JSON Source</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <SidebarBlocks />
        <CanvasArea />
        <PropertiesPanel />
      </div>
      
      <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Laboratorio Activo
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
          SEVEN FACTOR PRO • ENGINE v2.5
        </div>
      </footer>
    </div>
  );
}
