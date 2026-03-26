import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import React, { useEffect } from 'react';
import type { Notification, NotificationType } from '../../types';

interface ErrorToastProps {
  notification: Notification;
  onClose: (id: string) => void;
  index: number;
}

/**
 * Get icon and colors for notification type
 */
const getNotificationStyle = (
  type: NotificationType
): {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderColor: string;
  iconColor: string;
  bgColor: string;
} => {
  switch (type) {
    case 'error':
      return {
        icon: AlertCircle,
        gradient: 'from-red-500 via-red-600 to-red-700',
        borderColor: 'border-red-400/50',
        iconColor: 'text-red-300',
        bgColor: 'bg-red-500/10',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        gradient: 'from-yellow-500 via-amber-500 to-orange-500',
        borderColor: 'border-yellow-400/50',
        iconColor: 'text-yellow-300',
        bgColor: 'bg-yellow-500/10',
      };
    case 'success':
      return {
        icon: CheckCircle,
        gradient: 'from-fuchsia-500 via-violet-500 to-purple-500',
        borderColor: 'border-fuchsia-400/50',
        iconColor: 'text-fuchsia-300',
        bgColor: 'bg-fuchsia-500/10',
      };
    case 'info':
      return {
        icon: Info,
        gradient: 'from-blue-500 via-cyan-500 to-sky-500',
        borderColor: 'border-blue-400/50',
        iconColor: 'text-blue-300',
        bgColor: 'bg-blue-500/10',
      };
  }
};

const ErrorToast = ({ notification, onClose, index }: ErrorToastProps) => {
  const { icon: Icon, gradient, borderColor, iconColor, bgColor } = getNotificationStyle(
    notification.type
  );

  // Auto-dismiss if duration is set
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notification.id, notification.duration, onClose]);

  return (
    <div
      className="animate-slide-in-right"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        className={`relative glass-card ${borderColor} rounded-2xl p-4 shadow-2xl min-w-[320px] max-w-md transition-all duration-300 hover:scale-[1.02] ${bgColor}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {/* Glassmorphism gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-5 rounded-2xl pointer-events-none`}
        />

        {/* Close Button */}
        <button
          onClick={() => onClose(notification.id)}
          className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-white/10 focus-glow"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 relative z-10">
          {/* Icon with neon glow */}
          <div
            className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0 border ${borderColor}`}
            style={{
              boxShadow: `0 0 20px ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : notification.type === 'warning' ? 'rgba(251, 191, 36, 0.3)' : notification.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            }}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 pt-0.5">
            <div className="text-base font-bold text-[var(--text-primary)] mb-1">
              {notification.title}
            </div>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {notification.message}
            </div>

            {/* Progress bar for auto-dismiss */}
            {notification.duration && notification.duration > 0 && (
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${gradient} animate-progress-bar`}
                  style={{
                    animationDuration: `${notification.duration}ms`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress-bar {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-progress-bar {
          animation: progress-bar linear forwards;
        }
      `}</style>
    </div>
  );
};

export default ErrorToast;
