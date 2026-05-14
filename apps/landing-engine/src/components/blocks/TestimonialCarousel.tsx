'use client';
import { TestimonialCarouselBlockProps } from '@/types/schema';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { hexWithAlpha } from '@/lib/color';

export default function TestimonialCarousel({ title, testimonials, theme, primaryColor }: TestimonialCarouselBlockProps & { primaryColor: string }) {
  const isDark = theme === 'dark';

  return (
    <section className={`py-24 sm:py-32 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center mb-20">
          <h2 
            className="text-sm font-bold leading-8 tracking-[0.2em] uppercase"
            style={{ color: primaryColor }}
          >
            Testimonios
          </h2>
          <p className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{title}</p>
        </div>
        
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`flex flex-col rounded-[2rem] p-8 transition-all hover:scale-[1.02] ${
                  isDark ? 'bg-slate-800/40 border border-white/5 shadow-2xl' : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/40'
                }`}
              >
                {testimonial.rating && (
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < testimonial.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                )}
                <blockquote className={`text-lg leading-relaxed flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <p>{`"${testimonial.quote}"`}</p>
                </blockquote>
                <figcaption className="mt-10 flex items-center gap-x-4 border-t border-slate-100 pt-6">
                  {testimonial.avatarUrl ? (
                    <img className="h-12 w-12 rounded-2xl bg-slate-50 object-cover" src={testimonial.avatarUrl} alt="" />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg"
                      style={{ 
                        backgroundColor: isDark ? hexWithAlpha(primaryColor, 0.2) : hexWithAlpha(primaryColor, 0.1),
                        color: primaryColor 
                      }}
                    >
                      {testimonial.authorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm tracking-tight">{testimonial.authorName}</div>
                    {testimonial.authorRole && <div className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{testimonial.authorRole}</div>}
                  </div>
                </figcaption>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
