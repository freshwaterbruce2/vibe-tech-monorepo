/**
 * Phase 2 Integration Manager
 * Coordinates all Phase 2 optimizations and initializes systems
 */

import { advancedCache } from './advancedCache';
import { analytics } from './analytics';
import { logger } from './logger';
import { progressiveImageLoader } from './progressiveImageLoader';
import { securityManager } from './security';
import { seoManager } from './seoUtils';
import { websocketManager } from './websocketManager';

export interface Phase2Config {
	analytics: {
		enabled: boolean;
		userId?: string;
	};
	cache: {
		enabled: boolean;
		preloadCritical: boolean;
	};
	websocket: {
		enabled: boolean;
		url?: string;
	};
	images: {
		progressive: boolean;
		preload: string[];
	};
	security: {
		enabled: boolean;
		strictMode: boolean;
	};
	seo: {
		enabled: boolean;
		autoUpdate: boolean;
	};
}

class Phase2IntegrationManager {
	private static instance: Phase2IntegrationManager;
	private config: Phase2Config;
	private initialized = false;

	constructor() {
		this.config = this.getDefaultConfig();
	}

	static getInstance(): Phase2IntegrationManager {
		if (!Phase2IntegrationManager.instance) {
			Phase2IntegrationManager.instance = new Phase2IntegrationManager();
		}
		return Phase2IntegrationManager.instance;
	}

