'use client';
import { useState, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { X, Rocket, Loader2, Check, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PublishState = 'form' | 'publishing' | 'success' | 'error';

export default function PublishModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [slug, setSlug] = useState('');
  const [publishState, setPublishState] = useState<PublishState>('form');
  const [deployUrl, setDeployUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const document = useEditorStore((state) => state.document);

  const handlePublish = async () => {
    if (!slug.trim()) return;
    setPublishState('publishing');
    setError('');

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, slug: slug.trim() }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setDeployUrl(data.url);
      setPublishState('success');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setPublishState('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(deployUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPublishState('form');
    setError('');
    setDeployUrl('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Publicar Landing</h2>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Deploy a Producción</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8">
              {publishState === 'form' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Slug de la URL</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">https://</span>
                      <input
                        autoFocus
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="mi-negocio"
                        className="flex-1 p-3 text-sm font-bold font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <span className="text-xs text-slate-400 font-mono">.vercel.app</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Solo letras minúsculas, números y guiones</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resumen</p>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600"><span className="font-bold">Negocio:</span> {document.businessName}</p>
                      <p className="text-xs text-slate-600"><span className="font-bold">Bloques:</span> {document.blocks.filter(b => !b.hidden).length} activos</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-bold">Color:</span>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: document.primaryColor }} />
                        <span className="text-xs text-slate-400 font-mono">{document.primaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePublish}
                    disabled={!slug.trim()}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Rocket className="w-5 h-5" />
                    Publicar en Producción
                  </button>
                </div>
              )}

              {publishState === 'publishing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
                    <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Publicando tu landing...</h3>
                    <p className="text-sm text-slate-500 mt-2">Generando HTML y deployando a la red global de Vercel.</p>
                  </div>
                </div>
              )}

              {publishState === 'success' && (
                <div className="py-8 space-y-6 text-center">
                  <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">¡Publicada con éxito! 🎉</h3>
                    <p className="text-sm text-slate-500 mt-2">Tu landing page está en vivo en:</p>
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl">
                    <code className="flex-1 text-sm font-mono text-emerald-700 truncate">{deployUrl}</code>
                    <button onClick={handleCopy} className="p-2 hover:bg-white rounded-lg transition-colors">
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </button>
                    <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg transition-colors">
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </div>
              )}

              {publishState === 'error' && (
                <div className="py-8 space-y-6 text-center">
                  <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Error al publicar</h3>
                    <p className="text-sm text-red-500 mt-2">{error}</p>
                  </div>
                  <button onClick={handleReset} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vercel Edge Network</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
