import type { VectorShiftArtwork } from '../lib/vectorShiftAssets';

// Session & palette types
export interface SessionInfo {
  therapeutic_intro: string;
  palette: Record<string, { hex: string; theme: string }>;
  mid_coloring_prompt: string;
  completion_affirmation: string;
}

export const DEFAULT_SESSION: SessionInfo = {
  therapeutic_intro: 'Let each color arrive slowly. There is no wrong pace here.',
  palette: {
    '1': { hex: '#38bdf8', theme: 'Breath' },
    '2': { hex: '#14b8a6', theme: 'Steady' },
    '3': { hex: '#f472b6', theme: 'Warmth' },
    '4': { hex: '#a78bfa', theme: 'Ease' },
  },
  mid_coloring_prompt: 'Notice one place in your body that feels even slightly softer than before.',
  completion_affirmation: 'You made space for calm, and that space is yours to return to.',
};

export const PALETTES = {
  celestial: ['#0891b2','#06b6d4','#22d3ee','#67e8f9','#a5f3fc','#ecfeff','#0284c7','#0ea5e9','#38bdf8','#7dd3fc','#bae6fd','#f0f9ff','#7e22ce','#9333ea','#a855f7','#c084fc','#d8b4fe','#f5f3ff','#be185d','#db2777','#e11d48','#f43f5e','#fb7185','#fda4af'],
  pastel: ['#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981'],
  earth: ['#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563'],
};

export type PaletteName = keyof typeof PALETTES | 'ai' | 'classic';

export const PALETTE_NAMES: { id: PaletteName; label: string }[] = [
  { id: 'classic', label: 'Color by Number' },
  { id: 'celestial', label: 'Celestial' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'earth', label: 'Earth Tones' },
  { id: 'ai', label: 'AI Guided' },
];

// Core artwork types
export interface PathObj {
  id: string;
  d: string;
  isSymmetric?: boolean;
  mirrorId?: string;
  number?: number;
  center?: { x: number; y: number };
}

export interface Artwork {
  id: string;
  name: string;
  paths: PathObj[];
  viewBox: string;
  classicPalette?: string[];
  category?: 'Butterflies' | 'Nature' | 'Geometric' | 'Abstract' | 'Love';
}

// Serialization helper (moved from original file)
export const serializeArtworkSvg = (svg: SVGSVGElement) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('role', 'img');
  clone.style.backgroundColor = '#ffffff';

  const viewBox = svg.viewBox.baseVal;
  const width = viewBox?.width || svg.clientWidth || 800;
  const height = viewBox?.height || svg.clientHeight || 800;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  return new XMLSerializer().serializeToString(clone);
};
