/**
 * StatusIcon Component
 * Animated icon component that displays different icons based on task status
 * No manual memoization needed - React 19 handles optimization
 */
import { motion } from 'framer-motion';
import { AlertCircle, Brain, CheckCircle, Loader2, Users } from 'lucide-react';
import React from 'react';
import type { TaskStatus } from '../types';

/** Props for the StatusIcon component */
export interface StatusIconProps {
  /** Current task execution status */
  readonly status: TaskStatus;
  /** Optional size for the icon (default: 16) */
  readonly size?: number;
}

/**
 * Renders an animated icon based on the current task status.
 * Each status has its own animation pattern for better UX.
 *
 * @param props - Component props
 * @returns Animated status icon
 */
export function StatusIcon({ status, size = 16 }: StatusIconProps): React.ReactElement | null {
  switch (status) {
    case 'analyzing':
      return (
        <motion.div
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
      return <CheckCircle size={size} />;

    case 'error':
      return <AlertCircle size={size} />;

    case 'idle':
    default:
      return null;
  }
}

export default StatusIcon;