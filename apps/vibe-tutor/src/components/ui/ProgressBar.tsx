import { useEffect, useRef } from 'react';

interface ProgressBarProps {
  /** Progress percentage (0–100) */
  percent: number;
  /** Tailwind gradient / colour classes for the fill bar */
  barClassName?: string;
  /** Tailwind classes for the track (outer container) */
  trackClassName?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Reusable progress bar with dynamic width.
 * Uses a ref to set runtime-computed widths so consuming components stay lint-clean.
 */
const ProgressBar = ({
  percent,
  barClassName = 'bg-gradient-to-r from-blue-500 to-purple-500',
  trackClassName = 'h-3 bg-surface-lighter rounded-full overflow-hidden',
  label = 'Progress',
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = `${clamped}%`;
    }
  }, [clamped]);

  return (
    <div
      className={trackClassName}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div ref={fillRef} className={`h-full transition-all duration-500 ${barClassName}`} />
    </div>
  );
};

export default ProgressBar;
