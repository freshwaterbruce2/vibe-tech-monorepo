import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export interface StreakBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof streakBadgeVariants> {
  streak: number;
  showFire?: boolean;
  animated?: boolean;
}

const streakBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-bold transition-all',
  {
    variants: {
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
      },
      variant: {
        default: 'bg-orange text-bg-dark',
        outline: 'border-2 border-orange text-orange bg-transparent',
        ghost: 'text-orange bg-orange/10',
        glow: 'bg-orange text-bg-dark shadow-lg shadow-orange/50',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export const StreakBadge = forwardRef<HTMLDivElement, StreakBadgeProps>(
  (
    { className, size, variant, streak, showFire = true, animated = false, children, ...props },
    ref,
  ) => {
    const fireEmoji = streak >= 7 ? '🔥🔥' : streak >= 3 ? '🔥' : '⚡';
    const effectiveVariant = streak >= 7 ? 'glow' : variant;

    return (
      <div
        ref={ref}
        className={clsx(
          streakBadgeVariants({ size, variant: effectiveVariant }),
          animated && 'animate-fire-flicker',
          className,
        )}
        {...props}
      >
        {showFire && <span className="flex-shrink-0">{fireEmoji}</span>}
        <span>{streak}</span>
        <span className="opacity-80">day{streak !== 1 ? 's' : ''}</span>
        {children}
      </div>
    );
  },
);

StreakBadge.displayName = 'StreakBadge';

// Streak milestone display
export const StreakMilestone = ({
  streak,
  nextMilestone,
  className,
}: {
  streak: number;
  nextMilestone: number;
  className?: string;
}) => {
  const progress = (streak / nextMilestone) * 100;

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <StreakBadge streak={streak} size="lg" animated />
        <span className="text-sm text-text-muted">
          Next: <span className="text-orange font-semibold">{nextMilestone}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange to-red-primary transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
};

// Streak calendar view
export const StreakCalendar = ({
  days,
  currentStreak,
  className,
}: {
  days: Array<{ date: string; completed: boolean }>;
  currentStreak: number;
  className?: string;
}) => {
  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Last 7 Days</span>
        <StreakBadge streak={currentStreak} size="sm" />
      </div>
      <div className="flex gap-1">
        {days.slice(-7).map((day, index) => (
          <div
            key={index}
            className={clsx(
              'flex-1 aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all',
              day.completed
                ? 'bg-orange text-bg-dark'
                : 'bg-bg-elevated text-text-muted',
            )}
            title={day.date}
          >
            {day.completed ? '✓' : '·'}
          </div>
        ))}
      </div>
    </div>
  );
};
