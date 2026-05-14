'use client';
import { GalleryBlockProps } from '@/types/schema';

export default function Gallery({ title, subtitle, columns, images, theme, primaryColor }: GalleryBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200/60';
  
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[columns] || 'md:grid-cols-3';

  return (
    <section className={`py-24 sm:py-32 ${bg}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">{title}</h2>
          {subtitle && <p className="text-lg leading-relaxed opacity-70">{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {images.map((img, idx) => (
            <div key={idx} className={`group overflow-hidden rounded-[2.5rem] border transition-all hover:shadow-2xl ${cardBg}`}>
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={img.url} 
                  alt={img.alt || title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              {img.caption && (
                <div className="p-6">
                  <p className="text-sm font-bold opacity-80">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
