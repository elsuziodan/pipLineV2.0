'use client';
import { Plus, Minus } from 'lucide-react';

interface ArrayEditorField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'mono';  // mono = font monospace pequeño
  placeholder?: string;
}

interface ArrayEditorProps {
  items: any[];
  fields: ArrayEditorField[];
  onUpdate: (index: number, field: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
}

export default function ArrayEditor({ items, fields, onUpdate, onAdd, onRemove, addLabel }: ArrayEditorProps) {
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
          <button 
            onClick={() => onRemove(idx)}
            className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-300 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <Minus className="w-3 h-3" />
          </button>
          
          {fields.map((field) => {
            const value = item[field.key] ?? '';
            
            if (field.type === 'textarea') {
              return (
                <textarea
                  key={field.key}
                  className="w-full bg-transparent text-[11px] text-slate-500 outline-none resize-none"
                  value={value}
                  onChange={(e) => onUpdate(idx, field.key, e.target.value)}
                  rows={2}
                  placeholder={field.placeholder || field.label}
                />
              );
            }
            
            if (field.type === 'mono') {
              return (
                <input
                  key={field.key}
                  className="bg-transparent text-[10px] font-mono text-slate-400 outline-none w-full"
                  value={value}
                  onChange={(e) => onUpdate(idx, field.key, e.target.value)}
                  placeholder={field.placeholder || field.label}
                />
              );
            }
            
            // default: text
            return (
              <input
                key={field.key}
                className="w-full bg-transparent text-xs font-bold outline-none"
                value={value}
                onChange={(e) => onUpdate(idx, field.key, e.target.value)}
                placeholder={field.placeholder || field.label}
              />
            );
          })}
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="w-full p-3 border border-dashed border-slate-300 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}
