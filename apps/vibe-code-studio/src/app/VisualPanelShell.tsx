/**
 * Shared shell for lazy visual no-code panels (screenshot / library / visual editor).
 * Provides motion enter/exit, Suspense fallback, and a panel-local error boundary so
 * a failed dynamic import does not take down the root app shell.
 */
import { motion } from 'framer-motion';
import { Suspense, type CSSProperties, type ReactNode } from 'react';

import { VisualPanelErrorBoundary } from '../components/ErrorBoundary/VisualPanelErrorBoundary';

type MotionVariant = 'side' | 'fullscreen';

const sideStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: '450px',
  zIndex: 100,
  boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
};

const fullscreenStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 200,
  background: 'rgba(0,0,0,0.95)',
};

const loadingFallback = <div style={{ padding: 16, color: '#a8a9ad', fontSize: 14 }}>Loading…</div>;

export interface VisualPanelShellProps {
  componentName: string;
  onClose: () => void;
  motionVariant: MotionVariant;
  children: ReactNode;
}

export function VisualPanelShell({
  componentName,
  onClose,
  motionVariant,
  children,
}: VisualPanelShellProps) {
  const isSide = motionVariant === 'side';

  return (
    <motion.div
      initial={isSide ? { opacity: 0, x: 300 } : { opacity: 0 }}
      animate={isSide ? { opacity: 1, x: 0 } : { opacity: 1 }}
      exit={isSide ? { opacity: 0, x: 300 } : { opacity: 0 }}
      style={isSide ? sideStyle : fullscreenStyle}
    >
      <VisualPanelErrorBoundary componentName={componentName} onClose={onClose}>
        <Suspense fallback={loadingFallback}>{children}</Suspense>
      </VisualPanelErrorBoundary>
    </motion.div>
  );
}
