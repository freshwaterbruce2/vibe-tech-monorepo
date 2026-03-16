/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
// Monitoring and Error Tracking Utilities

// Error tracking configuration
interface ErrorTrackingConfig {
	sentryDsn?: string;
	environment: string;
	userId?: string;
	sessionId?: string;
}

// Performance metrics interface
interface PerformanceMetric {
	name: string;
	value: number;
	timestamp: number;
	tags?: Record<string, string>;
}

// Business metrics interface
interface BusinessMetric {
	event: string;
	value?: number;
	properties?: Record<string, any>;
	userId?: string;
	timestamp: number;
}

class MonitoringService {
	private config: ErrorTrackingConfig;
	private isEnabled: boolean;

	constructor(config: ErrorTrackingConfig) {
		this.config = config;
		this.isEnabled = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true';
	}

	// Initialize monitoring services
	async initialize() {
		if (!this.isEnabled) {
			return;
		}

		try {
			// Initialize Sentry if DSN is provided
			if (this.config.sentryDsn && typeof window !== 'undefined') {
				// Sentry initialization would go here when the package is installed
				// const Sentry = await import('@sentry/react');
				// Sentry.init({
				//   dsn: this.config.sentryDsn,
				//   environment: this.config.environment,
				//   integrations: [
				//     new Sentry.BrowserTracing(),
				//     new Sentry.Replay(),
				//   ],
				//   tracesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
				//   replaysSessionSampleRate: 0.1,
				//   replaysOnErrorSampleRate: 1.0,
				// });

				console.log(
					'✅ Error tracking will be initialized when Sentry is installed',
				);
			}

			// Initialize Google Analytics if ID is provided
			const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
			if (gaId && typeof window !== 'undefined') {
				this.initializeGoogleAnalytics(gaId);
				console.log('✅ Analytics initialized');
			}
		} catch (error) {
			console.error('Monitoring initialization failed:', error);
		}
	}

	// Initialize Google Analytics
	private initializeGoogleAnalytics(measurementId: string) {
		// Load Google Analytics script
		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
		document.head.appendChild(script);

		// Initialize gtag
		(window as any).dataLayer = (window as any).dataLayer || [];
		function gtag(...args: any[]) {
			(window as any).dataLayer.push(args);
		}
		(window as any).gtag = gtag;

		gtag('js', new Date());
		gtag('config', measurementId, {
			page_title: document.title,
			page_location: window.location.href,
		});
	}

	// Track errors
	captureError(error: Error, context?: Record<string, any>) {
		if (!this.isEnabled) {
			return;
		}

		console.error('Error captured:', error, context);

		// Send to Sentry if available
		if (typeof window !== 'undefined' && (window as any).Sentry) {
			(window as any).Sentry.captureException(error, { extra: context });
		}

		// Send to custom error tracking endpoint
		this.sendToErrorEndpoint(error, context);
	}

	// Track performance metrics
	trackPerformance(metric: PerformanceMetric) {
		if (!this.isEnabled) {
			return;
		}

		console.log('Performance metric:', metric);

		// Send to analytics
		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('event', 'performance_metric', {
				custom_metric_name: metric.name,
				custom_metric_value: metric.value,
				...metric.tags,
			});
		}

