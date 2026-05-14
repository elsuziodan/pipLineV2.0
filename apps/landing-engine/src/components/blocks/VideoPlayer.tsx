'use client';
import { VideoPlayerBlockProps } from '@/types/schema';

export default function VideoPlayer({ title, subtitle, videoUrl, theme, primaryColor }: VideoPlayerBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';
  
  return (
    <section className={`py-24 sm:py-32 ${bg}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">{title}</h2>
          {subtitle && <p className="text-lg leading-relaxed opacity-70">{subtitle}</p>}
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-900 bg-slate-900 ring-1 ring-slate-800">
            <iframe
              src={videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
