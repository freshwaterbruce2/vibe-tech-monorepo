import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-primary/20 text-blue-light border border-blue-primary/30',
        success: 'bg-green-primary/20 text-green-light border border-green-primary/30',
        warning: 'bg-orange/20 text-orange border border-orange/30',
        danger: 'bg-red-primary/20 text-red-light border border-red-primary/30',
        gold: 'bg-gold/20 text-gold border border-gold/30',
        purple: 'bg-purple/20 text-purple border border-purple/30',
        secondary: 'bg-bg-elevated text-text-secondary border border-border-subtle',
        outline: 'border border-border-subtle text-text-secondary bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

// Specialized badges for VibeBlox
export const CategoryBadge = ({
  category,
  className,
}: {
  category: 'chore' | 'learning' | 'physical' | 'social' | 'creative';
  className?: string;
}) => {
  const variants = {
    chore: { variant: 'default' as const, label: 'Chore', icon: '🧹' },
    learning: { variant: 'purple' as const, label: 'Learning', icon: '📚' },
    physical: { variant: 'success' as const, label: 'Physical', icon: '💪' },
    social: { variant: 'warning' as const, label: 'Social', icon: '🤝' },
    creative: { variant: 'gold' as const, label: 'Creative', icon: '🎨' },
  };

  const { variant, label, icon } = variants[category];

  return (
    <Badge variant={variant} icon={icon} className={className}>
      {label}
    </Badge>
  );
};

export const RarityBadge = ({
  rarity,
  className,
}: {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
}) => {
  const variants = {
    common: { variant: 'secondary' as const, label: 'Common' },
    rare: { variant: 'default' as const, label: 'Rare' },
    epic: { variant: 'purple' as const, label: 'Epic' },
    legendary: { variant: 'gold' as const, label: 'Legendary' },
  };

  const { variant, label } = variants[rarity];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};

export const StatusBadge = ({
  status,
  className,
}: {
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  className?: string;
}) => {
  const variants = {
    pending: { variant: 'warning' as const, label: 'Pending', icon: '⏳' },
    approved: { variant: 'success' as const, label: 'Approved', icon: '✓' },
    rejected: { variant: 'danger' as const, label: 'Rejected', icon: '✕' },
    completed: { variant: 'success' as const, label: 'Completed', icon: '✓' },
  };

  const { variant, label, icon } = variants[status];

  return (
    <Badge variant={variant} icon={icon} className={className}>
      {label}
    </Badge>
  );
};
