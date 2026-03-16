/**
 * Advanced Analytics Tracking System
 * Comprehensive user behavior and performance monitoring
 */

import { logger } from './logger';

export interface AnalyticsEvent {
	name: string;
	properties?: Record<string, unknown>;
	timestamp?: number;
	userId?: string;
	sessionId?: string;
}

export interface PerformanceMetric {
	name: string;
	value: number;
	unit: string;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

export interface ConversionEvent {
	step: string;
	funnel: string;
	value?: number;
	metadata?: Record<string, unknown>;
}

class AnalyticsManager {
	private static instance: AnalyticsManager;
	private sessionId: string;
	private userId?: string;
	private isEnabled = true;
	private eventQueue: AnalyticsEvent[] = [];
	private performanceMetrics: PerformanceMetric[] = [];

	constructor() {
		this.sessionId = this.generateSessionId();
		this.initializePerformanceTracking();
		this.startPeriodicReporting();
	}

	static getInstance(): AnalyticsManager {
		if (!AnalyticsManager.instance) {
			AnalyticsManager.instance = new AnalyticsManager();
		}
		return AnalyticsManager.instance;
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	setUserId(userId: string): void {
		this.userId = userId;
		this.track('user_identified', { userId });
	}

	/**
	 * Track user events
	 */
	track(eventName: string, properties: Record<string, unknown> = {}): void {
		if (!this.isEnabled) {
return;
}

		const event: AnalyticsEvent = {
			name: eventName,
			properties: {
				...properties,
				url: window.location.href,
				referrer: document.referrer,
				userAgent: navigator.userAgent,
				viewport: {
					width: window.innerWidth,
					height: window.innerHeight,
				},
			},
			timestamp: Date.now(),
			userId: this.userId,
			sessionId: this.sessionId,
		};

		this.eventQueue.push(event);

		logger.debug('Analytics event tracked', {
			component: 'Analytics',
			event: eventName,
			properties: Object.keys(properties),
		});

		// Send immediately for critical events
		if (this.isCriticalEvent(eventName)) {
			this.flushEvents();
		}
	}

	/**
	 * Track page views
	 */
	pageView(pageName: string, additionalProps: Record<string, unknown> = {}): void {
		this.track('page_view', {
			page: pageName,
			title: document.title,
			...additionalProps,
		});
	}

	/**
	 * Track conversion funnel events
	 */
	conversion(event: ConversionEvent): void {
		this.track('conversion_event', {
			step: event.step,
			funnel: event.funnel,
			value: event.value,
			...event.metadata,
		});
	}

	/**
	 * Track performance metrics
	 */
	performance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
		const performanceMetric: PerformanceMetric = {
			...metric,
			timestamp: Date.now(),
		};

		this.performanceMetrics.push(performanceMetric);

		logger.debug('Performance metric recorded', {
			component: 'Analytics',
			metric: metric.name,
			value: metric.value,
			unit: metric.unit,
		});
	}

	/**
	 * Track user interactions
	 */
	interaction(
		element: string,
		action: string,
		metadata: Record<string, unknown> = {},
	): void {
		this.track('user_interaction', {
			element,
			action,
			...metadata,
		});
	}

	/**
	 * Track errors
	 */
	error(
		errorName: string,
		errorMessage: string,
		metadata: Record<string, unknown> = {},
	): void {
		this.track('error_occurred', {
			errorName,
			errorMessage,
			stack: metadata.stack,
			component: metadata.component,
			...metadata,
		});
	}

	/**
	 * Track business metrics
	 */
	business(
		metricName: string,
		value: number,
		metadata: Record<string, unknown> = {},
	): void {
		this.track('business_metric', {
			metric: metricName,
			value,
			...metadata,
		});
	}

	private isCriticalEvent(eventName: string): boolean {
		const criticalEvents = [
			'page_view',
			'search_performed',
			'hotel_selected',
			'booking_initiated',
			'payment_completed',
			'error_occurred',
		];
		return criticalEvents.includes(eventName);
	}

