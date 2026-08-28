import { forwardRef } from 'react';
import clsx from 'clsx';

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, isOpen, onClose, title, description, size = 'md', children, ...props }, ref) => {
    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            className={clsx(
              'relative w-full rounded-lg bg-bg-card shadow-lg',
              'outline-none',
              sizeClasses[size],
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-bg-card transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-text-secondary"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            {(title || description) && (
              <div className="p-6 pb-0">
                {title && (
                  <h2 className="font-heading text-2xl font-bold text-text-primary">{title}</h2>
                )}
                {description && <p className="mt-2 text-text-secondary">{description}</p>}
              </div>
            )}

            {/* Content */}
            <div className="p-6">{children}</div>
          </div>
        </div>
      </>
    );
  },
);

Modal.displayName = 'Modal';
