export type Tone = 'ok' | 'warn' | 'danger' | 'info';

/** Maps a semantic tone to an existing index.css color class. */
export const toneClass = (tone: Tone): string =>
  tone === 'danger' ? 'danger' : tone === 'warn' ? 'warnText' : tone === 'info' ? 'muted' : 'ok';

/** Health score: green ≥80, amber ≥50, red below. */
export const scoreTone = (score: number): Tone =>
  score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'danger';

/** A count is fine at 0, otherwise a warning (drift/WAL are fixable, not fatal). */
export const countTone = (n: number): Tone => (n > 0 ? 'warn' : 'ok');
