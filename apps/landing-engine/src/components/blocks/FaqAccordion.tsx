'use client';
import { FaqAccordionBlockProps } from '@/types/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export default function FaqAccordion({ title, items, theme, primaryColor }: FaqAccordionBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className={`py-24 sm:py-32 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h2 className="text-4xl font-bold tracking-tight text-center mb-16">{title}</h2>
        
        <div className="space-y-4">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            
            return (
              <div 
                key={idx}
                className={`rounded-2xl overflow-hidden border transition-colors ${
                  isDark 
                    ? 'border-white/10 bg-slate-900/50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-lg font-semibold pr-8">{item.question}</span>
                  {isOpen ? (
                    <Minus className="h-5 w-5" style={{ color: primaryColor }} />
                  ) : (
                    <Plus className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className={`p-6 pt-0 text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
