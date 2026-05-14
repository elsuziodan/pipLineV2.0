'use client';
import { LogoCloudBlockProps } from '@/types/schema';

export default function LogoCloud({ title, logos, theme, primaryColor }: LogoCloudBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';

  return (
    <section className={`py-16 sm:py-24 ${bg}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {title && <h2 className="text-center text-lg font-semibold leading-8 mb-12 opacity-60 uppercase tracking-widest">{title}</h2>}
        <div className="mx-auto grid max-w-lg grid-cols-2 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-4 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {logos.map((logo, idx) => (
            <img
              key={idx}
              className="col-span-2 max-h-12 w-full object-contain lg:col-span-1 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              src={logo}
              alt={`Logo ${idx}`}
              width={158}
              height={48}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
