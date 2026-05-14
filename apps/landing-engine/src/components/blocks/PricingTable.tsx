'use client';
import { PricingTableBlockProps } from '@/types/schema';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { hexWithAlpha } from '@/lib/color';

export default function PricingTable({ title, subtitle, tiers, theme, primaryColor }: PricingTableBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';

  return (
    <section className={`py-24 sm:py-32 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
          {subtitle && (
            <p className={`mt-6 text-lg leading-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
          {tiers.map((tier, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`relative flex flex-col p-8 rounded-[2.5rem] ring-1 ${
                tier.popular 
                  ? 'scale-105 z-10 shadow-2xl' 
                  : `ring-slate-200 ${isDark ? 'ring-white/10' : ''}`
              } ${isDark ? 'bg-slate-800/50 backdrop-blur-xl' : 'bg-white'}`}
              style={tier.popular ? { 
                ringColor: primaryColor, 
                boxShadow: `0 25px 50px -12px ${hexWithAlpha(primaryColor, 0.25)}`,
                outline: `1px solid ${primaryColor}`
              } : {}}
            >
              {tier.popular && (
                <div 
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-xs font-bold rounded-full uppercase tracking-widest"
                  style={{ backgroundColor: primaryColor }}
                >
                  Más Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-x-1">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                </div>
                <p className={`mt-4 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                className="w-full py-4 px-6 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                style={tier.popular ? { 
                  backgroundColor: primaryColor, 
                  color: 'white',
                  boxShadow: `0 10px 15px -3px ${hexWithAlpha(primaryColor, 0.4)}`
                } : {
                  backgroundColor: isDark ? 'white' : '#0f172a',
                  color: isDark ? '#0f172a' : 'white'
                }}
              >
                {tier.ctaText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
