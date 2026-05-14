'use client';
import { useState, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { X, Sparkles, Loader2, Wand2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateBlocks } from '@/lib/validate';

export default function AiModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  const setBlocks = useEditorStore((state) => state.setBlocks);
  const setBusinessName = useEditorStore((state) => state.setBusinessName);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.blocks) {
        const validBlocks = validateBlocks(data.blocks);
        if (validBlocks.length === 0) {
          throw new Error('La IA no generó bloques válidos. Intenta con una descripción más detallada.');
        }
        setBlocks(validBlocks);
        if (data.businessName) setBusinessName(data.businessName);
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('La generación tardó demasiado o fue cancelada. Intenta de nuevo.');
      } else {
        setError(err.message || 'Ocurrió un error inesperado');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Cerebro Mágico AI</h2>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">Powered by Llama 3.1 (NVIDIA)</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={loading}
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8">
              {!loading ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">¿Cuál es el negocio?</label>
                    <textarea
                      autoFocus
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ej: Un taller mecánico premium en Monterrey especializado en autos deportivos alemanes..."
                      className="w-full h-32 p-4 text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Wand2 className="w-5 h-5" />
                    Generar Landing Page Completa
                  </button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Llama 3.1 está diseñando...</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-[250px] mx-auto">
                      Estamos redactando los textos, eligiendo iconos y estructurando tu página perfecta.
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="mt-4 px-6 py-2 text-xs font-bold text-slate-400 hover:text-red-500 border border-slate-200 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">NVIDIA NIM Infrastructure Active</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
