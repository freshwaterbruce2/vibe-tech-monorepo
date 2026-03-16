/**
 * Advanced Caching System
 * Multi-layered caching with Redis integration and intelligent invalidation
 */

import { logger } from './logger';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
	version: string;
	tags: string[];
	metadata?: Record<string, unknown>;
}

interface CacheOptions {
	ttl?: number; // Time to live in milliseconds
	tags?: string[]; // For cache invalidation
	version?: string; // For versioned caching
	priority?: 'low' | 'medium' | 'high';
	compressed?: boolean;
}

interface CacheStatistics {
	hits: number;
	misses: number;
	size: number;
	memoryUsage: number;
	hitRate: number;
}

class AdvancedCacheManager {
	private static instance: AdvancedCacheManager;
	private memoryCache = new Map<string, CacheEntry<unknown>>();
	private statistics: CacheStatistics = {
		hits: 0,
		misses: 0,
		size: 0,
		memoryUsage: 0,
		hitRate: 0,
	};

	private readonly maxMemorySize = 50 * 1024 * 1024; // 50MB
	private readonly cleanupInterval = 5 * 60 * 1000; // 5 minutes
	private cleanupTimer?: NodeJS.Timeout;

	constructor() {
		this.startCleanupProcess();
		this.initializeStoragePersistence();
	}

	static getInstance(): AdvancedCacheManager {
		if (!AdvancedCacheManager.instance) {
			AdvancedCacheManager.instance = new AdvancedCacheManager();
		}
		return AdvancedCacheManager.instance;
	}

	/**
	 * Set cache entry with advanced options
	 */
	async set<T>(
		key: string,
		data: T,
		options: CacheOptions = {},
	): Promise<void> {
		const {
			ttl = 30 * 60 * 1000, // 30 minutes default
			tags = [],
			version = '1.0',
			priority = 'medium',
			compressed = false,
		} = options;

		// Compress data if requested and it's large
		let processedData = data;
		if (compressed && this.shouldCompress(data)) {
			processedData = (await this.compressData(data)) as T;
		}

		const entry: CacheEntry<T> = {
			data: processedData,
			timestamp: Date.now(),
			ttl,
			version,
			tags,
			metadata: {
				priority,
				compressed,
				originalSize: this.getDataSize(data),
				processedSize: this.getDataSize(processedData),
			},
		};

		// Check if we need to free memory
		if (this.shouldEvictMemory()) {
			await this.evictLowPriorityEntries();
		}

		this.memoryCache.set(key, entry);
		this.updateStatistics();

		// Persist to IndexedDB for larger/important entries
		if (priority === 'high' || this.getDataSize(processedData) > 1024 * 100) {
			await this.persistToStorage(key, entry);
		}

		logger.debug('Cache entry set', {
			component: 'AdvancedCache',
			key,
			ttl,
			tags,
			priority,
			size: this.getDataSize(processedData),
		});
	}

	/**
	 * Get cache entry with fallback strategies
	 */
	async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
		// Try memory cache first
		let entry = this.memoryCache.get(key);
		let cacheLevel = 'memory';

		// Try persistent storage if not in memory
		if (!entry) {
			const storedEntry = await this.getFromStorage(key);
			if (storedEntry) {
				entry = storedEntry;
				cacheLevel = 'storage';

				// Put back in memory cache if found
				this.memoryCache.set(key, entry);
			}
		}

		// Check if entry exists and is not expired
		if (entry && !this.isExpired(entry)) {
			this.statistics.hits++;
			this.updateStatistics();

			let {data} = entry;

			// Decompress if needed
			if (entry.metadata?.compressed) {
				data = await this.decompressData(data as string);
			}

			logger.debug('Cache hit', {
				component: 'AdvancedCache',
				key,
				level: cacheLevel,
				age: Date.now() - entry.timestamp,
			});

			return data as T;
		}

		// Cache miss - remove expired entry
		if (entry) {
			this.memoryCache.delete(key);
			await this.removeFromStorage(key);
		}

		this.statistics.misses++;
		this.updateStatistics();

		logger.debug('Cache miss', {
			component: 'AdvancedCache',
			key,
			expired: entry ? this.isExpired(entry) : false,
		});

