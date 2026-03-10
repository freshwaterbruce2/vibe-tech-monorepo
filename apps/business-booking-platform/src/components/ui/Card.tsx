import React from 'react';
import { cn } from '@/utils/cn';

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			'group relative rounded-xl bg-[hsl(var(--warm-white))] border border-[hsl(var(--warm-sand))] overflow-hidden',
			'shadow-warm-soft hover:shadow-warm-elevated',
			'transition-all duration-400 ease-out',
			'hover:scale-[1.01] hover:-translate-y-0.5',
			'before:absolute before:inset-0 before:bg-gradient-to-br before:from-[rgba(244,209,195,0.15)] before:to-transparent before:opacity-0 before:transition-opacity before:duration-400 hover:before:opacity-100',
			className,
		)}
		{...props}
	/>
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex flex-col space-y-1.5 p-6', className)}
		{...props}
	/>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn(
			'text-2xl font-medium leading-tight tracking-tight',
			'text-[hsl(var(--warm-charcoal))]',
			'group-hover:text-[hsl(var(--terracotta))]',
			'transition-colors duration-300',
			className,
		)}
		{...props}
	/>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn(
			'text-sm font-normal leading-relaxed',
			'text-[hsl(var(--warm-taupe))]',
			'group-hover:text-[hsl(var(--warm-charcoal))]',
			'transition-colors duration-300',
			className,
		)}
		{...props}
	/>
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex items-center p-6 pt-0', className)}
		{...props}
	/>
));
CardFooter.displayName = 'CardFooter';

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardDescription,
	CardContent,
};
