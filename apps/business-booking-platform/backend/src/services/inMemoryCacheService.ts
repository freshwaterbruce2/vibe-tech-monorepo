import { logger } from '../utils/logger';

const DEFAULT_TTL_SECONDS = parseInt(process.env.CACHE_DEFAULT_TTL || '3600');

/**
 * In-memory cache with per-entry TTL.
 * Used as a fallback when Redis is unavailable or when LOCAL_SQLITE=true.
 * Production-safe: no external dependencies, bounded by Node.js process memory.
 */
export class InMemoryCacheService {
	private cache = new Map<string, { value: string; expires: number }>();

	async get<T>(key: string): Promise<T | null> {
		try {
			const item = this.cache.get(key);
			if (!item) {
				return null;
			}

			if (Date.now() > item.expires) {
				this.cache.delete(key);
				return null;
			}

			return JSON.parse(item.value) as T;
		} catch (error) {
			logger.error('In-memory cache get error', { error, key });
			return null;
		}
	}

	async set(key: string, value: unknown, ttl = DEFAULT_TTL_SECONDS): Promise<void> {
		try {
			const serialized = JSON.stringify(value);
			const expires = Date.now() + ttl * 1000;
			this.cache.set(key, { value: serialized, expires });
		} catch (error) {
			logger.error('In-memory cache set error', { error, key });
		}
	}

	async delete(key: string): Promise<void> {
		this.cache.delete(key);
	}

	async flush(): Promise<void> {
		this.cache.clear();
	}

	async keys(pattern: string): Promise<string[]> {
		const allKeys = Array.from(this.cache.keys());
		const regex = new RegExp(pattern.replace(/\*/g, '.*'));
		return allKeys.filter((key) => regex.test(key));
	}

	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		return Promise.all(keys.map((key) => this.get<T>(key)));
	}

	async mset(items: { key: string; value: unknown; ttl?: number }[]): Promise<void> {
		await Promise.all(items.map((item) => this.set(item.key, item.value, item.ttl)));
	}

	/** No-op: no connection to close for in-memory cache. */
	quit(): void {
		// No persistent connection — nothing to close.
	}
}

export const inMemoryCacheService = new InMemoryCacheService();
