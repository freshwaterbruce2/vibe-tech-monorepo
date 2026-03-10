/**
 * ErrorBoundary Component
 * Provides error handling and recovery for the Enhanced Agent Mode
 */
import { Bug, RefreshCw } from 'lucide-react';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import styled from 'styled-components';

/** Props for the ErrorBoundary component */
export interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly fallback?: React.ComponentType<ErrorFallbackProps>;
}

export interface ErrorFallbackProps {
  readonly error: Error;
  readonly reset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  min-height: 400px;
  background: #1a1a1a;
  color: white;
  text-align: center;
`;

function DefaultErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <ErrorContainer>
      <Bug size={40} className="mb-4 text-red-400" />
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-gray-400 mb-4 max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors flex items-center gap-2"
      >
        <RefreshCw size={16} /> Try Again
      </button>
    </ErrorContainer>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
