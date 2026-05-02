import type { CSSProperties } from 'react';
import type { Dimension } from '../lib/types';

interface Props {
  dimension: Dimension;
  label: string;
  value?: number;
  onChange: (value: number) => void;
}

const ACCENT: Record<
  Dimension,
  { color: string; ring: string; iconBg: string; text: string; icon: string }
> = {
  physical: {
    color: '#10b981',
    ring: 'ring-emerald-100',
    iconBg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: 'M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10Z',
  },
  mental: {
    color: '#0ea5e9',
    ring: 'ring-sky-100',
    iconBg: 'bg-sky-50',
    text: 'text-sky-700',
    icon: 'M9 4a3 3 0 0 0-3 3v1a4 4 0 0 0 0 8v1a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Zm6 0a3 3 0 0 1 3 3v1a4 4 0 0 1 0 8v1a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Z',
  },
  emotional: {
    color: '#f43f5e',
    ring: 'ring-rose-100',
    iconBg: 'bg-rose-50',
    text: 'text-rose-700',
    icon: 'M20.8 8.6c0 5.1-8.8 10.4-8.8 10.4S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z',
  },
  spiritual: {
    color: '#f59e0b',
    ring: 'ring-amber-100',
    iconBg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: 'M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Zm6 11l.7 2.8 2.8.7-2.8.7L18 22l-.7-2.8-2.8-.7 2.8-.7L18 14Z',
  },
};

export function DimensionSlider({ dimension, label, value, onChange }: Props) {
  const accent = ACCENT[dimension];
  const isSet = typeof value === 'number';
  const sliderValue = value ?? 5;
  const rangeStyle = {
    '--range-color': accent.color,
    '--range-progress': isSet ? `${sliderValue * 10}%` : '0%',
  } as CSSProperties;

  return (
    <div className="grid grid-cols-[2.75rem_1fr_3.25rem] items-center gap-3">
      <div
        className={`grid h-11 w-11 place-items-center rounded-full ${accent.iconBg} ${accent.text} ring-1 ${accent.ring}`}
        aria-hidden="true"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={accent.icon} />
        </svg>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label className="text-sm font-extrabold text-slate-700">{label}</label>
          <span className={`text-sm font-black tabular-nums ${accent.text}`}>
            {isSet ? `${value}/10` : 'Not set'}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={sliderValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`score-range w-full ${isSet ? '' : 'score-range-unset'}`}
          style={rangeStyle}
          aria-label={`${label} score`}
          aria-valuetext={isSet ? `${value} of 10` : 'Not set'}
        />
      </div>

      <span className={`display-font text-right text-2xl font-black tabular-nums ${accent.text}`}>
        {isSet ? value : '--'}
      </span>
    </div>
  );
}
