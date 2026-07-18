import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import type { CardPadding, CardVariant } from './card.styles';
import { CardContent, CardFooter, CardHeader, StyledCard } from './card.styles';

export type { CardPadding, CardVariant } from './card.styles';
export { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card.styles';

export interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      header,
      footer,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const hasHeader = !!header;
    const hasFooter = !!footer;

    return (
      <StyledCard
        ref={ref}
        $variant={variant}
        $padding={padding}
        $hoverable={hoverable}
        $clickable={clickable}
        $hasHeader={hasHeader}
        $hasFooter={hasFooter}
        className={className}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        whileHover={hoverable ? { scale: 1.01 } : undefined}
        whileTap={clickable ? { scale: 0.99 } : undefined}
        {...props}
      >
        {hasHeader && <CardHeader>{header}</CardHeader>}

        <CardContent>{children}</CardContent>

        {hasFooter && <CardFooter>{footer}</CardFooter>}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

export default Card;
