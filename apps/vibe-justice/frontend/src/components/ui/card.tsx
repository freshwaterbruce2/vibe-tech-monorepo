import { clsx } from 'clsx'
import { forwardRef, type HTMLAttributes } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx('rounded-lg border border-gray-700 bg-gray-900/50 shadow-sm', className)}
      {...props}
    />
  )
})

Card.displayName = 'Card'
