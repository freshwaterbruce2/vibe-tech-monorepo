/* eslint-disable react-refresh/only-export-components */
import {
    Button as SharedButton,
    type ButtonProps as SharedButtonProps,
} from '@vibetech/ui';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Business Booking Button — extends @vibetech/ui Button
 * with app-specific warm theme variants and size aliases.
 *
 * Preserves the existing API (`loading`, `accent` variant, `md` size)
 * so no consumer changes are needed.
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?:
		| 'primary'
		| 'secondary'
		| 'outline'
		| 'ghost'
		| 'destructive'
		| 'accent';
	size?: 'sm' | 'md' | 'lg' | 'icon';
	loading?: boolean;
}

const variantStyles: Record<string, string> = {
	primary:
		'bg-[hsl(var(--terracotta))] text-white hover:bg-[hsl(var(--warm-amber))] focus-visible:ring-[hsl(var(--terracotta))] shadow-warm-glow hover:shadow-warm-elevated',
	secondary:
		'bg-[hsl(var(--warm-white))] text-[hsl(var(--warm-charcoal))] hover:bg-[hsl(var(--warm-sand))] focus-visible:ring-[hsl(var(--warm-sand))] shadow-warm-soft hover:shadow-warm-medium border border-[hsl(var(--warm-sand))]',
	outline:
		'border border-[hsl(var(--warm-sand))] bg-transparent text-[hsl(var(--warm-charcoal))] hover:bg-[hsl(var(--terracotta))] hover:text-white hover:border-[hsl(var(--terracotta))] focus-visible:ring-[hsl(var(--terracotta))] shadow-warm-subtle hover:shadow-warm-soft',
	ghost:
		'hover:bg-[hsl(var(--warm-sand))] hover:text-[hsl(var(--warm-charcoal))] focus-visible:ring-[hsl(var(--warm-sand))] text-[hsl(var(--warm-taupe))]',
	destructive:
		'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-warm-medium hover:shadow-warm-elevated',
	accent:
		'bg-[hsl(var(--warm-amber))] text-white hover:bg-[hsl(var(--terracotta))] focus-visible:ring-[hsl(var(--warm-amber))] shadow-warm-medium hover:shadow-warm-elevated',
};

const sizeMap: Record<string, SharedButtonProps['size']> = {
	sm: 'sm',
	md: 'default',
	lg: 'lg',
	icon: 'icon',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = 'primary',
			size = 'md',
			loading,
			children,
			disabled,
			type = 'button',
			...props
		},
		ref,
	) => {
		return (
			<SharedButton
				ref={ref}
				type={type}
				variant="default"
				size={sizeMap[size] ?? 'default'}
				isLoading={loading}
				disabled={disabled}
				className={cn(
					'rounded-xl font-medium tracking-wide transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none',
					variantStyles[variant],
					className,
				)}
				{...props}
			>
				{children}
			</SharedButton>
		);
	},
);

Button.displayName = 'Button';

// Re-export for barrel compatibility
export { buttonVariants } from '@vibetech/ui';