	/**
	 * Initialize all Phase 2 optimizations
	 */
	async initialize(customConfig?: Partial<Phase2Config>): Promise<void> {
		if (this.initialized) {
			logger.debug('Phase 2 already initialized', {
				component: 'Phase2Integration',
			});
			return;
		}

		if (customConfig) {
			this.config = { ...this.config, ...customConfig };
		}

		logger.info('Initializing Phase 2 optimizations', {
			component: 'Phase2Integration',
			config: this.config,
		});

		try {
			// Initialize in optimal order
			await this.initializeSecurity();
			await this.initializeAnalytics();
			await this.initializeCache();
			await this.initializeImageLoader();
			await this.initializeSEO();
			await this.initializeWebSocket();

			this.initialized = true;

			logger.info('Phase 2 initialization complete', {
				component: 'Phase2Integration',
				systems: this.getEnabledSystems(),
			});

			// Track initialization success
			analytics.track('phase2_initialized', {
				systems: this.getEnabledSystems(),
				timestamp: Date.now(),
			});
		} catch (error) {
			logger.error('Phase 2 initialization failed', {
				component: 'Phase2Integration',
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			analytics.error(
				'phase2_init_failed',
				error instanceof Error ? error.message : 'Unknown error',
			);
			throw error;
		}
	}

	/**
	 * Get performance metrics from all systems
	 */
	getPerformanceMetrics(): Record<string, any> {
		return {
			cache: this.config.cache.enabled ? advancedCache.getStatistics() : null,
			websocket: this.config.websocket.enabled
				? websocketManager.getStatistics()
				: null,
			analytics: this.config.analytics.enabled ? { enabled: true } : null,
			timestamp: Date.now(),
		};
	}

	/**
	 * Health check for all systems
	 */
	async healthCheck(): Promise<Record<string, boolean>> {
		const health: Record<string, boolean> = {};

		if (this.config.cache.enabled) {
			try {
				await advancedCache.set('health-check', { test: true }, { ttl: 1000 });
				const result = await advancedCache.get('health-check');
				health.cache = !!result;
			} catch {
				health.cache = false;
			}
		}

		if (this.config.websocket.enabled) {
			health.websocket = websocketManager.getConnectionState() === 'connected';
		}

		if (this.config.security.enabled) {
			try {
				const token = securityManager.generateSecureToken();
				health.security = token.length > 0;
			} catch {
				health.security = false;
			}
		}

		health.analytics = this.config.analytics.enabled;
		health.images = this.config.images.progressive;
		health.seo = this.config.seo.enabled;

		logger.debug('Phase 2 health check completed', {
			component: 'Phase2Integration',
			health,
		});

		return health;
	}

	/**
	 * Gracefully shutdown all systems
	 */
	async shutdown(): Promise<void> {
		logger.info('Shutting down Phase 2 systems', {
			component: 'Phase2Integration',
		});

		try {
			// Disconnect WebSocket
			if (this.config.websocket.enabled) {
				websocketManager.disconnect();
			}

			// Clear caches
			if (this.config.cache.enabled) {
				await advancedCache.clear();
			}

			// Reset SEO
			if (this.config.seo.enabled) {
				seoManager.reset();
			}

			this.initialized = false;

			logger.info('Phase 2 shutdown complete', {
				component: 'Phase2Integration',
			});
		} catch (error) {
			logger.error('Error during Phase 2 shutdown', {
				component: 'Phase2Integration',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	private getDefaultConfig(): Phase2Config {
		return {
			analytics: {
				enabled: true,
				userId: undefined,
			},
			cache: {
				enabled: true,
				preloadCritical: true,
			},
			websocket: {
				enabled: import.meta.env.MODE === 'production',
				url:
					import.meta.env.VITE_WEBSOCKET_URL || 'wss://api.vibebooking.com/ws',
			},
			images: {
				progressive: true,
				preload: [
					'/images/hero-bg.jpg',
					'/images/featured-hotel-1.jpg',
					'/images/featured-hotel-2.jpg',
				],
			},
			security: {
				enabled: true,
				strictMode: import.meta.env.MODE === 'production',
			},
			seo: {
				enabled: true,
				autoUpdate: true,
			},
		};
	}

	private async initializeSecurity(): Promise<void> {
		if (!this.config.security.enabled) {
return;
}

		securityManager.initialize();

		logger.debug('Security system initialized', {
			component: 'Phase2Integration',
			strictMode: this.config.security.strictMode,
		});
	}

	private async initializeAnalytics(): Promise<void> {
		if (!this.config.analytics.enabled) {
return;
}

		if (this.config.analytics.userId) {
			analytics.setUserId(this.config.analytics.userId);
		}

		// Track Phase 2 initialization start
		analytics.track('phase2_init_started', {
			timestamp: Date.now(),
			userAgent: navigator.userAgent,
		});

		logger.debug('Analytics system initialized', {
			component: 'Phase2Integration',
			hasUserId: !!this.config.analytics.userId,
		});
	}

	private async initializeCache(): Promise<void> {
		if (!this.config.cache.enabled) {
return;
}

		if (this.config.cache.preloadCritical) {
			await advancedCache.preloadCriticalData();
		}

		logger.debug('Advanced cache system initialized', {
			component: 'Phase2Integration',
			preloadCritical: this.config.cache.preloadCritical,
		});
	}

	private async initializeImageLoader(): Promise<void> {
		if (!this.config.images.progressive) {
return;
}

		if (this.config.images.preload.length > 0) {
			await progressiveImageLoader.preloadImages(this.config.images.preload);
		}

		logger.debug('Progressive image loader initialized', {
			component: 'Phase2Integration',
			preloadCount: this.config.images.preload.length,
		});
	}

	private async initializeSEO(): Promise<void> {
		if (!this.config.seo.enabled) {
return;
}

		// Set default homepage SEO
		if (window.location.pathname === '/') {
			seoManager.setSEO(seoManager.createHomepageSEO());
		}

		logger.debug('SEO system initialized', {
			component: 'Phase2Integration',
			autoUpdate: this.config.seo.autoUpdate,
		});
	}

	private async initializeWebSocket(): Promise<void> {
		if (!this.config.websocket.enabled || !this.config.websocket.url) {
return;
}

		try {
			await websocketManager.connect({
				url: this.config.websocket.url,
				reconnectAttempts: 3,
				heartbeatInterval: 30000,
			});

			// Subscribe to real-time updates
			websocketManager.subscribe('price_update', (message) => {
				analytics.track('realtime_price_update', message.data);
			});

			websocketManager.subscribe('availability_update', (message) => {
				analytics.track('realtime_availability_update', message.data);
			});

			logger.debug('WebSocket system initialized', {
				component: 'Phase2Integration',
				url: this.config.websocket.url,
			});
		} catch (error) {
			logger.warn(
				'WebSocket initialization failed, continuing without real-time features',
				{
					component: 'Phase2Integration',
					error: error instanceof Error ? error.message : 'Unknown error',
				},
			);
		}
	}

	private getEnabledSystems(): string[] {
		const systems: string[] = [];

		if (this.config.analytics.enabled) {
systems.push('analytics');
}
		if (this.config.cache.enabled) {
systems.push('cache');
}
		if (this.config.websocket.enabled) {
systems.push('websocket');
}
		if (this.config.images.progressive) {
systems.push('images');
}
		if (this.config.security.enabled) {
systems.push('security');
}
		if (this.config.seo.enabled) {
systems.push('seo');
}

		return systems;
	}
}

export const phase2Integration = Phase2IntegrationManager.getInstance();

// React hook for Phase 2 integration
export const usePhase2 = () => {
	return {
		initialize: phase2Integration.initialize.bind(phase2Integration),
		getPerformanceMetrics:
			phase2Integration.getPerformanceMetrics.bind(phase2Integration),
		healthCheck: phase2Integration.healthCheck.bind(phase2Integration),
		shutdown: phase2Integration.shutdown.bind(phase2Integration),
	};
};
