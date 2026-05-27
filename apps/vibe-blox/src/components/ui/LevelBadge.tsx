import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export interface LevelBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof levelBadgeVariants> {
  level: number;
  showStar?: boolean;
  title?: string;
}

const levelBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-bold transition-all',
  {
    variants: {
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
        xl: 'px-5 py-2 text-lg',
      },
      variant: {
        default: 'bg-purple text-text-primary',
        outline: 'border-2 border-purple text-purple bg-transparent',
        glow: 'bg-purple text-text-primary shadow-lg shadow-purple/50',
        gold: 'bg-gold text-bg-dark',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

// Level titles based on the VibeBlox design
const levelTitles: Record<number, string> = {
  1: 'Rookie',
  2: 'Explorer',
  3: 'Achiever',
  4: 'Champion',
  5: 'Hero',
  6: 'Legend',
  7: 'Master',
  8: 'Grandmaster',
};

export const LevelBadge = forwardRef<HTMLDivElement, LevelBadgeProps>(
  (
    { className, size, variant, level, showStar = true, title, children, ...props },
    ref,
  ) => {
    const effectiveVariant = level >= 5 ? 'gold' : level >= 3 ? 'glow' : variant;

    return (
      <div
        ref={ref}
        className={clsx(levelBadgeVariants({ size, variant: effectiveVariant }), className)}
        {...props}
      >
        {showStar && (
          <span className="flex-shrink-0">
            {level >= 5 ? '👑' : level >= 3 ? '⭐' : '✦'}
          </span>
        )}
        <span>Level {level}</span>
        {children}
      </div>
    );
  },
);

LevelBadge.displayName = 'LevelBadge';

// Level progress display
export const LevelProgress = ({
  level,
  currentXP,
  requiredXP,
  title,
  className,
}: {
  level: number;
  currentXP: number;
  requiredXP: number;
  title?: string;
  className?: string;
}) => {
  const displayTitle = title || levelTitles[level] || 'Master';
  const progress = (currentXP / requiredXP) * 100;

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LevelBadge level={level} size="md" />
          <span className="text-sm text-text-secondary">{displayTitle}</span>
        </div>
        <span className="text-xs text-text-muted">
          {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            level >= 5
              ? 'bg-gradient-to-r from-gold via-orange to-gold'
              : 'bg-gradient-to-r from-blue-primary via-purple to-gold',
          )}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
};

// Level up celebration
export const LevelUpCelebration = ({
  newLevel,
  title,
  className,
}: {
  newLevel: number;
  title?: string;
  className?: string;
}) => {
  const displayTitle = title || levelTitles[newLevel] || 'Master';

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-4 text-center animate-celebrate',
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 animate-pulse bg-purple/30 blur-xl rounded-full" />
        <LevelBadge level={newLevel} size="xl" variant="gold" className="relative" />
      </div>
      <div>
        <h3 className="text-2xl font-heading font-bold text-gold">Level Up!</h3>
        <p className="text-text-secondary">You are now a {displayTitle}</p>
      </div>
    </div>
  );
};

// Level comparison (for leaderboards)
export const LevelComparison = ({
  levels,
  className,
}: {
  levels: Array<{ name: string; level: number; xp: number }>;
  className?: string;
}) => {
  const maxLevel = Math.max(...levels.map((l) => l.level));

  return (
    <div className={clsx('space-y-3', className)}>
      {levels
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .map((user, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg bg-bg-card p-3"
          >
            <span className="w-6 text-center font-heading font-bold text-text-muted">
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-text-primary">{user.name}</p>
              <p className="text-xs text-text-muted">{user.xp.toLocaleString()} XP</p>
            </div>
            <LevelBadge
              level={user.level}
              size="sm"
              variant={user.level === maxLevel ? 'gold' : 'default'}
            />
          </div>
        ))}
    </div>
  );
};
