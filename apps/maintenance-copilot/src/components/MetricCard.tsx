import type { ReactNode } from 'react';
import { toneClass, type Tone } from '../lib/tone';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
}

/** A single metric tile: big value + label, optional hint, tone-colored value. */
export function MetricCard({ label, value, tone = 'ok', hint }: MetricCardProps) {
  return (
    <div className="card metriccard">
      <div className={`metric ${toneClass(tone)}`}>{value}</div>
      <div className="metriclabel">{label}</div>
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}
