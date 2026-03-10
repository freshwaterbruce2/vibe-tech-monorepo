import React from 'react'
import { logErrorToSentry } from '../../services/sentry'
import Button from './Button'
import Card from './Card'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToSentry(error, {
      componentStack: errorInfo.componentStack || 'Unknown component stack',
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="ui-page">
        <div className="ui-container ui-center">
          <Card className="ui-stack ui-stack--md" style={{ maxWidth: 560 }}>
            <h1 className="ui-h1">Something went wrong</h1>
            <p className="ui-text">
              The app hit an unexpected error. Try refreshing the page. If this keeps happening,
              check your environment variables and browser console.
            </p>
            {import.meta.env.DEV && this.state.error ? (
              <pre className="ui-code">{this.state.error.stack ?? this.state.error.message}</pre>
            ) : null}
            <div className="ui-row">
              <Button onClick={() => window.location.reload()}>Refresh</Button>
              <Button
                variant="ghost"
                onClick={() => this.setState({ hasError: false, error: undefined })}
              >
                Dismiss
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
