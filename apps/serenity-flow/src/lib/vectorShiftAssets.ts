export const VECTOR_SHIFT_ARTWORKS = [
  {
    id: 'color-by-numbers-4',
    name: 'VectorShift Calm Mosaic',
    src: '/assets/vectorshift/color-by-numbers-4.svg',
    sourceFile: 'color_by_numbers4.svg',
    accent: '#38bdf8',
  },
  {
    id: 'color-by-numbers-2',
    name: 'VectorShift Soft Garden',
    src: '/assets/vectorshift/color-by-numbers-2.svg',
    sourceFile: 'color_by_numbers2.svg',
    accent: '#14b8a6',
  },
  {
    id: 'color-by-numbers-3',
    name: 'VectorShift Gentle Lines',
    src: '/assets/vectorshift/color-by-numbers-3.svg',
    sourceFile: 'color_by_numbers3.svg',
    accent: '#8b5cf6',
  },
  {
    id: 'color-by-numbers-5',
    name: 'VectorShift Quiet Bloom',
    src: '/assets/vectorshift/color-by-numbers-5.svg',
    sourceFile: 'color_by_numbers5.svg',
    accent: '#f43f5e',
  },
] as const;

export type VectorShiftArtwork = (typeof VECTOR_SHIFT_ARTWORKS)[number];