		// Send to custom metrics endpoint
		this.sendToMetricsEndpoint(metric);
	}

	// Track business events (bookings, payments, etc.)
	trackBusinessEvent(metric: BusinessMetric) {
		if (!this.isEnabled) {
			return;
		}

		console.log('Business event:', metric);

		// Send to Google Analytics
		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('event', metric.event, {
				event_category: 'business',
				value: metric.value,
				custom_properties: JSON.stringify(metric.properties),
				user_id: metric.userId,
			});
		}

		// Send to custom analytics endpoint
		this.sendToAnalyticsEndpoint(metric);
	}

	// Track page views
	trackPageView(path: string, title?: string) {
		if (!this.isEnabled) {
			return;
		}

		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('config', import.meta.env.VITE_GOOGLE_ANALYTICS_ID, {
				page_path: path,
				page_title: title || document.title,
			});
		}
	}

	// Track user events
	trackUserEvent(event: string, properties?: Record<string, any>) {
		if (!this.isEnabled) {
			return;
		}

		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('event', event, {
				event_category: 'user_interaction',
				...properties,
			});
		}
	}

	// Send error to custom endpoint
	private async sendToErrorEndpoint(
		error: Error,
		context?: Record<string, any>,
	) {
		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			if (!apiUrl) {
				return;
			}

			await fetch(`${apiUrl}/api/monitoring/errors`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: error.message,
					stack: error.stack,
					context,
					timestamp: Date.now(),
					userAgent: navigator.userAgent,
					url: window.location.href,
				}),
			});
		} catch (e) {
			console.error('Failed to send error to endpoint:', e);
		}
	}

	// Send performance metric to custom endpoint
	private async sendToMetricsEndpoint(metric: PerformanceMetric) {
		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			if (!apiUrl) {
				return;
			}

			await fetch(`${apiUrl}/api/monitoring/metrics`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(metric),
			});
		} catch (e) {
			console.error('Failed to send metric to endpoint:', e);
		}
	}

	// Send business event to custom endpoint
	private async sendToAnalyticsEndpoint(metric: BusinessMetric) {
		try {
			const apiUrl = import.meta.env.VITE_API_URL;
			if (!apiUrl) {
				return;
			}

			await fetch(`${apiUrl}/api/monitoring/analytics`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(metric),
			});
		} catch (e) {
			console.error('Failed to send analytics to endpoint:', e);
		}
	}

	// Set user context for tracking
	setUser(userId: string, properties?: Record<string, any>) {
		this.config.userId = userId;

		if (typeof window !== 'undefined' && (window as any).Sentry) {
			(window as any).Sentry.setUser({ id: userId, ...properties });
		}

		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('config', import.meta.env.VITE_GOOGLE_ANALYTICS_ID, {
				user_id: userId,
			});
		}
	}

	// Clear user context
	clearUser() {
		this.config.userId = undefined;

		if (typeof window !== 'undefined' && (window as any).Sentry) {
			(window as any).Sentry.setUser(null);
		}
	}
}

// Create singleton instance
export const monitoring = new MonitoringService({
	sentryDsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.MODE || 'development',
});

// Business event tracking helpers
export const trackBookingStarted = (hotelId: string, userId?: string) => {
	monitoring.trackBusinessEvent({
		event: 'booking_started',
		properties: { hotelId },
		userId,
		timestamp: Date.now(),
	});
};

export const trackBookingCompleted = (
	bookingId: string,
	amount: number,
	userId?: string,
) => {
	monitoring.trackBusinessEvent({
		event: 'booking_completed',
		value: amount,
		properties: { bookingId },
		userId,
		timestamp: Date.now(),
	});
};

export const trackPaymentStarted = (
	bookingId: string,
	amount: number,
	userId?: string,
) => {
	monitoring.trackBusinessEvent({
		event: 'payment_started',
		value: amount,
		properties: { bookingId },
		userId,
		timestamp: Date.now(),
	});
};

export const trackPaymentCompleted = (
	paymentId: string,
	amount: number,
	userId?: string,
) => {
	monitoring.trackBusinessEvent({
		event: 'payment_completed',
		value: amount,
		properties: { paymentId },
		userId,
		timestamp: Date.now(),
	});
};

export const trackSearchPerformed = (
	query: string,
	resultsCount: number,
	userId?: string,
) => {
	monitoring.trackBusinessEvent({
		event: 'search_performed',
		properties: { query, resultsCount },
		userId,
		timestamp: Date.now(),
	});
};

// Performance tracking helpers
export const trackPageLoadTime = (pageName: string, loadTime: number) => {
	monitoring.trackPerformance({
		name: 'page_load_time',
		value: loadTime,
		timestamp: Date.now(),
		tags: { page: pageName },
	});
};

export const trackApiResponseTime = (
	endpoint: string,
	responseTime: number,
) => {
	monitoring.trackPerformance({
		name: 'api_response_time',
		value: responseTime,
		timestamp: Date.now(),
		tags: { endpoint },
	});
};

export default monitoring;
