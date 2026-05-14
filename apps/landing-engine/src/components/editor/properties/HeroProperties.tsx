'use client';
import { HeroBlockProps } from '@/types/schema';
import { Image as ImageIcon } from 'lucide-react';
import SectionTitle from './SectionTitle';

interface Props {
  block: HeroBlockProps;
  onUpdate: (key: string, value: any, save?: boolean) => void;
}

export default function HeroProperties({ block, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Imagen y Fondo" icon={ImageIcon} />
        <div className="space-y-4">
          <div className="flex bg-slate-50 p-1 rounded-xl">
            <button
              onClick={() => onUpdate('media', { ...(block.media || {}), type: 'image' }, true)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${block.media?.type === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >Imagen</button>
            <button
              onClick={() => onUpdate('media', { ...(block.media || {}), type: 'solid' }, true)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${block.media?.type === 'solid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >Color</button>
          </div>

          {block.media?.type === 'image' ? (
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">URL de Imagen</label>
              <input
                type="text"
                value={block.media?.src || ''}
                onChange={(e) => onUpdate('media', { ...(block.media || {}), src: e.target.value })}
                className="w-full p-2.5 text-[11px] font-medium border border-slate-200 rounded-xl outline-none"
                placeholder="https://unsplash.com/..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Color de Fondo</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={block.media?.color || '#f1f5f9'}
                  onChange={(e) => onUpdate('media', { ...(block.media || {}), color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                />
                <input
                  type="text"
                  value={block.media?.color || '#f1f5f9'}
                  onChange={(e) => onUpdate('media', { ...(block.media || {}), color: e.target.value })}
                  className="flex-1 p-2.5 text-xs font-mono border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
