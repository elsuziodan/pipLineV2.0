/**
 * Convierte un color hex (#6366f1) a hex con alpha (#6366f11A)
 * @param hex - Color en formato #RRGGBB
 * @param opacity - Opacidad de 0 a 1
 */
export function hexWithAlpha(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#')) return hex;
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${hex}${alpha}`;
}

/**
 * Verifica si un string es un color hex válido (#RRGGBB)
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
