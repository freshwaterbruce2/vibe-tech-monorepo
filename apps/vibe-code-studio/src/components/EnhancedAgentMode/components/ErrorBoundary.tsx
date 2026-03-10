/**
 * ErrorBoundary Component
 * Provides error handling and recovery for the Enhanced Agent Mode
 * Includes automatic error reporting and user-friendly recovery options
 */
import { AlertCircle, Bug, RefreshCw, Send } from 'lucide-react';
import { Component, useState, type ComponentType, type ErrorInfo, type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';

/** Props for the ErrorBoundary component */
export interface ErrorBoundaryProps {
  /** Child components to render */
  readonly children: ReactNode;
  /** Optional custom fallback component */
  readonly fallback?: ComponentType<ErrorFallbackProps>;
  /** Optional callback when an error occurs */
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional custom error message */
  readonly errorMessage?: string;
  /** Whether to show the error details (default: false in production) */
  readonly showDetails?: boolean;
}

/** Props passed to the fallback component */
export interface ErrorFallbackProps {
  /** The error that was caught */
  readonly error: Error;
  /** Error information including component stack */
  readonly errorInfo: ErrorInfo | null;
  /** Function to reset the error boundary */
  readonly reset: () => void;
  /** Function to send an error report */
  readonly sendReport: () => Promise<void>;
}

/** State for the ErrorBoundary */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reportSent: boolean;
  reportSending: boolean;
}

// Styled components for the error UI
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  min-height: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  text-align: center;
`;

const ErrorIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin-bottom: 1.5rem;
`;

const ErrorTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.p`
  font-size: 1.1rem;
  opacity: 0.95;
  max-width: 500px;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ErrorDetails = styled.details`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  max-width: 600px;
  text-align: left;

  summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.5rem;

    &:hover {
      text-decoration: underline;
    }
  }

  pre {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$variant === 'primary' ? `
    background: white;
    color: #667eea;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  ` : `
    background: rgba(255, 255, 255, 0.2);
    color: white;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  color: #10b981;
  font-weight: 500;
  margin-top: 1rem;
`;

/**
 * Default error fallback component
 * Provides a user-friendly error display with recovery options
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  reset,
  sendReport,
}: ErrorFallbackProps): ReactElement {
  const [reportSent, setReportSent] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  const handleSendReport = async () => {
    setReportSending(true);
    try {
      await sendReport();
      setReportSent(true);
    } catch (err) {
      console.error('Failed to send error report:', err);
    } finally {
      setReportSending(false);
    }
  };

  return (
    <ErrorContainer>
      <ErrorIcon>
        <Bug size={40} />
      </ErrorIcon>

      <ErrorTitle>Oops! Something went wrong</ErrorTitle>

      <ErrorMessage>
        The agent system encountered an unexpected error.
        {isDevelopment
          ? ' Check the console for more details.'
          : ' Our team has been notified and is working on a fix.'}
      </ErrorMessage>

      {(isDevelopment || errorInfo) && (
        <ErrorDetails>
          <summary>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Error Details
          </summary>
          <div>
            <strong>Error:</strong> {error.message}
          </div>
          {errorInfo && (
            <pre>{errorInfo.componentStack}</pre>
          )}
          {error.stack && isDevelopment && (
            <pre>{error.stack}</pre>
          )}
        </ErrorDetails>
      )}

      <ButtonGroup>
        <Button $variant="primary" onClick={reset}>
          <RefreshCw size={18} />
          Try Again
        </Button>

        {!reportSent && (
          <Button
            $variant="secondary"
            onClick={handleSendReport}
            disabled={reportSending}
          >
            <Send size={18} />
            {reportSending ? 'Sending...' : 'Send Report'}
          </Button>
        )}
      </ButtonGroup>

      {reportSent && (
        <SuccessMessage>
          ✓ Error report sent successfully
        </SuccessMessage>
      )}
    </ErrorContainer>
  );
}

/**
 * Error Boundary component for handling errors in the Enhanced Agent Mode.
 * Provides error recovery, reporting, and user-friendly error display.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reportSent: false,
      reportSending: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to display the error UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  /**
   * Logs the error to an external error tracking service
   */
  private logErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    // Integration with error tracking services like Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    // Log to custom analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Error Boundary Triggered', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Sends an error report to the backend
   */
  sendErrorReport = async (): Promise<void> => {
    const { error, errorInfo } = this.state;

    if (!error) return;

    this.setState({ reportSending: true });

    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send error report');
      }

      this.setState({ reportSent: true });
    } catch (err) {
      console.error('Failed to send error report:', err);
      throw err;
    } finally {
      this.setState({ reportSending: false });
    }
  };

  /**
   * Resets the error boundary to try rendering again
   */
  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      reportSent: false,
      reportSending: false,
    });
  };

  override render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: Fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided, otherwise use default
      const FallbackComponent = Fallback ?? DefaultErrorFallback;

      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          reset={this.reset}
          sendReport={this.sendErrorReport}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;
