import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Recommendation } from '@/services/predictionService';

interface ProactiveNotificationProps {
  recommendation: Recommendation;
  priority: 'low' | 'medium' | 'high' | 'critical';
  onDismiss: () => void;
  onAction: (action: string) => void;
}

const DISMISS_MS = 10000;

/**
 * Toast-style notification for proactive recommendations
 * Auto-dismisses after 10s for low/medium priority
 * Persists for high/critical until user action
 */
export function ProactiveNotification({
  recommendation,
  priority,
  onDismiss,
  onAction,
}: ProactiveNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(DISMISS_MS);
  const startRef = useRef<number | null>(null);

  const clearDismissTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startDismissTimer = (delay = DISMISS_MS) => {
    clearDismissTimer();
    startRef.current = Date.now();
    remainingRef.current = delay;
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, delay);
  };

  // Auto-dismiss for low/medium priority
  useEffect(() => {
    if (priority === 'low' || priority === 'medium') {
      startDismissTimer();
    }
    return () => clearDismissTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, onDismiss]);

  useEffect(() => {
    if (isPaused) {
      if (startRef.current) {
        remainingRef.current -= Date.now() - startRef.current;
      }
      clearDismissTimer();
    } else if (priority === 'low' || priority === 'medium') {
      startDismissTimer(Math.max(0, remainingRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, priority]);

  const handleAction = () => {
    onAction(recommendation.action_command);
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const ariaLive = priority === 'high' || priority === 'critical' ? 'assertive' : 'polite';
  const actionLabel = recommendation.action_label || 'Act now';

  // Priority-based styling
  const priorityConfig = {
    low: {
      icon: Info,
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-400',
    },
    medium: {
      icon: Zap,
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
      iconColor: 'text-purple-400',
    },
    high: {
      icon: AlertTriangle,
      borderColor: 'border-orange-500/30',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-400',
      iconColor: 'text-orange-400',
    },
    critical: {
      icon: AlertTriangle,
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      iconColor: 'text-red-400',
    },
  };

  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`
            fixed bottom-4 right-4 z-50
            max-w-md w-full
            border-l-4 ${config.borderColor}
            ${config.bgColor}
            backdrop-blur-md
            rounded-lg shadow-lg
            p-4
          `}
          role="alert"
          aria-live={ariaLive}
          aria-atomic="true"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <Icon
              className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold ${config.textColor} text-sm`}>
                {recommendation.title}
              </h4>
              <span className="text-xs text-white/50 uppercase tracking-wider">
                {recommendation.category}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-white/50 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-white/70 ml-8 mb-3">{recommendation.description}</p>

          {/* Metadata */}
          {(recommendation.confidence !== undefined || recommendation.estimated_impact) && (
            <div className="flex items-center gap-4 ml-8 mb-3 text-xs text-white/50">
              {recommendation.confidence !== undefined && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
                </div>
              )}
              {recommendation.estimated_impact && (
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>{recommendation.estimated_impact}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 ml-8">
            <Button
              onClick={handleAction}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {actionLabel}
            </Button>
            {(priority === 'high' || priority === 'critical') && (
              <Button
                onClick={handleClose}
                size="sm"
                variant="ghost"
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                Remind later
              </Button>
            )}
          </div>

          {/* Auto-dismiss progress (for low/medium) */}
          {(priority === 'low' || priority === 'medium') && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 10, ease: 'linear' }}
              className={`absolute bottom-0 left-0 h-0.5 ${config.bgColor} opacity-50`}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
