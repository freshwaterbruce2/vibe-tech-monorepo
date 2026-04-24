import * as Sentry from "@sentry/react";

export const initSentry = () => {
	const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

	if (sentryDsn) {
		Sentry.init({
			dsn: sentryDsn,
			integrations: [],
			// Performance Monitoring
			tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
			environment: import.meta.env.MODE,
		});
	}
};

// Custom error boundary error handler
export const logErrorToSentry = (
	error: Error,
	errorInfo: { componentStack: string },
) => {
	Sentry.withScope((scope) => {
		scope.setExtras(errorInfo);
		Sentry.captureException(error);
	});
};

// Log custom events
export const logEvent = (message: string, extra?: Record<string, unknown>) => {
	Sentry.captureMessage(message, {
		level: "info",
		extra,
	});
};

// Set user context
export const setUserContext = (user: {
	id: string;
	email: string;
	name?: string;
}) => {
	Sentry.setUser({
		id: user.id,
		email: user.email,
		username: user.name,
	});
};

// Clear user context on logout
export const clearUserContext = () => {
	Sentry.setUser(null);
};
