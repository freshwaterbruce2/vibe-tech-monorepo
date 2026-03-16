/* eslint-disable react-refresh/only-export-components */
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react';
import {
	Component,
	useCallback,
	useState,
	type ComponentType,
	type ErrorInfo,
	type ReactNode,
} from 'react';
import { Card } from '@/components/ui/Card';
import { logger } from '@/utils/logger';
import { Button } from './Button';

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ComponentType<ErrorFallbackProps>;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorFallbackProps {
	error: Error;
	resetError: () => void;
	errorInfo?: ErrorInfo | null;
}

const DefaultErrorFallback = ({
	error,
	resetError,
	errorInfo,
}: ErrorFallbackProps) => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	const handleReportError = () => {
		// Enhanced error reporting with more context
		const errorReport = {
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			errorInfo,
			timestamp: new Date().toISOString(),
			url: window.location.href,
			userAgent: navigator.userAgent,
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight,
			},
		};

		// In production, send to error reporting service
		if (process.env.NODE_ENV === 'production') {
			// Integration with error reporting service would go here
			// Example: Sentry.captureException(error, { extra: errorReport });
		} else {
			logger.error('React error boundary triggered', {
				component: 'ErrorBoundary',
				method: 'reportError',
				errorName: error.name,
				errorMessage: error.message,
				errorStack: error.stack,
				userAgent: errorReport.userAgent,
				url: errorReport.url,
				timestamp: errorReport.timestamp,
			});
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
			<Card className="max-w-2xl w-full p-8 text-center">
				<div className="flex flex-col items-center space-y-6">
					{/* Error Icon */}
					<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
						<AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
					</div>

					{/* Error Message */}
					<div className="space-y-2">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Oops! Something went wrong
						</h1>
						<p className="text-gray-600 dark:text-gray-400 max-w-md">
							We encountered an unexpected error. Our team has been notified and
							is working to fix it.
						</p>
					</div>

					{/* Error Details (Development only) */}
					{isDevelopment && error && (
						<Card className="w-full p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
							<div className="text-left space-y-2">
								<div className="flex items-center gap-2 text-red-800 dark:text-red-400">
									<Bug className="w-4 h-4" />
									<span className="font-medium text-sm">
										Development Error Details
									</span>
								</div>
								<div className="text-xs font-mono text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
									{error.name}: {error.message}
								</div>
								{error.stack && (
									<details className="text-xs">
										<summary className="cursor-pointer text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
											Stack Trace
										</summary>
										<pre className="mt-2 text-xs font-mono text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
											{error.stack}
										</pre>
									</details>
								)}
							</div>
						</Card>
					)}

					{/* Actions */}
					<div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
						<Button
							onClick={resetError}
							className="flex items-center gap-2"
							size="lg"
						>
							<RefreshCw className="w-4 h-4" />
							Try Again
						</Button>
						<Button
							onClick={() => (window.location.href = '/')}
							variant="outline"
							className="flex items-center gap-2"
							size="lg"
						>
							<Home className="w-4 h-4" />
							Go Home
						</Button>
					</div>

					{/* Report Error */}
					<Button
						onClick={handleReportError}
						variant="ghost"
						size="sm"
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
					>
						Report this issue
					</Button>
				</div>
			</Card>
		</div>
	);
};

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({
			error,
			errorInfo,
		});

		// Call the onError prop if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Log error to console in development
		if (process.env.NODE_ENV === 'development') {
			logger.error('ErrorBoundary intercepted React component error', {
				component: 'ErrorBoundary',
				method: 'componentDidCatch',
				errorName: error.name,
				errorMessage: error.message,
				errorStack: error.stack,
				componentStack: errorInfo.componentStack,
				errorBoundary: 'react_error_boundary',
			});
		}

		// In production, you might want to send this to an error reporting service
		// Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
	}

	resetError = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError && this.state.error) {
			const FallbackComponent = this.props.fallback || DefaultErrorFallback;

			return (
				<FallbackComponent
					error={this.state.error}
					resetError={this.resetError}
					errorInfo={this.state.errorInfo}
				/>
			);
		}

		return this.props.children;
	}
}

// Hook for handling async errors
export const useErrorHandler = () => {
	const [error, setError] = useState<Error | null>(null);

	const resetError = useCallback(() => {
		setError(null);
	}, []);

	const captureError = useCallback((error: Error | string) => {
		const errorObj = typeof error === 'string' ? new Error(error) : error;
		setError(errorObj);
		logger.error('Async error captured by error handler hook', {
			component: 'useErrorHandler',
			method: 'captureError',
			errorName: errorObj.name,
			errorMessage: errorObj.message,
			errorStack: errorObj.stack,
			isStringError: typeof error === 'string',
		});
	}, []);

	// Throw error to be caught by ErrorBoundary
	if (error) {
		throw error;
	}

	return { captureError, resetError };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
	WrappedComp: ComponentType<P>,
	fallback?: ComponentType<ErrorFallbackProps>,
) => {
	const WrappedComponent = (props: P) => (
		<ErrorBoundary fallback={fallback}>
			<WrappedComp {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName =
		`withErrorBoundary(${WrappedComp.displayName || WrappedComp.name})`;

	return WrappedComponent;
};

export default ErrorBoundary;