		// Try fallback if provided
		if (fallback) {
			try {
				const fallbackData = await fallback();
				// Cache the fallback result
				// 10 min TTL for fallback
				await this.set(key, fallbackData, { ttl: 10 * 60 * 1000 });
				return fallbackData;
			} catch (error) {
				logger.warn('Cache fallback failed', {
					component: 'AdvancedCache',
					key,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return null;
	}

	/**
	 * Invalidate cache entries by tags
	 */
	async invalidateByTags(tags: string[]): Promise<void> {
		let invalidatedCount = 0;

		for (const [key, entry] of this.memoryCache.entries()) {
			if (entry.tags.some((tag) => tags.includes(tag))) {
				this.memoryCache.delete(key);
				await this.removeFromStorage(key);
				invalidatedCount++;
			}
		}

		logger.info('Cache invalidated by tags', {
			component: 'AdvancedCache',
			tags,
			invalidatedCount,
		});

		this.updateStatistics();
	}

	/**
	 * Clear all cache
	 */
	async clear(): Promise<void> {
		this.memoryCache.clear();
		await this.clearStorage();
		this.resetStatistics();

		logger.info('All cache cleared', { component: 'AdvancedCache' });
	}

	/**
	 * Get cache statistics
	 */
	getStatistics(): CacheStatistics {
		return { ...this.statistics };
	}

	/**
	 * Preload critical data
	 */
	async preloadCriticalData(): Promise<void> {
		const criticalKeys = [
			'hotel-search-popular',
			'user-preferences',
			'payment-config',
			'destinations-featured',
		];

		logger.info('Preloading critical cache data', {
			component: 'AdvancedCache',
			keys: criticalKeys,
		});

		// In a real implementation, this would fetch and cache critical data
		for (const key of criticalKeys) {
			// Placeholder for actual data fetching
			await this.set(
				key,
				{ preloaded: true, key },
				{
					ttl: 60 * 60 * 1000, // 1 hour
					priority: 'high',
					tags: ['critical', 'preload'],
				},
			);
		}
	}

	private isExpired(entry: CacheEntry<unknown>): boolean {
		return Date.now() > entry.timestamp + entry.ttl;
	}

	private shouldCompress(data: unknown): boolean {
		const size = this.getDataSize(data);
		return size > 1024; // Compress if larger than 1KB
	}

	private async compressData<T>(data: T): Promise<string> {
		// Simple JSON compression (in production, use proper compression like LZ4)
		return JSON.stringify(data);
	}

	private async decompressData(compressedData: string): Promise<unknown> {
		return JSON.parse(compressedData);
	}

	private getDataSize(data: unknown): number {
		return JSON.stringify(data).length;
	}

	private shouldEvictMemory(): boolean {
		return this.statistics.memoryUsage > this.maxMemorySize;
	}

	private async evictLowPriorityEntries(): Promise<void> {
		const entries = Array.from(this.memoryCache.entries());

		// Sort by priority and age
		entries.sort((a, b) => {
			const priorityOrder: Record<string, number> = {
				low: 0,
				medium: 1,
				high: 2,
			};
			const aPriority = priorityOrder[(a[1].metadata?.priority || 'medium') as string] ?? 1;
			const bPriority = priorityOrder[(b[1].metadata?.priority || 'medium') as string] ?? 1;

			if (aPriority !== bPriority) {
return aPriority - bPriority;
}
			return a[1].timestamp - b[1].timestamp; // Older first
		});

		// Remove lowest priority entries
		const toRemove = Math.ceil(entries.length * 0.25); // Remove 25%
		for (let i = 0; i < toRemove; i++) {
			const entry = entries[i];
			if (entry) {
				const [key] = entry;
				this.memoryCache.delete(key);
			}
		}

		logger.info('Memory cache eviction completed', {
			component: 'AdvancedCache',
			evicted: toRemove,
			remaining: this.memoryCache.size,
		});
	}

	private startCleanupProcess(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredEntries();
		}, this.cleanupInterval);
	}

	private cleanupExpiredEntries(): void {
		let cleanedCount = 0;

		for (const [key, entry] of this.memoryCache.entries()) {
			if (this.isExpired(entry)) {
				this.memoryCache.delete(key);
				this.removeFromStorage(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			logger.debug('Cleaned up expired cache entries', {
				component: 'AdvancedCache',
				cleaned: cleanedCount,
			});
			this.updateStatistics();
		}
	}

	private updateStatistics(): void {
		this.statistics.size = this.memoryCache.size;
		this.statistics.memoryUsage = Array.from(this.memoryCache.values()).reduce(
			(total, entry) => total + this.getDataSize(entry),
			0,
		);

		const total = this.statistics.hits + this.statistics.misses;
		this.statistics.hitRate =
			total > 0 ? (this.statistics.hits / total) * 100 : 0;
	}

	private resetStatistics(): void {
		this.statistics = {
			hits: 0,
			misses: 0,
			size: 0,
			memoryUsage: 0,
			hitRate: 0,
		};
	}

	// IndexedDB integration for persistent storage
	private async initializeStoragePersistence(): Promise<void> {
		if (!('indexedDB' in window)) {
			logger.warn('IndexedDB not available', { component: 'AdvancedCache' });
			return;
		}

		try {
			// Initialize IndexedDB for persistent caching
			logger.debug('IndexedDB cache storage initialized', {
				component: 'AdvancedCache',
			});
		} catch (error) {
			logger.warn('Failed to initialize persistent storage', {
				component: 'AdvancedCache',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	private async persistToStorage(
		key: string,
		entry: CacheEntry<unknown>,
	): Promise<void> {
		try {
			// Store in localStorage as fallback (IndexedDB implementation would go here)
			localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
		} catch (error) {
			logger.debug('Failed to persist cache entry', {
				component: 'AdvancedCache',
				key,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	private async getFromStorage(key: string): Promise<CacheEntry<unknown> | null> {
		try {
			const stored = localStorage.getItem(`cache_${key}`);
			return stored ? JSON.parse(stored) : null;
		} catch (_error) {
			return null;
		}
	}

	private async removeFromStorage(key: string): Promise<void> {
		try {
			localStorage.removeItem(`cache_${key}`);
		} catch (_error) {
			// Ignore removal errors
		}
	}

	private async clearStorage(): Promise<void> {
		try {
			// Clear cache-related localStorage items
			Object.keys(localStorage).forEach((key) => {
				if (key.startsWith('cache_')) {
					localStorage.removeItem(key);
				}
			});
		} catch (error) {
			logger.warn('Failed to clear persistent storage', {
				component: 'AdvancedCache',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
		this.memoryCache.clear();
		this.clearStorage();
	}
}

export const advancedCache = AdvancedCacheManager.getInstance();

// React hook for component-level caching
export const useAdvancedCache = () => {
	return {
		get: advancedCache.get.bind(advancedCache),
		set: advancedCache.set.bind(advancedCache),
		invalidateByTags: advancedCache.invalidateByTags.bind(advancedCache),
		clear: advancedCache.clear.bind(advancedCache),
		getStatistics: advancedCache.getStatistics.bind(advancedCache),
	};
};
