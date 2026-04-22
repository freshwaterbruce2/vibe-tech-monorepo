import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-600 text-white',
      outline: 'border border-current bg-transparent',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';