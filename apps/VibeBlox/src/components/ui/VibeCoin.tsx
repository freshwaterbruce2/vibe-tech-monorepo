import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export interface VibeCoinProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof vibeCoinVariants> {
  amount?: number;
  showAnimation?: boolean;
  prefix?: string;
}

const vibeCoinVariants = cva(
  'inline-flex items-center justify-center rounded-full font-bold text-bg-dark',
  {
    variants: {
      size: {
        sm: 'w-5 h-5 text-xs',
        md: 'w-6 h-6 text-sm',
        lg: 'w-8 h-8 text-base',
        xl: 'w-12 h-12 text-xl',
        '2xl': 'w-16 h-16 text-2xl',
      },
      variant: {
        default: 'bg-gold',
        animated: 'bg-gold animate-coin-bounce',
        pulse: 'bg-gold animate-pulse',
        glow: 'bg-gold shadow-lg shadow-gold/50',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export const VibeCoin = forwardRef<HTMLSpanElement, VibeCoinProps>(
  (
    { className, size, variant, amount, showAnimation = false, prefix, children, ...props },
    ref,
  ) => {
    const effectiveVariant = showAnimation ? 'animated' : variant;

    return (
      <span className="inline-flex items-center gap-1.5">
        {prefix && <span className="text-text-secondary text-sm">{prefix}</span>}
        <span
          ref={ref}
          className={clsx(vibeCoinVariants({ size, variant: effectiveVariant }), className)}
          {...props}
        >
          🪙
        </span>
        {amount !== undefined && (
          <span className={clsx('font-bold', size === 'xl' || size === '2xl' ? 'text-xl' : 'text-sm')}>
            {amount.toLocaleString()}
          </span>
        )}
        {children}
      </span>
    );
  },
);

VibeCoin.displayName = 'VibeCoin';

// Coin display with label
export const CoinDisplay = ({
  amount,
  label,
  size = 'md',
  className,
}: {
  amount: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <VibeCoin size={size} />
      <div className="flex flex-col">
        {label && <span className="text-xs text-text-muted">{label}</span>}
        <span className={clsx('font-bold text-gold', sizeClasses[size])}>
          {amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

// Animated coin for rewards
export const RewardCoin = ({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-2 animate-celebrate',
        className,
      )}
    >
      <VibeCoin size="2xl" variant="glow" />
      <span className="text-2xl font-heading font-bold text-gold">+{amount}</span>
    </div>
  );
};

// Coin change indicator
export const CoinChange = ({
  change,
  className,
}: {
  change: number;
  className?: string;
}) => {
  const isPositive = change >= 0;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-sm font-semibold',
        isPositive ? 'text-green-light' : 'text-red-light',
        className,
      )}
    >
      {isPositive ? '+' : ''}
      {change.toLocaleString()}
      <VibeCoin size="sm" />
    </span>
  );
};
