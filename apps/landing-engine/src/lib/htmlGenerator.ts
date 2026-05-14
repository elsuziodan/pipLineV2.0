import { SiteDocument, BlockProps } from '@/types/schema';
import { hexWithAlpha } from './color';

/**
 * Genera un HTML completo y autónomo a partir de un SiteDocument.
 * Usa Tailwind CDN para los estilos.
 */
export function generateStaticHTML(doc: SiteDocument): string {
  const visibleBlocks = doc.blocks.filter(b => !b.hidden);
  const blocksHtml = visibleBlocks.map(b => renderBlock(b, doc.primaryColor)).join('\n');
  
  const metaTitle = escapeHtml(doc.seo?.title || doc.businessName);
  const metaDesc = escapeHtml(doc.seo?.description || `Página oficial de ${doc.businessName}`);
  const metaImg = doc.seo?.ogImage ? `<meta property="og:image" content="${escapeHtml(doc.seo.ogImage)}">` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${metaTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  ${metaImg}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            display: ['Outfit', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', system-ui, sans-serif; letter-spacing: -0.025em; }
    html { scroll-behavior: smooth; }
  </style>
</head>
<body class="min-h-screen bg-white antialiased">
  ${renderNavbar(doc)}
  <main>
    ${blocksHtml}
  </main>
  ${renderFooter(doc)}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================
// NAVBAR
// ============================================
function renderNavbar(doc: SiteDocument): string {
  const pc = doc.primaryColor;
  const initial = doc.businessName.charAt(0).toUpperCase();
  
  const links = doc.blocks
    .filter(b => !b.hidden && b.type !== 'Hero' && (b as any).title)
    .slice(0, 4)
    .map(b => `<a href="#${b.id}" class="text-sm font-bold text-slate-600 hover:opacity-80 transition-colors">${escapeHtml((b as any).title)}</a>`)
    .join('\n          ');

  return `
  <nav class="sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style="background-color:${pc}">
          <span class="text-white font-black text-xl italic">${initial}</span>
        </div>
        <span class="text-xl font-black text-slate-900 tracking-tighter">${escapeHtml(doc.businessName)}</span>
      </div>
      <div className="hidden md:flex items-center gap-8">
        ${links}
        <button class="px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all" style="background-color:${pc}">
          Comenzar
        </button>
      </div>
    </div>
  </nav>`;
}

// ============================================
// FOOTER
// ============================================
function renderFooter(doc: SiteDocument): string {
  const pc = doc.primaryColor;
  const bName = escapeHtml(doc.businessName);
  const initial = doc.businessName.charAt(0).toUpperCase();
  const year = new Date().getFullYear();
  const emailDomain = doc.businessName.toLowerCase().replace(/\s/g, '');

  return `
  <footer class="bg-slate-950 text-slate-400 py-24 border-t border-slate-900">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-16">
        <div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color:${pc}">
              <span class="text-white font-black text-sm italic">${initial}</span>
            </div>
            <span class="text-xl font-bold text-white tracking-tighter">${bName}</span>
          </div>
          <p class="text-sm leading-relaxed">Creamos soluciones innovadoras para impulsar el crecimiento de tu negocio.</p>
        </div>
        <div>
          <h3 class="text-white font-bold mb-6 text-sm uppercase tracking-widest">Empresa</h3>
          <ul class="space-y-4 text-sm">
            <li>Sobre Nosotros</li><li>Servicios</li><li>Casos de Éxito</li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-bold mb-6 text-sm uppercase tracking-widest">Soporte</h3>
          <ul class="space-y-4 text-sm">
            <li>Centro de Ayuda</li><li>Contacto</li><li>Privacidad</li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contacto</h3>
          <ul class="space-y-4 text-sm">
            <li>contacto@${emailDomain}.com</li>
          </ul>
        </div>
      </div>
      <div class="mt-20 pt-8 border-t border-slate-900 text-center">
        <p class="text-xs font-medium uppercase tracking-widest">© ${year} ${bName}. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>`;
}

// ============================================
// BLOCK DISPATCHER
// ============================================
function renderBlock(block: BlockProps, pc: string): string {
  switch (block.type) {
    case 'Hero': return renderHero(block, pc);
    case 'FeaturesBento': return renderFeatures(block, pc);
    case 'TestimonialCarousel': return renderTestimonials(block, pc);
    case 'PricingTable': return renderPricing(block, pc);
    case 'FaqAccordion': return renderFaq(block, pc);
    case 'CallToAction': return renderCta(block, pc);
    case 'Gallery': return renderGallery(block, pc);
    case 'VideoPlayer': return renderVideo(block, pc);
    case 'Team': return renderTeam(block, pc);
    case 'LogoCloud': return renderLogoCloud(block, pc);
    default: return '';
  }
}

// ============================================
// HERO
// ============================================
function renderHero(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const isBrand = block.theme === 'brand';
  const textColor = (isDark || isBrand) ? 'text-white' : 'text-slate-900';
  const subColor = (isDark || isBrand) ? 'text-indigo-100/80' : 'text-slate-600';
  const containerBg = isBrand ? '' : isDark ? 'bg-slate-950' : 'bg-white';
  const containerStyle = isBrand ? `background-color:${pc}` : '';
  
  const btnBg = isBrand ? 'white' : pc;
  const btnText = isBrand ? pc : 'white';

  let bgMedia = '';
  if (block.media?.type === 'image' && block.media.src) {
    const overlayColor = isDark ? 'rgba(2,6,23,0.8)' : isBrand ? hexWithAlpha(pc, 0.9) : 'rgba(255,255,255,0.6)';
    bgMedia = `
      <div class="absolute inset-0 z-0">
        <img src="${block.media.src}" alt="Hero" class="w-full h-full object-cover">
        <div class="absolute inset-0" style="background-color:${overlayColor}"></div>
      </div>`;
  } else if (block.media?.type === 'solid') {
    bgMedia = `<div class="absolute inset-0 z-0" style="background-color:${block.media.color || pc}"></div>`;
  }

  return `
  <section id="${block.id}" class="relative min-h-[80vh] flex items-center overflow-hidden ${containerBg} ${textColor}" style="${containerStyle}">
    ${bgMedia}
    <div class="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-24">
      <div class="flex flex-col items-center text-center">
        <div class="max-w-3xl">
          <h1 class="text-5xl font-black tracking-tight sm:text-7xl leading-tight">${escapeHtml(block.headline)}</h1>
          <p class="mt-8 text-lg sm:text-xl leading-8 ${subColor}">${escapeHtml(block.subheadline)}</p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <button class="px-8 py-4 rounded-2xl text-lg font-bold shadow-xl transition-all hover:scale-105" style="background-color:${btnBg};color:${btnText}">
              ${escapeHtml(block.ctaText)}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

// ============================================
// FEATURES BENTO
// ============================================
function renderFeatures(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-slate-900/40 border border-white/5' : 'bg-white border border-slate-200/60';
  const descColor = isDark ? 'text-slate-400' : 'text-slate-600';
  const iconBg = isDark ? hexWithAlpha(pc, 0.1) : hexWithAlpha(pc, 0.05);

  const featuresHtml = (block.features || []).map((f: any) => `
        <div class="group flex flex-col rounded-[2.5rem] p-10 transition-all ${cardBg} hover:shadow-2xl">
          <div class="flex h-14 w-14 mb-8 items-center justify-center rounded-2xl" style="background-color:${iconBg}">
            <svg class="h-8 w-8" style="color:${pc}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <dt class="text-xl font-bold mb-4 tracking-tight">${escapeHtml(f.title)}</dt>
          <dd class="text-base leading-relaxed ${descColor}">${escapeHtml(f.description)}</dd>
        </div>`).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-20">
        <h2 class="text-4xl font-bold tracking-tight sm:text-5xl mb-6">${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<p class="text-lg leading-relaxed ${descColor}">${escapeHtml(block.subtitle)}</p>` : ''}
      </div>
      <div class="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
        ${featuresHtml}
      </div>
    </div>
  </section>`;
}

// ============================================
// TESTIMONIALS
// ============================================
function renderTestimonials(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-slate-800/40 border border-white/5' : 'bg-white border border-slate-200';
  const quoteColor = isDark ? 'text-slate-300' : 'text-slate-600';
  const avatarBg = isDark ? hexWithAlpha(pc, 0.2) : hexWithAlpha(pc, 0.1);

  const cards = (block.testimonials || []).map((t: any) => {
    const stars = [...Array(5)].map((_, i) => 
      `<svg class="h-4 w-4 ${i < (t.rating || 5) ? 'text-yellow-400' : 'text-slate-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
    ).join('');

    return `
          <div class="flex flex-col rounded-[2rem] p-8 ${cardBg} shadow-xl">
            <div class="flex gap-1 mb-6">${stars}</div>
            <blockquote class="text-lg leading-relaxed flex-1 ${quoteColor}"><p>"${escapeHtml(t.quote)}"</p></blockquote>
            <figcaption class="mt-10 flex items-center gap-x-4 border-t border-slate-100 pt-6">
              <div class="h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg" style="background-color:${avatarBg};color:${pc}">${t.authorName?.charAt(0) || '?'}</div>
              <div>
                <div class="font-bold text-sm">${escapeHtml(t.authorName)}</div>
                ${t.authorRole ? `<div class="text-xs text-slate-400">${escapeHtml(t.authorRole)}</div>` : ''}
              </div>
            </figcaption>
          </div>`;
  }).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-xl text-center mb-20">
        <h2 class="text-sm font-bold tracking-widest uppercase" style="color:${pc}">Testimonios</h2>
        <p class="mt-4 text-4xl font-black tracking-tight sm:text-5xl">${escapeHtml(block.title)}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${cards}
      </div>
    </div>
  </section>`;
}

// ============================================
// PRICING TABLE
// ============================================
function renderPricing(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';

  const tiers = (block.tiers || []).map((t: any) => {
    const popularStyle = t.popular ? `outline:2px solid ${pc};box-shadow:0 25px 50px -12px ${hexWithAlpha(pc, 0.25)}` : '';
    const features = (t.features || []).map((f: string) => `
              <li class="flex items-start gap-3 text-sm">
                <svg class="h-5 w-5 shrink-0" style="color:${pc}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>${escapeHtml(f)}</span>
              </li>`).join('\n');

    const btnStyle = t.popular 
      ? `background-color:${pc};color:white;box-shadow:0 10px 15px -3px ${hexWithAlpha(pc, 0.4)}`
      : `background-color:${isDark ? 'white' : '#0f172a'};color:${isDark ? '#0f172a' : 'white'}`;

    return `
          <div class="relative flex flex-col p-8 rounded-[2.5rem] ${t.popular ? 'scale-105 z-10' : ''} ${isDark ? 'bg-slate-800/50' : 'bg-white ring-1 ring-slate-200'}" style="${popularStyle}">
            ${t.popular ? `<div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-xs font-bold rounded-full uppercase tracking-widest" style="background-color:${pc}">Más Popular</div>` : ''}
            <div class="mb-8">
              <h3 class="text-lg font-bold mb-2">${escapeHtml(t.name)}</h3>
              <div class="text-4xl font-extrabold tracking-tight">${escapeHtml(t.price)}</div>
              <p class="mt-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}">${escapeHtml(t.description)}</p>
            </div>
            <ul class="space-y-4 mb-10 flex-1">${features}</ul>
            <button class="w-full py-4 px-6 rounded-2xl text-sm font-bold transition-all hover:scale-105" style="${btnStyle}">${escapeHtml(t.ctaText)}</button>
          </div>`;
  }).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h2 class="text-4xl font-bold tracking-tight sm:text-5xl">${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<p class="mt-6 text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}">${escapeHtml(block.subtitle)}</p>` : ''}
      </div>
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
        ${tiers}
      </div>
    </div>
  </section>`;
}

// ============================================
// FAQ ACCORDION (con JS inline para toggle)
// ============================================
function renderFaq(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-white';
  const answerColor = isDark ? 'text-slate-400' : 'text-slate-600';

  const items = (block.items || []).map((item: any, idx: number) => `
        <div class="rounded-2xl overflow-hidden border ${cardBg}">
          <button onclick="document.getElementById('faq-answer-${block.id}-${idx}').classList.toggle('hidden')" class="w-full flex items-center justify-between p-6 text-left">
            <span class="text-lg font-semibold pr-8">${escapeHtml(item.question)}</span>
            <svg class="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </button>
          <div id="faq-answer-${block.id}-${idx}" class="hidden p-6 pt-0 text-base leading-relaxed ${answerColor}">
            ${escapeHtml(item.answer)}
          </div>
        </div>`).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-4xl px-6 lg:px-8">
      <h2 class="text-4xl font-bold tracking-tight text-center mb-16">${escapeHtml(block.title)}</h2>
      <div class="space-y-4">${items}</div>
    </div>
  </section>`;
}

