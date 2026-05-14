'use client';
import { CallToActionBlockProps } from '@/types/schema';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function CallToAction({ title, subtitle, ctaText, theme, primaryColor }: CallToActionBlockProps & { primaryColor: string }) {
  const isBrand = theme === 'brand';
  const isDark = theme === 'dark';

  return (
    <section className="py-16 px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className={`relative max-w-7xl mx-auto rounded-[3.5rem] overflow-hidden p-12 sm:p-24 text-center ${
          isBrand 
            ? 'text-white' 
            : isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
        }`}
        style={isBrand ? { backgroundColor: primaryColor } : {}}
      >
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-8 leading-tight">
            {title}
          </h2>
          <p className={`text-lg sm:text-xl mb-12 leading-relaxed ${isBrand || isDark ? 'text-indigo-50' : 'text-slate-600'}`}>
            {subtitle}
          </p>
          <div className="flex justify-center">
            <button 
              className="group flex items-center gap-2 px-10 py-5 text-lg font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={isBrand ? { 
                backgroundColor: 'white', 
                color: primaryColor 
              } : {
                backgroundColor: primaryColor,
                color: 'white'
              }}
            >
              {ctaText}
              <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        {isBrand && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -ml-48 -mb-48" />
          </>
        )}
      </motion.div>
    </section>
  );
}
