'use client';
import { useEditorStore } from '@/store/editorStore';
import BlockRenderer from '@/components/BlockRenderer';
import NavBar from '@/components/blocks/NavBar';
import Footer from '@/components/blocks/Footer';
import { useEffect, useState } from 'react';

export default function PreviewPage() {
  const blocks = useEditorStore((state) => state.document.blocks);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Escuchar cambios de localStorage desde la pestaña del editor
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'landing-engine-storage' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.state?.document) {
            useEditorStore.setState({ document: parsed.state.document });
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main>
        {blocks.filter(b => !b.hidden).length === 0 ? (
          <div className="py-40 text-center">
            <h1 className="text-2xl font-bold text-slate-300">No hay contenido publicado</h1>
          </div>
        ) : (
          <BlockRenderer blocks={blocks.filter(b => !b.hidden)} />
        )}
      </main>
      <Footer />
    </div>
  );
}
