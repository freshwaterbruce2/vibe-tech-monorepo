/**
 * Color utility functions for theme management
 */

/**
 * Convert hex color to HSL format
 * @param hex - Hex color string (e.g., "#0071CE")
 * @returns HSL string without % signs for CSS variables (e.g., "206 100 40")
 */
export function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  const l = sum / 2;

  let h = 0;
  let s = 0;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return in the format expected by shadcn/ui (without % signs)
  return `${h} ${s}% ${lPercent}%`;
}

/**
 * Get a foreground color that contrasts well with the given background
 * @param hex - Background hex color
 * @returns HSL string for foreground color
 */
export function getForegroundColor(hex: string): string {
  // Remove the hash if present
  hex = hex.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white or dark gray based on luminance
  if (luminance > 0.5) {
    // Dark text on light background
    return '222.2 47.4% 11.2%'; // Dark gray
  } else {
    // Light text on dark background
    return '210 40% 98%'; // Almost white
  }
}

/**
 * Generate shade variations of a color
 * @param hex - Base hex color
 * @param factor - Darkness factor (0.8 = 20% darker, 1.2 = 20% lighter)
 * @returns Hex color string
 */
export function shadeColor(hex: string, factor: number): string {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Generate a muted version of a color
 * @param hex - Base hex color
 * @returns HSL string for muted color
 */
export function getMutedColor(hex: string): string {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Mix with gray to create muted version
  const gray = 0.5;
  const mixFactor = 0.3; // 30% original color, 70% gray

  const mixedR = r * mixFactor + gray * (1 - mixFactor);
  const mixedG = g * mixFactor + gray * (1 - mixFactor);
  const mixedB = b * mixFactor + gray * (1 - mixFactor);

  // Convert back to hex
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const mutedHex = `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;

  return hexToHSL(mutedHex);
}

/**
 * Generate a complete color scale (50-900) from a base color
 * @param baseHex - Base hex color (typically the 500 level)
 * @returns Object with color scale from 50 to 900
 */
export function generateColorScale(baseHex: string): Record<number, string> {
  const scale: Record<number, string> = {};

  // Scale factors for generating the palette
  const levels = {
    50: 0.95,   // Very light
    100: 0.90,  // Lighter
    200: 0.75,  // Light
    300: 0.60,  // Light-medium
    400: 0.85,  // Medium-light (slightly darker than base)
    500: 1.0,   // Base color
    600: 0.85,  // Medium-dark
    700: 0.70,  // Dark
    800: 0.55,  // Darker
    900: 0.40,  // Very dark
  };

  baseHex = baseHex.replace('#', '');
  const baseR = parseInt(baseHex.substring(0, 2), 16);
  const baseG = parseInt(baseHex.substring(2, 4), 16);
  const baseB = parseInt(baseHex.substring(4, 6), 16);

  Object.entries(levels).forEach(([level, factor]) => {
    const levelNum = parseInt(level);

    if (levelNum < 500) {
      // Lighter shades - mix with white
      const r = Math.round(baseR + (255 - baseR) * (1 - factor));
      const g = Math.round(baseG + (255 - baseG) * (1 - factor));
      const b = Math.round(baseB + (255 - baseB) * (1 - factor));
      scale[levelNum] = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } else if (levelNum === 500) {
      // Base color
      scale[levelNum] = `#${baseHex}`;
    } else {
      // Darker shades
      const r = Math.round(baseR * factor);
      const g = Math.round(baseG * factor);
      const b = Math.round(baseB * factor);
      scale[levelNum] = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  });

  return scale;
}

/**
 * Generate HSL color scale for CSS variables
 * @param baseHex - Base hex color
 * @returns Object with HSL values for each level
 */
export function generateHSLScale(baseHex: string): Record<number, string> {
  const hexScale = generateColorScale(baseHex);
  const hslScale: Record<number, string> = {};

  Object.entries(hexScale).forEach(([level, hex]) => {
    hslScale[parseInt(level)] = hexToHSL(hex);
  });

  return hslScale;
}