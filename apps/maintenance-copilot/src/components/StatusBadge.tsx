import type { ReactNode } from 'react';
import { toneClass, type Tone } from '../lib/tone';

/** A small dot+label status indicator (e.g. "● integrity OK"). */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge ${toneClass(tone)}`}>● {children}</span>;
}
