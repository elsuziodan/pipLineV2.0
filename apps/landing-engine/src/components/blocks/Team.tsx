'use client';
import { TeamBlockProps } from '@/types/schema';

export default function Team({ title, subtitle, members, theme, primaryColor }: TeamBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';
  const cardBg = isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200/60';

  return (
    <section className={`py-24 sm:py-32 ${bg}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">{title}</h2>
          {subtitle && <p className="text-lg leading-relaxed opacity-70">{subtitle}</p>}
        </div>
        <ul role="list" className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 lg:grid-cols-3 xl:col-span-2">
          {members.map((person, idx) => (
            <li key={idx}>
              <div className="flex items-center gap-x-6">
                <img className="h-24 w-24 rounded-[2rem] object-cover shadow-xl" src={person.image} alt={person.name} />
                <div>
                  <h3 className="text-lg font-bold leading-7 tracking-tight">{person.name}</h3>
                  <p className="text-sm font-semibold leading-6" style={{ color: primaryColor }}>{person.role}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
