'use client';
import { useEditorStore } from '@/store/editorStore';
import { X, Copy, Check, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { validateBlocks } from '@/lib/validate';

export default function JsonConsole() {
  const isOpen = useEditorStore((state) => state.viewSourceOpen);
  const setOpen = useEditorStore((state) => state.setViewSourceOpen);
  const document = useEditorStore((state) => state.document);
  const importDocument = useEditorStore((state) => state.importDocument);

  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const currentJson = JSON.stringify(document, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        const validBlocks = validateBlocks(parsed.blocks);
        importDocument({
          ...parsed,
          blocks: validBlocks
        });
        setJsonInput('');
        setOpen(false);
        alert('Configuración importada con éxito');
      }
    } catch (e) {
      alert('JSON inválido. Por favor revisa el formato.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="ml-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Site Configuration (JSON)</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Export */}
          <div className="flex-1 p-6 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Exportar (Copia este JSON)</label>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
            <pre className="flex-1 bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-indigo-300 overflow-auto custom-scrollbar border border-slate-800/50">
              {currentJson}
            </pre>
          </div>

          {/* Right: Import */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Importar (Pega tu JSON)</label>
              <button 
                onClick={handleImport}
                disabled={!jsonInput}
                className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                Aplicar
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{ "blocks": [...] }'
              className="flex-1 bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-400 focus:text-white outline-none border border-slate-800/50 focus:border-indigo-500/50 transition-colors resize-none custom-scrollbar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