	private initializePerformanceTracking(): void {
		// Track Core Web Vitals
		if ('web-vital' in window) {
			// This would integrate with web-vitals library
			logger.debug('Web Vitals tracking initialized', {
				component: 'Analytics',
			});
		}

		// Track navigation timing
		window.addEventListener('load', () => {
			setTimeout(() => {
				const perfData = performance.getEntriesByType(
					'navigation',
				)[0] as PerformanceNavigationTiming;

				if (perfData) {
					this.performance({
						name: 'page_load_time',
						value: perfData.loadEventEnd - perfData.loadEventStart,
						unit: 'ms',
						metadata: {
							domContentLoaded:
								perfData.domContentLoadedEventEnd -
								perfData.domContentLoadedEventStart,
							firstByte: perfData.responseStart - perfData.requestStart,
						},
					});
				}
			}, 100);
		});

		// Track resource loading
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === 'resource') {
					const resourceEntry = entry as PerformanceResourceTiming;
					this.performance({
						name: 'resource_load_time',
						value: resourceEntry.duration,
						unit: 'ms',
						metadata: {
							resource: resourceEntry.name,
							size: resourceEntry.transferSize,
							type: resourceEntry.initiatorType,
						},
					});
				}
			}
		});

		observer.observe({ entryTypes: ['resource'] });
	}

	private startPeriodicReporting(): void {
		// Send events every 30 seconds
		setInterval(() => {
			this.flushEvents();
			this.flushPerformanceMetrics();
		}, 30000);

		// Send events before page unload
		window.addEventListener('beforeunload', () => {
			this.flushEvents();
			this.flushPerformanceMetrics();
		});
	}

	private flushEvents(): void {
		if (this.eventQueue.length === 0) {
return;
}

		const events = [...this.eventQueue];
		this.eventQueue = [];

		// In production, send to analytics service
		if (import.meta.env.MODE === 'development') {
			logger.info('Analytics events (dev mode)', {
				component: 'Analytics',
				count: events.length,
				events: events.slice(0, 3), // Show first 3 events
			});
		} else {
			// Send to analytics service (Google Analytics, Mixpanel, etc.)
			this.sendToAnalyticsService(events);
		}
	}

	private flushPerformanceMetrics(): void {
		if (this.performanceMetrics.length === 0) {
return;
}

		const metrics = [...this.performanceMetrics];
		this.performanceMetrics = [];

		logger.info('Performance metrics collected', {
			component: 'Analytics',
			count: metrics.length,
			avgLoadTime: this.calculateAverageLoadTime(metrics),
		});

		// Send to performance monitoring service
		if (import.meta.env.MODE !== 'development') {
			this.sendToPerformanceService(metrics);
		}
	}

	private calculateAverageLoadTime(metrics: PerformanceMetric[]): number {
		const loadTimeMetrics = metrics.filter((m) => m.name.includes('load_time'));
		if (loadTimeMetrics.length === 0) {
return 0;
}

		const total = loadTimeMetrics.reduce(
			(sum, metric) => sum + metric.value,
			0,
		);
		return Math.round(total / loadTimeMetrics.length);
	}

	private sendToAnalyticsService(events: AnalyticsEvent[]): void {
		// Integration with analytics services
		// Example: Google Analytics 4, Mixpanel, Amplitude, etc.
		logger.debug('Sending events to analytics service', {
			component: 'Analytics',
			count: events.length,
		});
	}

	private sendToPerformanceService(metrics: PerformanceMetric[]): void {
		// Integration with performance monitoring services
		// Example: DataDog, New Relic, Sentry Performance, etc.
		logger.debug('Sending metrics to performance service', {
			component: 'Analytics',
			count: metrics.length,
		});
	}

	/**
	 * Disable analytics (for privacy compliance)
	 */
	disable(): void {
		this.isEnabled = false;
		this.eventQueue = [];
		this.performanceMetrics = [];
		logger.info('Analytics disabled', { component: 'Analytics' });
	}

	/**
	 * Enable analytics
	 */
	enable(): void {
		this.isEnabled = true;
		logger.info('Analytics enabled', { component: 'Analytics' });
	}
}

export const analytics = AnalyticsManager.getInstance();

// React hook for component-level analytics
export const useAnalytics = () => {
	return {
		track: analytics.track.bind(analytics),
		pageView: analytics.pageView.bind(analytics),
		conversion: analytics.conversion.bind(analytics),
		interaction: analytics.interaction.bind(analytics),
		performance: analytics.performance.bind(analytics),
		error: analytics.error.bind(analytics),
		business: analytics.business.bind(analytics),
	};
};
