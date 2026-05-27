import { forwardRef } from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-6 md:p-8',
};

const variantClasses = {
  default: 'bg-bg-card border border-border-subtle',
  elevated: 'bg-bg-elevated border border-border-subtle shadow-lg',
  interactive:
    'bg-bg-card border border-border-subtle hover:bg-bg-elevated transition-colors cursor-pointer',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('rounded-lg', variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('flex flex-col space-y-1.5', className)} {...props} />
  ),
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx('font-heading text-xl font-bold leading-none', className)}
      {...props}
    />
  ),
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={clsx('text-text-secondary text-sm', className)} {...props} />
));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('pt-2', className)} {...props} />
  ),
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('flex items-center pt-4', className)} {...props} />
  ),
);

CardFooter.displayName = 'CardFooter';
