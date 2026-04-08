import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const label = (this.props as Props).label ?? 'Unknown';
    console.error(`[ErrorBoundary] ${label}:`, error.message, errorInfo.componentStack);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="eb">
          <div className="eb__icon">!</div>
          <div className="eb__title">Window Crashed</div>
          <pre className="eb__message">{this.state.error?.message}</pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="eb__retry"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