// ============================================
// CALL TO ACTION
// ============================================
function renderCta(block: any, pc: string): string {
  const isBrand = block.theme === 'brand';
  const isDark = block.theme === 'dark';
  const bgClass = isBrand ? '' : isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900';
  const bgStyle = isBrand ? `background-color:${pc}` : '';
  const textClass = isBrand ? 'text-white' : '';
  const subColor = (isBrand || isDark) ? 'text-indigo-50' : 'text-slate-600';
  const btnBg = isBrand ? 'white' : pc;
  const btnText = isBrand ? pc : 'white';

  return `
  <section id="${block.id}" class="py-16 px-6 lg:px-8">
    <div class="relative max-w-7xl mx-auto rounded-[3.5rem] overflow-hidden p-12 sm:p-24 text-center ${bgClass} ${textClass}" style="${bgStyle}">
      <div class="relative z-10 max-w-3xl mx-auto">
        <h2 class="text-4xl font-extrabold tracking-tight sm:text-6xl mb-8">${escapeHtml(block.title)}</h2>
        <p class="text-lg sm:text-xl mb-12 leading-relaxed ${subColor}">${escapeHtml(block.subtitle)}</p>
        <div class="flex justify-center">
          <button class="flex items-center gap-2 px-10 py-5 text-lg font-bold rounded-2xl shadow-2xl transition-all hover:scale-105" style="background-color:${btnBg};color:${btnText}">
            ${escapeHtml(block.ctaText)} →
          </button>
        </div>
      </div>
      ${isBrand ? '<div class="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div><div class="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -ml-48 -mb-48"></div>' : ''}
    </div>
  </section>`;
}

