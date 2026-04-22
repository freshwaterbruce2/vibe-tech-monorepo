import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variantStyles = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-600 bg-transparent hover:bg-gray-800',
      ghost: 'hover:bg-gray-800',
    };

    const sizeStyles = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3 text-sm',
      lg: 'h-11 px-8',
    };

    if (asChild) {
      return <>{props.children}</>;
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';