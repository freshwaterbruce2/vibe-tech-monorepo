/* eslint-disable no-console */
/**
 * Production-safe logging utility
 * Automatically handles development vs production environments
 */

export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
}

interface LogContext {
	component?: string;
	action?: string;
	userId?: string;
	sessionId?: string;
	[key: string]: unknown;
}

class Logger {
	private level: LogLevel;
	private isDevelopment: boolean;

	constructor() {
		this.isDevelopment = import.meta.env.DEV;
		this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
	}

	private formatMessage(
		level: string,
		message: string,
		context?: LogContext,
	): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
		return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
	}

	private shouldLog(level: LogLevel): boolean {
		return level <= this.level;
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		if (!this.shouldLog(LogLevel.ERROR)) {
return;
}

		const logMessage = this.formatMessage('error', message, context);
		console.error(logMessage);

		if (error) {
			console.error(error);
		}

		// In production, send to error reporting service
		if (!this.isDevelopment && typeof window !== 'undefined') {
			// Example: Send to Sentry, LogRocket, etc.
			this.sendToErrorService(message, error, context);
		}
	}

	warn(message: string, context?: LogContext): void {
		if (!this.shouldLog(LogLevel.WARN)) {
return;
}
		const logMessage = this.formatMessage('warn', message, context);
		console.warn(logMessage);
	}

	info(message: string, context?: LogContext): void {
		if (!this.shouldLog(LogLevel.INFO)) {
return;
}
		const logMessage = this.formatMessage('info', message, context);
		console.info(logMessage);
	}

	debug(message: string, context?: LogContext): void {
		if (!this.shouldLog(LogLevel.DEBUG)) {
return;
}
		const logMessage = this.formatMessage('debug', message, context);
		console.debug(logMessage);
	}

	// Performance logging
	time(label: string): void {
		if (this.isDevelopment) {
			console.time(label);
		}
	}

	timeEnd(label: string): void {
		if (this.isDevelopment) {
			console.timeEnd(label);
		}
	}

	// Group logging for related operations
	group(label: string): void {
		if (this.isDevelopment) {
			console.group(label);
		}
	}

	groupEnd(): void {
		if (this.isDevelopment) {
			console.groupEnd();
		}
	}

	private sendToErrorService(
		message: string,
		error?: Error | unknown,
		context?: LogContext,
	): void {
		// Placeholder for production error reporting
		// In a real app, integrate with Sentry, Bugsnag, etc.
		try {
			// Example error service payload
			const payload = {
				message,
				error:
					error instanceof Error
						? {
								name: error.name,
								message: error.message,
								stack: error.stack,
							}
						: error,
				context,
				timestamp: new Date().toISOString(),
				url: window.location.href,
				userAgent: navigator.userAgent,
			};

			// Would send to your error reporting service here
			// Example: fetch('/api/errors', { method: 'POST', body: JSON.stringify(payload) });
			console.debug('Error payload prepared:', payload);
		} catch (reportingError) {
			// Fallback: don't let error reporting break the app
			console.error('Failed to send error report:', reportingError);
		}
	}
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common use cases
export const logError = (
	message: string,
	error?: Error | unknown,
	context?: LogContext,
) => logger.error(message, error, context);

export const logWarn = (message: string, context?: LogContext) =>
	logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) =>
	logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) =>
	logger.debug(message, context);

// Performance helpers
export const startTimer = (label: string) => logger.time(label);
export const endTimer = (label: string) => logger.timeEnd(label);

// Group helpers
export const startGroup = (label: string) => logger.group(label);
export const endGroup = () => logger.groupEnd();

export default logger;
