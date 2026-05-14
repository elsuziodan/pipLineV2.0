'use client';
import { useEditorStore } from '@/store/editorStore';

export default function NavBar() {
  const businessName = useEditorStore((state) => state.document.businessName);
  const blocks = useEditorStore((state) => state.document.blocks);
  const primaryColor = useEditorStore((state) => state.document.primaryColor);

  // Generar links dinámicos desde los bloques que tengan título
  const menuItems = blocks
    .filter(b => !b.hidden && b.type !== 'Hero' && (b as any).title)
    .slice(0, 4) // máximo 4 links
    .map(b => ({ id: b.id, label: (b as any).title as string }));

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-white font-black text-xl italic">
              {businessName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">{businessName}</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <a 
              key={item.id}
              href={`#${item.id}`}
              className="text-sm font-bold text-slate-600 hover:opacity-80 transition-colors"
            >
              {item.label}
            </a>
          ))}
          <button 
            className="px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            Comenzar
          </button>
        </div>
      </div>
    </nav>
  );
}
