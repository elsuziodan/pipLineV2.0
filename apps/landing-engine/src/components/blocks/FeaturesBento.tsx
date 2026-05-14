'use client';
import { FeaturesBentoBlockProps } from '@/types/schema';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { hexWithAlpha } from '@/lib/color';

export default function FeaturesBento({ title, subtitle, features, theme, primaryColor }: FeaturesBentoBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';

  return (
    <section className={`py-24 sm:py-32 relative overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center mb-20"
        >
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">{title}</h2>
          {subtitle && (
            <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {subtitle}
            </p>
          )}
        </motion.div>
        
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = (feature.iconName && (Icons as any)[feature.iconName]) || Icons.CheckCircle2;
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`group flex flex-col rounded-[2.5rem] p-10 transition-all ${
                  isDark 
                    ? 'bg-slate-900/40 border border-white/5 backdrop-blur-xl hover:bg-slate-900/60 hover:border-white/10' 
                    : 'bg-white border border-slate-200/60 hover:shadow-2xl hover:shadow-slate-200/50'
                }`}
              >
                <div 
                  className="flex h-14 w-14 mb-8 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: isDark ? hexWithAlpha(primaryColor, 0.1) : hexWithAlpha(primaryColor, 0.05) }}
                >
                  <Icon className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                
                <dt className="text-xl font-bold mb-4 tracking-tight">
                  {feature.title}
                </dt>
                
                <dd className={`text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {feature.description}
                </dd>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Subtle Background Decoration */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none" 
        style={isDark ? { background: `radial-gradient(circle at center, ${primaryColor}, transparent 70%)` } : {}}
      />
    </section>
  );
}
