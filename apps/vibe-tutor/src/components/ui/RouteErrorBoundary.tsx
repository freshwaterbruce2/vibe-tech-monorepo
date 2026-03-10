import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  routeName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary for route-level error handling
 *
 * Features:
 * - Route-specific error tracking
 * - Custom fallback UI
 * - Error reporting hook
 * - Reset capability
 */
class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { routeName, onError } = this.props;

    // Log to console with route context
    console.error(`[ErrorBoundary${routeName ? ` - ${routeName}` : ''}]:`, error, errorInfo);

    // Store error details for display
    this.setState({ error, errorInfo });

    // Call custom error handler (for error tracking services like Sentry)
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, routeName } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen w-full bg-background-main text-text-primary flex flex-col items-center justify-center p-8">
          <div className="max-w-2xl w-full glass-card p-8 text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <div>
              <h1 className="text-3xl font-bold text-red-400 mb-2">Something went wrong</h1>
              {routeName && (
                <p className="text-sm text-text-secondary mb-4">Error in: {routeName}</p>
              )}
              <p className="text-text-secondary">
                We've encountered an unexpected error. Your data is safe.
              </p>
            </div>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
                  Show error details
                </summary>
                <pre className="text-xs bg-background-card p-4 rounded-lg overflow-auto max-h-48 text-red-400">
                  {error.toString()}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 font-semibold text-background-main bg-[var(--primary-accent)] rounded-lg hover:opacity-80 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-3 font-semibold border-2 border-[var(--primary-accent)] text-[var(--primary-accent)] rounded-lg hover:bg-[var(--primary-accent)] hover:text-background-main transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default RouteErrorBoundary;
