import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('relative h-4 w-full overflow-hidden rounded-full bg-gray-700', className)}
        {...props}
      >
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';
