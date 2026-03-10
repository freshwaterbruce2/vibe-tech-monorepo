/**
 * StatusIcon Component
 * Animated icon component that displays different icons based on task status
 */
import { motion } from 'framer-motion';
import { AlertCircle, Brain, CheckCircle, Loader2, Users } from 'lucide-react';
import React from 'react';

/** Task execution status */
export type StatusType = 'idle' | 'analyzing' | 'coordinating' | 'executing' | 'completed' | 'error' | 'thinking';

/** Props for the StatusIcon component */
export interface StatusIconProps {
  /** Current task execution status */
  readonly status: StatusType;
  /** Optional size for the icon (default: 16) */
  readonly size?: number;
  /** Optional class name */
  readonly className?: string;
}

/**
 * Renders an animated icon based on the current task status.
 */
export function StatusIcon({ status, size = 16, className }: StatusIconProps): React.ReactElement | null {
  const cn = className ?? '';

  switch (status) {
    case 'analyzing':
    case 'thinking':
      return (
        <motion.div
            className={cn}
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <Brain size={size} />
        </motion.div>
      );

    case 'coordinating':
      return (
        <motion.div
            className={cn}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 1.5,
            repeat: Infinity
          }}
        >
          <Users size={size} />
        </motion.div>
      );

    case 'executing':
      return (
        <motion.div
            className={cn}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <Loader2 size={size} />
        </motion.div>
      );

    case 'completed':
      return <CheckCircle size={size} className={cn} />;

    case 'error':
      return <AlertCircle size={size} className={cn} />;

    case 'idle':
    default:
      // Return a default icon or null for idle
      return null;
  }
}

export default StatusIcon;
