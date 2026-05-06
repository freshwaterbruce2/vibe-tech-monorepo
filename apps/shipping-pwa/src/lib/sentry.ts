import type { ComponentType } from 'react';

/**
 * Sentry configuration for error monitoring and performance tracking
 * Lazy loads Sentry only when needed to reduce initial bundle size
 */
export async function initializeSentry(): Promise<void> {
  // Only initialize Sentry if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not provided. Error reporting is disabled.');
    return;
  }

  // Dynamically import Sentry to reduce initial bundle size
  const Sentry = await import('@sentry/react');

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE ?? 'development',

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Capture performance data
    tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
      ? parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)
      : 0.1, // 10% of transactions for performance monitoring

    // Session replay sampling rate
    replaysSessionSampleRate: import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
      ? parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE)
      : 0.1, // 10% of sessions

    // Error-based session replay sampling rate
    replaysOnErrorSampleRate: import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
      ? parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE)
      : 1.0, // 100% of sessions when an error occurs

    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE ?? 'shipping-pwa@1.0.0',

    // Additional configuration
    beforeSend(event, hint) {
      // Filter out development errors in production
      if (import.meta.env.MODE === 'development') {
        console.warn('Sentry event (dev mode):', event);
        return null; // Don't send events in development
      }

      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;

        // Filter out ResizeObserver loop limit exceeded (common, non-critical)
        if (error instanceof Error && error.message.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }

        // Filter out network errors that might be user-related
        if (error instanceof Error && error.message.includes('NetworkError')) {
          return null;
        }
      }

      return event;
    },

    // Set user context for better error tracking
    initialScope: {
      tags: {
        component: 'shipping-pwa',
        platform: 'web',
      },
      contexts: {
        app: {
          name: 'DC8980 Shipping PWA',
          version: '1.0.0',
        },
      },
    },
  });

  // Set user information if available
  const userSettings = localStorage.getItem('userSettings');
  if (userSettings) {
    try {
      const settings = JSON.parse(userSettings);
      Sentry.setUser({
        id: settings.userId ?? 'anonymous',
        username: settings.username,
      });
    } catch (error) {
      console.warn('Failed to parse user settings for Sentry:', error);
    }
  }
}

/**
 * Capture an error with additional context
 */
export async function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
    fingerprint?: string[];
  }
): Promise<string> {
  const Sentry = await import('@sentry/react');
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level ?? 'error',
    fingerprint: context?.fingerprint,
  });
}

/**
 * Capture a message with context
 */
export async function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    fingerprint?: string[];
  }
): Promise<string> {
  const Sentry = await import('@sentry/react');
  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
    fingerprint: context?.fingerprint,
  });
}

/**
 * Add breadcrumb for debugging
 */
export async function addBreadcrumb(
  message: string,
  category = 'custom',
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context
 */
export async function setUser(user: {
  id?: string;
  username?: string;
  email?: string;
  [key: string]: any;
}): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.setUser(user);
}

/**
 * Set additional context
 */
export async function setContext(key: string, context: Record<string, any>): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.setContext(key, context);
}

/**
 * Set tags
 */
export async function setTags(tags: Record<string, string>): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.setTags(tags);
}

/**
 * Start a span for performance monitoring
 */
export async function startSpan<T>(
  context: { name: string; op?: string },
  callback: (span: any) => T
): Promise<T> {
  const Sentry = await import('@sentry/react');
  return Sentry.startSpan(context, callback);
}

/**
 * HOC to wrap components with Sentry error boundary
 */
export async function withSentryErrorBoundary(component: ComponentType) {
  const Sentry = await import('@sentry/react');
  const ReactModule = await import('react');
  return Sentry.withErrorBoundary(component, {
    showDialog: false,
    fallback: ReactModule.createElement('div', null, 'An error occurred. Please refresh the page.')
  });
}

/**
 * Sentry profiler for React components
 */
export async function getSentryProfiler() {
  const Sentry = await import('@sentry/react');
  return Sentry.Profiler;
}

// Note: React Router integration is handled automatically by browserTracingIntegration()