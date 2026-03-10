import { forwardRef, useCallback, useEffect, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const toastVariants = cva(
  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border-blue-primary/50 bg-blue-primary/10 text-text-primary',
        success: 'border-green-primary/50 bg-green-primary/10 text-text-primary',
        error: 'border-red-primary/50 bg-red-primary/10 text-text-primary',
        warning: 'border-orange/50 bg-orange/10 text-text-primary',
        info: 'border-purple/50 bg-purple/10 text-text-primary',
        gold: 'border-gold/50 bg-gold/10 text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

const getIcon = (variant: string | null | undefined) => {
  switch (variant) {
    case 'success':
      return (
        <svg className="h-5 w-5 text-green-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className="h-5 w-5 text-red-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-5 w-5 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'info':
      return (
        <svg className="h-5 w-5 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'gold':
      return (
        <svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant = 'default',
      title,
      description,
      duration = 5000,
      onClose,
      position = 'top-right',
      children,
      ...props
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    const handleClose = useCallback(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, [onClose]);

    useEffect(() => {
      // Trigger entrance animation
      requestAnimationFrame(() => setIsVisible(true));

      if (duration > 0) {
        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
          setProgress(remaining);

          if (elapsed >= duration) {
            clearInterval(interval);
            handleClose();
          }
        }, 16);

        return () => clearInterval(interval);
      }
      return undefined;
    }, [duration, handleClose]);

    return createPortal(
      <div
        ref={ref}
        className={clsx(
          toastVariants({ variant }),
          'transform transition-all duration-300',
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
          positionClasses[position],
          className,
        )}
        {...props}
      >
        <div className="flex-shrink-0">{getIcon(variant)}</div>
        <div className="flex-1">
          {title && <h4 className="font-semibold text-sm">{title}</h4>}
          {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          {children}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 rounded p-1 text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {duration > 0 && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
            style={{ width: `${progress}%`, transition: 'width 16ms linear' }}
          />
        )}
      </div>,
      document.body,
    );
  },
);

Toast.displayName = 'Toast';

// Toast Container for managing multiple toasts
export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'gold';
    duration?: number;
  }>;
  onRemove: (id: string) => void;
  position?: ToastProps['position'];
}

export const ToastContainer = ({
  toasts,
  onRemove,
  position = 'top-right',
}: ToastContainerProps) => {
  return createPortal(
    <div
      className={clsx(
        'fixed z-50 flex flex-col gap-2 p-4 pointer-events-none',
        position?.includes('top') ? 'flex-col' : 'flex-col-reverse',
        position?.includes('right') ? 'items-end' : position?.includes('left') ? 'items-start' : 'items-center',
        positionClasses[position],
      )}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
          position={position}
        />
      ))}
    </div>,
    document.body,
  );
};

// Specialized toast presets for VibeBlox
export const QuestCompletedToast = ({
  questName,
  xpEarned,
  coinsEarned,
  onClose,
}: {
  questName: string;
  xpEarned: number;
  coinsEarned: number;
  onClose?: () => void;
}) => (
  <Toast
    variant="success"
    title="Quest Completed! 🎉"
    onClose={onClose}
    duration={6000}
  >
    <div className="mt-2 space-y-1">
      <p className="text-sm font-medium text-text-primary">{questName}</p>
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 text-green-light">
          <span>+{xpEarned}</span>
          <span className="text-xs">XP</span>
        </span>
        <span className="flex items-center gap-1 text-gold">
          <span>+{coinsEarned}</span>
          <span className="text-xs">🪙</span>
        </span>
      </div>
    </div>
  </Toast>
);

export const LevelUpToast = ({
  newLevel,
  onClose,
}: {
  newLevel: number;
  onClose?: () => void;
}) => (
  <Toast
    variant="gold"
    title="Level Up! 🎊"
    onClose={onClose}
    duration={8000}
  >
    <div className="mt-2">
      <p className="text-lg font-heading font-bold text-gold">Level {newLevel}</p>
      <p className="text-sm text-text-secondary">Keep up the great work!</p>
    </div>
  </Toast>
);

export const RewardPurchasedToast = ({
  rewardName,
  cost,
  onClose,
}: {
  rewardName: string;
  cost: number;
  onClose?: () => void;
}) => (
  <Toast
    variant="info"
    title="Reward Purchased! 🎁"
    onClose={onClose}
    duration={5000}
  >
    <div className="mt-2 space-y-1">
      <p className="text-sm font-medium text-text-primary">{rewardName}</p>
      <p className="text-sm text-text-secondary">
        Spent <span className="text-gold font-semibold">{cost} 🪙</span>
      </p>
    </div>
  </Toast>
);

export const StreakMilestoneToast = ({
  streak,
  multiplier,
  onClose,
}: {
  streak: number;
  multiplier: number;
  onClose?: () => void;
}) => (
  <Toast
    variant="warning"
    title={`${streak} Day Streak! 🔥`}
    onClose={onClose}
    duration={6000}
  >
    <div className="mt-2">
      <p className="text-sm text-text-secondary">
        Streak multiplier increased to{' '}
        <span className="text-orange font-bold">x{multiplier.toFixed(1)}</span>
      </p>
    </div>
  </Toast>
);
