import type { ErrorInfo } from 'react';
import { toast } from 'sonner';
import { captureError, addBreadcrumb, setContext, setTags } from '@/lib/sentry';

/**
 * Standard error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  VOICE_RECOGNITION = 'VOICE_RECOGNITION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Standard error interface
 */
export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: Record<string, any>;
  userMessage?: string;
  recoverable?: boolean;
}

/**
 * Creates a standardized application error
 */
export function createAppError(
  type: ErrorType,
  message: string,
  options?: {
    code?: string;
    details?: Record<string, any>;
    userMessage?: string;
    recoverable?: boolean;
    cause?: Error;
  }
): AppError {
  const error = new Error(message) as AppError;
  error.type = type;
  error.code = options?.code;
  error.details = options?.details;
  error.userMessage = options?.userMessage ?? message;
  error.recoverable = options?.recoverable ?? true;

  if (options?.cause) {
    (error as any).cause = options.cause;
  }

  return error;
}

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  logToService?: boolean;
  fallbackMessage?: string;
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showToast: true,
  logToConsole: true,
  logToService: process.env['NODE_ENV'] === 'production',
  fallbackMessage: 'An unexpected error occurred. Please try again.',
};

/**
 * Centralized error handler
 */
export function handleError(
  error: Error | AppError,
  context?: string,
  config: ErrorHandlerConfig = {}
): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const appError = isAppError(error) ? error : createAppError(ErrorType.UNKNOWN, error.message, { cause: error });

  // Log to console if enabled
  if (finalConfig.logToConsole) {
    console.error(`[${context ?? 'Unknown'}] ${appError.type}:`, {
      message: appError.message,
      code: appError.code,
      details: appError.details,
      stack: appError.stack,
    });
  }

  // Log to external service if enabled (placeholder for future implementation)
  if (finalConfig.logToService) {
    logToExternalService(appError, context);
  }

  // Show user-friendly toast notification
  if (finalConfig.showToast) {
    const userMessage = appError.userMessage ?? finalConfig.fallbackMessage;

    switch (appError.type) {
      case ErrorType.VALIDATION:
        toast.error('Validation Error', {
          description: userMessage,
          duration: 4000,
        });
        break;

      case ErrorType.NETWORK:
        toast.error('Network Error', {
          description: userMessage ?? 'Please check your internet connection and try again.',
          duration: 5000,
        });
        break;

      case ErrorType.STORAGE:
        toast.error('Storage Error', {
          description: userMessage ?? 'Unable to save data. Please try again.',
          duration: 4000,
        });
        break;

      case ErrorType.VOICE_RECOGNITION:
        toast.error('Voice Recognition Error', {
          description: userMessage ?? 'Voice command failed. Please try again.',
          duration: 3000,
        });
        break;

      case ErrorType.PERMISSION:
        toast.error('Permission Required', {
          description: userMessage ?? 'Please grant the required permissions to continue.',
          duration: 6000,
        });
        break;

      default:
        toast.error('Error', {
          description: userMessage,
          duration: 4000,
        });
    }
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error && typeof error === 'object' && 'type' in error && Object.values(ErrorType).includes(error.type);
}

/**
 * Async error handler wrapper for promises
 */
export async function handleAsyncError<T>(
  promise: Promise<T>,
  context?: string,
  config?: ErrorHandlerConfig
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    handleError(error as Error, context, config);
    return null;
  }
}

/**
 * Error boundary helper for React components
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: ErrorInfo) => {
    const appError = createAppError(
      ErrorType.UNKNOWN,
      `Component error in ${componentName}`,
      {
        details: {
          componentStack: errorInfo.componentStack,
          errorBoundary: componentName,
        },
        userMessage: 'A component error occurred. The page will reload automatically.',
        recoverable: false,
      }
    );

    handleError(appError, `ErrorBoundary:${componentName}`, {
      showToast: false, // Error boundary will show its own UI
      logToConsole: true,
      logToService: true,
    });
  };
}

/**
 * Voice recognition specific error handler
 */
export function handleVoiceError(error: Error, context = 'VoiceRecognition'): void {
  let appError: AppError;

  if (error.message.includes('not-allowed') || error.message.includes('permission')) {
    appError = createAppError(
      ErrorType.PERMISSION,
      'Microphone permission denied',
      {
        userMessage: 'Please enable microphone access in your browser settings to use voice commands.',
        recoverable: true,
      }
    );
  } else if (error.message.includes('network')) {
    appError = createAppError(
      ErrorType.NETWORK,
      'Voice recognition network error',
      {
        userMessage: 'Voice recognition requires an internet connection. Please check your connection.',
        recoverable: true,
      }
    );
  } else {
    appError = createAppError(
      ErrorType.VOICE_RECOGNITION,
      error.message,
      {
        userMessage: 'Voice recognition failed. Please try again or use manual input.',
        recoverable: true,
      }
    );
  }

  handleError(appError, context);
}

/**
 * Storage specific error handler
 */
export function handleStorageError(error: Error, operation: string): void {
  const appError = createAppError(
    ErrorType.STORAGE,
    `Storage ${operation} failed: ${error.message}`,
    {
      details: { operation },
      userMessage: `Failed to ${operation} data. Please try again.`,
      recoverable: true,
    }
  );

  handleError(appError, 'Storage');
}

/**
 * Validation error handler
 */
export function handleValidationError(errors: string[], context?: string): void {
  const appError = createAppError(
    ErrorType.VALIDATION,
    `Validation failed: ${errors.join(', ')}`,
    {
      details: { validationErrors: errors },
      userMessage: errors.length === 1 ? errors[0] : `Please fix the following issues: ${errors.join(', ')}`,
      recoverable: true,
    }
  );

  handleError(appError, context ?? 'Validation');
}

/**
 * Log error to Sentry with proper context and tags
 */
function logToExternalService(error: AppError, context?: string): void {
  try {
    // Add breadcrumb for the error
    addBreadcrumb(
      `Error logged: ${error.type}`,
      'error',
      'error',
      {
        context,
        errorType: error.type,
        errorCode: error.code,
      }
    );

    // Set error context
    setContext('errorDetails', {
      type: error.type,
      code: error.code,
      details: error.details,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      recoverable: error.recoverable,
    });

    // Set tags for better error organization
    setTags({
      errorType: error.type,
      errorCode: error.code ?? 'unknown',
      context: context ?? 'unknown',
      recoverable: error.recoverable ? 'true' : 'false',
    });

    // Capture the error to Sentry
    const eventId = captureError(error, {
      tags: {
        errorType: error.type,
        errorCode: error.code ?? 'unknown',
        context: context ?? 'unknown',
        recoverable: error.recoverable ? 'true' : 'false',
      },
      extra: {
        errorDetails: error.details,
        userMessage: error.userMessage,
        originalStack: error.stack,
      },
      level: error.recoverable ? 'warning' : 'error',
      fingerprint: [
        '{{ default }}',
        error.type,
        error.code ?? 'unknown',
        context ?? 'unknown',
      ],
    });

    console.warn(`Error logged to Sentry with event ID: ${eventId}`);
  } catch (sentryError) {
    // Fallback logging if Sentry fails
    console.error('Failed to log error to Sentry:', sentryError);
    console.error('Original error:', {
      error: {
        type: error.type,
        message: error.message,
        code: error.code,
        details: error.details,
      },
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  context?: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Retry attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  handleError(lastError!, context);
  throw lastError!;
}
