export type Tone = 'ok' | 'warn' | 'danger' | 'info';

/** Maps a semantic tone to an existing index.css color class. */
export const toneClass = (tone: Tone): string =>
  tone === 'danger' ? 'danger' : tone === 'warn' ? 'warnText' : tone === 'info' ? 'muted' : 'ok';
