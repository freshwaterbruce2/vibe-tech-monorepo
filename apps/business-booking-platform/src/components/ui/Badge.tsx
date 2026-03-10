import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
	'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-luxury-gold text-white hover:bg-luxury-gold/80',
				secondary:
					'border-transparent bg-luxury-cream text-luxury-navy hover:bg-luxury-cream/80',
				destructive:
					'border-transparent bg-red-500 text-white hover:bg-red-500/80',
				outline:
					'text-foreground border border-luxury-mocha/20 bg-transparent hover:bg-luxury-cream/50',
				success:
					'border-transparent bg-green-500 text-white hover:bg-green-500/80',
				warning:
					'border-transparent bg-amber-500 text-white hover:bg-amber-500/80',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
