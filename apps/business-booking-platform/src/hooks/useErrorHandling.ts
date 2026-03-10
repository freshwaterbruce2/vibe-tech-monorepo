import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface AppError {
	message: string;
	code?: string;
	details?: any;
	timestamp: Date;
	severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface UseErrorHandlingReturn {
	error: AppError | null;
	isError: boolean;
	clearError: () => void;
	handleError: (error: unknown, context?: string) => void;
	handleAsyncError: <T>(
		asyncFn: () => Promise<T>,
		context?: string,
		options?: ErrorHandlingOptions,
	) => Promise<T | null>;
}

export interface ErrorHandlingOptions {
	showToast?: boolean;
	toastTitle?: string;
	silent?: boolean;
	retryable?: boolean;
	onRetry?: () => void;
}

const getErrorMessage = (error: unknown): string => {
	if (typeof error === 'string') {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	if (error && typeof error === 'object' && 'message' in error) {
		return String(error.message);
	}
	return 'An unexpected error occurred';
};

const getErrorCode = (error: unknown): string | undefined => {
	if (error && typeof error === 'object') {
		if ('code' in error) {
			return String(error.code);
		}
		if ('status' in error) {
			return String(error.status);
		}
		if ('statusCode' in error) {
			return String(error.statusCode);
		}
	}
	return undefined;
};

const getErrorSeverity = (error: unknown): AppError['severity'] => {
	const code = getErrorCode(error);

	// Network errors
	if (code === '404' || code === '400') {
		return 'medium';
	}
	if (code === '401' || code === '403') {
		return 'high';
	}
	if (code === '500' || code === '502' || code === '503') {
		return 'critical';
	}

	// Application errors
	if (error instanceof TypeError) {
		return 'high';
	}
	if (error instanceof ReferenceError) {
		return 'critical';
	}

	return 'medium';
};

const createAppError = (error: unknown, context?: string): AppError => {
	const message = getErrorMessage(error);
	const code = getErrorCode(error);
	const severity = getErrorSeverity(error);

	return {
		message: context ? `${context}: ${message}` : message,
		code,
		details: error,
		timestamp: new Date(),
		severity,
	};
};

const logError = (appError: AppError, context?: string) => {
	const logLevel =
		appError.severity === 'critical'
			? 'error'
			: appError.severity === 'high'
				? 'error'
				: appError.severity === 'medium'
					? 'warn'
					: 'info';

	console[logLevel]('Application Error:', {
		message: appError.message,
		code: appError.code,
		severity: appError.severity,
		timestamp: appError.timestamp,
		context,
		details: appError.details,
	});

	// In production, you might want to send this to an error reporting service
	// Example: Sentry.captureException(appError.details);
};

const showErrorToast = (appError: AppError, options?: ErrorHandlingOptions) => {
	const title = options?.toastTitle || 'Error';
	const isNetworkError =
		appError.code && ['404', '500', '502', '503'].includes(appError.code);

	let description = appError.message;

	// Provide user-friendly messages for common errors
	if (isNetworkError) {
		description =
			'Unable to connect to our servers. Please check your internet connection and try again.';
	} else if (appError.code === '401') {
		description = 'Your session has expired. Please log in again.';
	} else if (appError.code === '403') {
		description = 'You do not have permission to perform this action.';
	}

	const toastOptions = {
		description,
		duration: appError.severity === 'critical' ? 8000 : 5000,
	};

	if (options?.retryable && options?.onRetry) {
		toast.error(title, {
			...toastOptions,
			action: {
				label: 'Retry',
				onClick: options.onRetry,
			},
		});
	} else {
		toast.error(title, toastOptions);
	}
};

export const useErrorHandling = (): UseErrorHandlingReturn => {
	const [error, setError] = useState<AppError | null>(null);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const handleError = useCallback((error: unknown, context?: string) => {
		const appError = createAppError(error, context);
		setError(appError);
		logError(appError, context);

		// Always show toast for user-facing errors
		showErrorToast(appError);
	}, []);

	const handleAsyncError = useCallback(
		async <T>(
			asyncFn: () => Promise<T>,
			context?: string,
			options: ErrorHandlingOptions = {},
		): Promise<T | null> => {
			try {
				clearError();
				const result = await asyncFn();
				return result;
			} catch (error) {
				const appError = createAppError(error, context);

				if (!options.silent) {
					setError(appError);
					logError(appError, context);

					if (options.showToast !== false) {
						showErrorToast(appError, options);
					}
				}

				return null;
			}
		},
		[clearError],
	);

	return {
		error,
		isError: error !== null,
		clearError,
		handleError,
		handleAsyncError,
	};
};

// Specialized hooks for common error scenarios

export const useApiErrorHandling = () => {
	const { handleAsyncError, ...rest } = useErrorHandling();

	const handleApiCall = useCallback(
		<T>(apiCall: () => Promise<T>, operation?: string) => {
			return handleAsyncError(
				apiCall,
				operation ? `API: ${operation}` : 'API call',
				{
					showToast: true,
					retryable: true,
				},
			);
		},
		[handleAsyncError],
	);

	return {
		...rest,
		handleApiCall,
	};
};

export const useFormErrorHandling = () => {
	const { handleError, ...rest } = useErrorHandling();

	const handleValidationError = useCallback(
		(fieldErrors: Record<string, string[]>) => {
			const errorMessage = Object.entries(fieldErrors)
				.map(([field, errors]) => `${field}: ${errors.join(', ')}`)
				.join('; ');

			handleError(errorMessage, 'Form validation');
		},
		[handleError],
	);

	const handleSubmissionError = useCallback(
		(error: unknown) => {
			handleError(error, 'Form submission');
		},
		[handleError],
	);

	return {
		...rest,
		handleValidationError,
		handleSubmissionError,
	};
};

export const useSearchErrorHandling = () => {
	const { handleAsyncError, ...rest } = useErrorHandling();

	const handleSearchError = useCallback(
		<T>(searchFn: () => Promise<T>, searchType = 'search') => {
			return handleAsyncError(searchFn, `Search: ${searchType}`, {
				showToast: true,
				toastTitle: 'Search Error',
				retryable: true,
			});
		},
		[handleAsyncError],
	);

	return {
		...rest,
		handleSearchError,
	};
};

export const useBookingErrorHandling = () => {
	const { handleAsyncError, ...rest } = useErrorHandling();

	const handleBookingOperation = useCallback(
		<T>(bookingFn: () => Promise<T>, operation: string) => {
			return handleAsyncError(bookingFn, `Booking: ${operation}`, {
				showToast: true,
				toastTitle: 'Booking Error',
			});
		},
		[handleAsyncError],
	);

	return {
		...rest,
		handleBookingOperation,
	};
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandling = () => {
	// Handle unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		console.error('Unhandled promise rejection:', event.reason);

		toast.error('Unexpected Error', {
			description:
				'An unexpected error occurred. Please refresh the page if problems persist.',
			duration: 6000,
		});

		// Prevent the default browser behavior
		event.preventDefault();
	});

	// Handle general JavaScript errors
	window.addEventListener('error', (event) => {
		console.error('Global error:', event.error);

		toast.error('Application Error', {
			description: 'A technical error occurred. Please refresh the page.',
			duration: 6000,
		});
	});
};

export default useErrorHandling;
