/**
 * Convenient wrapper function for visual panels.
 * Kept out of VisualPanelErrorBoundary.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import type { ComponentType } from 'react';

import { VisualPanelErrorBoundary } from './VisualPanelErrorBoundary';

export const withVisualErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  componentName: string,
  onClose?: () => void
) => {
  return (props: P) => (
    <VisualPanelErrorBoundary componentName={componentName} onClose={onClose}>
      <Component {...props} />
    </VisualPanelErrorBoundary>
  );
};
