/**
 * Error Boundary Components
 *
 * This module provides both legacy class-based and modern function-based
 * error boundary implementations for Vibe Code Studio.
 *
 * Migration Path:
 * 1. The legacy ErrorBoundary alias is kept for backward compatibility
 * 2. New code should use ModernErrorBoundary (function component)
 * 3. Use withErrorBoundary HOC for easy component wrapping
 * 4. Use useErrorHandler hook for imperative error handling
 *
 * Plain .ts barrel so react-refresh/only-export-components does not apply.
 */

// Legacy alias kept for backward compatibility (previously resolved circularly
// through '../ErrorBoundary', which pointed back at this barrel's ErrorBoundary
// export — i.e. ModernErrorBoundary).
export { ModernErrorBoundary as LegacyErrorBoundary } from './ModernErrorBoundary';

// Export modern implementations
export { ModernErrorBoundary as ErrorBoundary, ModernErrorBoundary } from './ModernErrorBoundary';
export type { ModernErrorBoundaryProps } from './ModernErrorBoundary';
export { useErrorHandler, withErrorBoundary } from './withErrorBoundary';

// Default export is the modern version
export { ModernErrorBoundary as default } from './ModernErrorBoundary';
