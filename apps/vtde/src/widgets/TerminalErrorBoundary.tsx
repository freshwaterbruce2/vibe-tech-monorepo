import { Component, ErrorInfo, ReactNode } from 'react';

interface TerminalErrorBoundaryProps {
  children: ReactNode;
}

interface TerminalErrorBoundaryState {
  error: Error | null;
}

export class TerminalErrorBoundary extends Component<
  TerminalErrorBoundaryProps,
  TerminalErrorBoundaryState
> {
  state: TerminalErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): TerminalErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Terminal error boundary caught an error:', error, errorInfo);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private reload = () => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="vtde-terminal__error-boundary" role="alert">
        <div className="vtde-terminal__error-card">
          <h2>Terminal Error</h2>
          <p>The terminal crashed unexpectedly. You can try to recover the widget or reload the app.</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
          <div className="vtde-terminal__error-actions">
            <button className="vtde-terminal__action vtde-terminal__action--primary" onClick={this.reset} type="button">
              Recover Terminal
            </button>
            <button className="vtde-terminal__action" onClick={this.reload} type="button">
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}
