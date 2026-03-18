/* ---------- Music Notes Game — Data & Helpers ---------- */

export type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = '' | '#' | 'b';

export interface NoteData {
  name: NoteName;
  accidental: Accidental;
  /** Staff position: 0=C4 (middle C). Each +1 = next note up. */
  staffPos: number;
  label: string;
}

export interface Tier {
  name: string;
  notes: NoteData[];
  optionCount: number;
  threshold: number;
}

export const NATURAL_NOTES: NoteData[] = [
  { name: 'C', accidental: '', staffPos: 0, label: 'C' },
  { name: 'D', accidental: '', staffPos: 1, label: 'D' },
  { name: 'E', accidental: '', staffPos: 2, label: 'E' },
  { name: 'F', accidental: '', staffPos: 3, label: 'F' },
  { name: 'G', accidental: '', staffPos: 4, label: 'G' },
  { name: 'A', accidental: '', staffPos: 5, label: 'A' },
  { name: 'B', accidental: '', staffPos: 6, label: 'B' },
];

export const SHARP_NOTES: NoteData[] = [
  { name: 'C', accidental: '#', staffPos: 0, label: 'C#' },
  { name: 'D', accidental: '#', staffPos: 1, label: 'D#' },
  { name: 'F', accidental: '#', staffPos: 3, label: 'F#' },
  { name: 'G', accidental: '#', staffPos: 4, label: 'G#' },
  { name: 'A', accidental: '#', staffPos: 5, label: 'A#' },
];

export const FLAT_NOTES: NoteData[] = [
  { name: 'D', accidental: 'b', staffPos: 1, label: 'Db' },
  { name: 'E', accidental: 'b', staffPos: 2, label: 'Eb' },
  { name: 'G', accidental: 'b', staffPos: 4, label: 'Gb' },
  { name: 'A', accidental: 'b', staffPos: 5, label: 'Ab' },
  { name: 'B', accidental: 'b', staffPos: 6, label: 'Bb' },
];

export const TIERS: Tier[] = [
  { name: 'White Keys', notes: NATURAL_NOTES, optionCount: 4, threshold: 0 },
  {
    name: 'Add Sharps',
    notes: [...NATURAL_NOTES, ...SHARP_NOTES],
    optionCount: 5,
    threshold: 8,
  },
  {
    name: 'All Notes',
    notes: [...NATURAL_NOTES, ...SHARP_NOTES, ...FLAT_NOTES],
    optionCount: 6,
    threshold: 18,
  },
];

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempI = a[i] as T;
    const tempJ = a[j] as T;
    a[i] = tempJ;
    a[j] = tempI;
  }
  return a;
}

export function getTier(score: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tier = TIERS[i];
    if (tier && score >= tier.threshold) return tier;
  }
  return TIERS[0] as Tier;
}