// ============================================
// GALLERY
// ============================================
function renderGallery(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200/60';
  
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[block.columns] || 'md:grid-cols-3';

  const imagesHtml = (block.images || []).map((img: any) => `
        <div class="group overflow-hidden rounded-[2.5rem] border transition-all hover:shadow-2xl ${cardBg}">
          <div class="aspect-[4/3] overflow-hidden">
            <img src="${img.url}" alt="${img.alt || ''}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
          </div>
          ${img.caption ? `<div class="p-6"><p class="text-sm font-bold opacity-80">${escapeHtml(img.caption)}</p></div>` : ''}
        </div>`).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-20">
        <h2 class="text-4xl font-bold tracking-tight sm:text-5xl mb-6">${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<p class="text-lg leading-relaxed opacity-70">${escapeHtml(block.subtitle)}</p>` : ''}
      </div>
      <div class="grid grid-cols-1 ${gridCols} gap-8">
        ${imagesHtml}
      </div>
    </div>
  </section>`;
}

// ============================================
// VIDEO PLAYER
// ============================================
function renderVideo(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h2 class="text-4xl font-bold tracking-tight sm:text-5xl mb-6">${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<p class="text-lg leading-relaxed opacity-70">${escapeHtml(block.subtitle)}</p>` : ''}
      </div>
      <div class="max-w-4xl mx-auto">
        <div class="aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-900 bg-slate-900 ring-1 ring-slate-800">
          <iframe src="${block.videoUrl}" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </section>`;
}

// ============================================
// TEAM
// ============================================
function renderTeam(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';

  const membersHtml = (block.members || []).map((person: any) => `
          <li>
            <div class="flex items-center gap-x-6">
              <img class="h-24 w-24 rounded-[2rem] object-cover shadow-xl" src="${person.image}" alt="${person.name}">
              <div>
                <h3 class="text-lg font-bold leading-7 tracking-tight">${escapeHtml(person.name)}</h3>
                <p class="text-sm font-semibold leading-6" style="color:${pc}">${escapeHtml(person.role)}</p>
              </div>
            </div>
          </li>`).join('\n');

  return `
  <section id="${block.id}" class="py-24 sm:py-32 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center mb-20">
        <h2 class="text-4xl font-bold tracking-tight sm:text-5xl mb-6">${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<p class="text-lg leading-relaxed opacity-70">${escapeHtml(block.subtitle)}</p>` : ''}
      </div>
      <ul role="list" class="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 lg:grid-cols-3 xl:col-span-2">
        ${membersHtml}
      </ul>
    </div>
  </section>`;
}

// ============================================
// LOGO CLOUD
// ============================================
function renderLogoCloud(block: any, pc: string): string {
  const isDark = block.theme === 'dark';
  const bg = isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';

  const logosHtml = (block.logos || []).map((logo: string, idx: number) => `
          <img class="col-span-2 max-h-12 w-full object-contain lg:col-span-1 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300" src="${logo}" alt="Logo ${idx}" width="158" height="48">`).join('\n');

  return `
  <section id="${block.id}" class="py-16 sm:py-24 ${bg}">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      ${block.title ? `<h2 class="text-center text-lg font-semibold leading-8 mb-12 opacity-60 uppercase tracking-widest">${escapeHtml(block.title)}</h2>` : ''}
      <div class="mx-auto grid max-w-lg grid-cols-2 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-4 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-4">
        ${logosHtml}
      </div>
    </div>
  </section>`;
}
