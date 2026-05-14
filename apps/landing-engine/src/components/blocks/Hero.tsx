'use client';
import { HeroBlockProps } from '@/types/schema';
import { motion } from 'framer-motion';
import { hexWithAlpha } from '@/lib/color';

export default function Hero({ headline, subheadline, ctaText, media, theme, layout, primaryColor }: HeroBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';
  const isBrand = theme === 'brand';
  const isSplit = layout === 'split';

  const containerBg = isBrand ? '' : isDark ? 'bg-slate-950' : 'bg-white';
  const containerStyle = isBrand ? { backgroundColor: primaryColor } : {};
  const textColor = (isDark || isBrand) ? 'text-white' : 'text-slate-900';
  const subColor = (isDark || isBrand) ? 'text-indigo-100/80' : 'text-slate-600';

  return (
    <section className={`relative min-h-[80vh] flex items-center overflow-hidden ${containerBg} ${textColor}`} style={containerStyle}>
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {media?.type === 'image' && media.src ? (
          <>
            <img src={media.src} alt="Hero" className="w-full h-full object-cover" />
            <div 
              className="absolute inset-0 backdrop-blur-[2px]" 
              style={{ 
                backgroundColor: isDark ? 'rgba(2, 6, 23, 0.8)' : isBrand ? hexWithAlpha(primaryColor, 0.9) : 'rgba(255, 255, 255, 0.6)' 
              }} 
            />
          </>
        ) : media?.type === 'solid' ? (
          <div style={{ backgroundColor: media.color || primaryColor }} className="w-full h-full" />
        ) : null}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-24">
        <div className={`flex flex-col ${isSplit ? 'lg:flex-row lg:items-center lg:gap-16' : 'items-center text-center'}`}>
          <div className={`${isSplit ? 'lg:w-1/2' : 'max-w-3xl'}`}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-black tracking-tight sm:text-7xl leading-[1.1]"
            >
              {headline}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`mt-8 text-lg sm:text-xl leading-8 ${subColor}`}
            >
              {subheadline}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 flex items-center gap-x-6"
            >
              <button 
                className="px-8 py-4 rounded-2xl text-lg font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: isBrand ? 'white' : primaryColor,
                  color: isBrand ? primaryColor : 'white'
                }}
              >
                {ctaText}
              </button>
            </motion.div>
          </div>
          
          {isSplit && media?.type === 'image' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mt-16 lg:mt-0 lg:w-1/2"
            >
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/20">
                <img src={media.src} alt="Hero illustration" className="w-full aspect-[4/3] object-cover" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Decorative Gradients */}
      {!isBrand && (
        <div 
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none" 
          style={{ backgroundColor: hexWithAlpha(primaryColor, 0.1) }}
        />
      )}
    </section>
  );
}
