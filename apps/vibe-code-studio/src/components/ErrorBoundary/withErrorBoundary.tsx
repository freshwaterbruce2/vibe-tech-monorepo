/**
 * Error boundary helpers: imperative hook + HOC.
 * Kept out of ModernErrorBoundary.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import type { ComponentType, FC } from 'react';
import { useErrorBoundary } from 'react-error-boundary';

import type { ModernErrorBoundaryProps } from './ModernErrorBoundary';
import { ModernErrorBoundary } from './ModernErrorBoundary';

// Hook for imperatively handling errors
export const useErrorHandler = useErrorBoundary;

// HOC pattern for wrapping components
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ModernErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ModernErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ModernErrorBoundary>
  );

  const ComponentForError = Component as FC<P> & { displayName?: string; name?: string };
  WrappedComponent.displayName = `withErrorBoundary(${ComponentForError.displayName ?? ComponentForError.name})`;

  return WrappedComponent;
}
