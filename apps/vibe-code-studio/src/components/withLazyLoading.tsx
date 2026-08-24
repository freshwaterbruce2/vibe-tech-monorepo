/**
 * Higher-order component for lazy loading with custom fallback.
 * Kept out of LazyComponents.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import { Suspense, type ComponentType } from 'react';

import { lazyRetry } from '../utils/lazyRetry';

import { LoadingFallback } from './LazyComponents';

export function withLazyLoading(
  importFn: () => Promise<Record<string, unknown>>,
  exportName?: string,
  fallbackMessage?: string
) {
  const LazyComponent = lazyRetry(() =>
    importFn().then(module => {
      // Handle named exports
      if (exportName && exportName !== 'default') {
        // Check if the module has the named export
        if (exportName in module) {
          return { default: module[exportName] as ComponentType };
        }
      }

      // If it's already a default export or module itself is the component
      if ('default' in module) {
        return module as { default: ComponentType };
      }

      // Otherwise, assume the module itself is the component
      return { default: module as unknown as ComponentType };
    })
  );

  const WrappedComponent = (props: Record<string, unknown>) => (
    <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = `Lazy(${exportName ?? 'Component'})`;

  return WrappedComponent;
}
