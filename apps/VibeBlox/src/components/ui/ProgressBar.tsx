import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value: number;
  max?: number;
  showValue?: boolean;
  valueLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const progressBarVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-bg-elevated',
  {
    variants: {
      variant: {
        default: '',
        blue: '',
        green: '',
        gold: '',
        purple: '',
        xp: '',
      },
      size: {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

const fillVariants = cva('h-full rounded-full transition-all duration-500 ease-out', {
  variants: {
    variant: {
      default: 'bg-blue-primary',
      blue: 'bg-blue-primary',
      green: 'bg-green-primary',
      gold: 'bg-gold',
      purple: 'bg-purple',
      xp: 'bg-gradient-to-r from-blue-primary via-purple to-gold',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      variant,
      size,
      value,
      max = 100,
      showValue = false,
      valueLabel,
      animated = true,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div className="w-full">
        {(showValue || valueLabel) && (
          <div className="mb-1 flex items-center justify-between text-xs">
            {valueLabel && <span className="text-text-secondary">{valueLabel}</span>}
            {showValue && (
              <span className="font-medium text-text-primary">
                {value}/{max}
              </span>
            )}
          </div>
        )}
        <div
          ref={ref}
          className={clsx(progressBarVariants({ variant, size }), className)}
          {...props}
        >
          <div
            className={clsx(fillVariants({ variant }), animated && 'transition-all duration-500')}
            style={{ width: `${percentage}%` }}
          >
            {variant === 'xp' && (
              <div className="h-full w-full animate-pulse bg-white/20" />
            )}
          </div>
        </div>
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';

// Specialized progress bars
export const XPBar = ({
  currentXP,
  requiredXP,
  level,
  className,
}: {
  currentXP: number;
  requiredXP: number;
  level: number;
  className?: string;
}) => {
  return (
    <div className={clsx('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-heading text-sm font-bold text-gold">Level {level}</span>
        <span className="text-text-secondary">
          {currentXP} / {requiredXP} XP
        </span>
      </div>
      <ProgressBar
        value={currentXP}
        max={requiredXP}
        variant="xp"
        size="md"
        className="shadow-lg shadow-gold/10"
      />
    </div>
  );
};

export const StreakBar = ({
  currentStreak,
  maxStreak = 7,
  className,
}: {
  currentStreak: number;
  maxStreak?: number;
  className?: string;
}) => {
  return (
    <div className={clsx('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-orange">
          <span className="text-sm">🔥</span>
          <span className="font-bold">{currentStreak} Day Streak</span>
        </span>
        <span className="text-text-muted">Max: {maxStreak}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: maxStreak }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-2 flex-1 rounded-full transition-all duration-300',
              i < currentStreak
                ? 'bg-orange shadow-sm shadow-orange/50'
                : 'bg-bg-elevated',
            )}
          />
        ))}
      </div>
    </div>
  );
};

export const MultiplierBar = ({
  multiplier,
  className,
}: {
  multiplier: number;
  className?: string;
}) => {
  const segments = 5;
  const filledSegments = Math.min(segments, Math.floor(multiplier));

  return (
    <div className={clsx('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">Streak Multiplier</span>
        <span className="font-bold text-gold">x{multiplier.toFixed(1)}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i < filledSegments
                ? 'bg-gold shadow-sm shadow-gold/50'
                : 'bg-bg-elevated',
            )}
          />
        ))}
      </div>
    </div>
  );
};
