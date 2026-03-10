import { logger } from '../utils/logger';

export class MockCacheService {
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

			return JSON.parse(item.value);
		} catch (error) {
			logger.error('Mock cache get error', { error, key });
			return null;
		}
	}

	async set(key: string, value: any, ttl = 3600): Promise<void> {
		try {
			const serialized = JSON.stringify(value);
			const expires = Date.now() + ttl * 1000;

			this.cache.set(key, { value: serialized, expires });
		} catch (error) {
			logger.error('Mock cache set error', { error, key });
		}
	}

	async delete(key: string): Promise<void> {
		this.cache.delete(key);
	}

	async flush(): Promise<void> {
		this.cache.clear();
	}

	async keys(pattern: string): Promise<string[]> {
		const keys = Array.from(this.cache.keys());
		const regex = new RegExp(pattern.replace(/\*/g, '.*'));
		return keys.filter((key) => regex.test(key));
	}

	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		return Promise.all(keys.map((key) => this.get<T>(key)));
	}

	async mset(
		items: { key: string; value: any; ttl?: number }[],
	): Promise<void> {
		await Promise.all(
			items.map((item) => this.set(item.key, item.value, item.ttl)),
		);
	}

	quit(): void {
		// No-op for mock service
	}
}

// Export singleton instance for local development
export const mockCacheService = new MockCacheService();
