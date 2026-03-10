import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { type MockCacheService, mockCacheService } from './mockCacheService';

export class CacheService {
	private redis: Redis | null = null;
	private mockCache: MockCacheService | null = null;
	private defaultTTL: number;
	private isRedisAvailable = false;

	constructor() {
		// Always use mock cache for local SQLite development
		if (process.env.LOCAL_SQLITE === 'true') {
			this.mockCache = mockCacheService;
			logger.info('Using mock cache service for local development');
			this.defaultTTL = 3600;
			return;
		}

		// Try to connect to Redis for production
		try {
			const redisConfig = {
				host: process.env.REDIS_HOST || 'localhost',
				port: parseInt(process.env.REDIS_PORT || '6379'),
				password: process.env.REDIS_PASSWORD,
				db: parseInt(process.env.REDIS_DB || '0'),
				retryStrategy: (times: number) => {
					if (times > 3) {
						logger.warn('Redis unavailable after 3 attempts, using mock cache');
						this.isRedisAvailable = false;
						this.mockCache = mockCacheService;
						return null;
					}
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
			};

			this.redis = new Redis(redisConfig);

			this.redis.on('connect', () => {
				logger.info('Redis connected');
				this.isRedisAvailable = true;
			});

			this.redis.on('error', (error) => {
				logger.error('Redis error', { error });
				this.isRedisAvailable = false;
				if (!this.mockCache) {
					this.mockCache = mockCacheService;
				}
			});
		} catch (error) {
			logger.warn('Redis initialization failed, using mock cache', { error });
			this.mockCache = mockCacheService;
		}

		this.defaultTTL = parseInt(process.env.REDIS_TTL || '3600');
	}

	async get<T>(key: string): Promise<T | null> {
		try {
			if (this.mockCache) {
				return this.mockCache.get<T>(key);
			}
			if (!this.redis || !this.isRedisAvailable) {
return null;
}

			const value = await this.redis.get(key);
			if (!value) {
return null;
}

			return JSON.parse(value);
		} catch (error) {
			logger.error('Cache get error', { error, key });
			return null;
		}
	}

	async set(key: string, value: any, ttl?: number): Promise<void> {
		try {
			if (this.mockCache) {
				return this.mockCache.set(key, value, ttl);
			}
			if (!this.redis || !this.isRedisAvailable) {
return;
}

			const serialized = JSON.stringify(value);
			const expiry = ttl || this.defaultTTL || 3600;

			await this.redis.setex(key, expiry, serialized);
		} catch (error) {
			logger.error('Cache set error', { error, key });
		}
	}

	async delete(key: string): Promise<void> {
		try {
			if (this.mockCache) {
				return this.mockCache.delete(key);
			}
			if (!this.redis || !this.isRedisAvailable) {
return;
}
			await this.redis.del(key);
		} catch (error) {
			logger.error('Cache delete error', { error, key });
		}
	}

	async deletePattern(pattern: string): Promise<void> {
		try {
			if (this.mockCache) {
				const keys = await this.mockCache.keys(pattern);
				await Promise.all(keys.map((key) => this.mockCache!.delete(key)));
				return;
			}
			if (!this.redis || !this.isRedisAvailable) {
return;
}
			const keys = await this.redis.keys(pattern);
			if (keys.length > 0) {
				await this.redis.del(...keys);
			}
		} catch (error) {
			logger.error('Cache delete pattern error', { error, pattern });
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			if (this.mockCache) {
				const value = await this.mockCache.get(key);
				return value !== null;
			}
			if (!this.redis || !this.isRedisAvailable) {
return false;
}
			const result = await this.redis.exists(key);
			return result === 1;
		} catch (error) {
			logger.error('Cache exists error', { error, key });
			return false;
		}
	}

	async increment(key: string, amount = 1): Promise<number> {
		try {
			if (this.mockCache) {
				const current = (await this.mockCache.get<number>(key)) || 0;
				const newValue = current + amount;
				await this.mockCache.set(key, newValue);
				return newValue;
			}
			if (!this.redis || !this.isRedisAvailable) {
return 0;
}
			return await this.redis.incrby(key, amount);
		} catch (error) {
			logger.error('Cache increment error', { error, key });
			return 0;
		}
	}

	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (this.mockCache) {
				// Simple mock implementation for mget
				return Promise.all(keys.map((key) => this.mockCache!.get<T>(key)));
			}
			if (!this.redis || !this.isRedisAvailable) {
return keys.map(() => null);
}
			const values = await this.redis.mget(...keys);
			return values.map((value) => (value ? JSON.parse(value) : null));
		} catch (error) {
			logger.error('Cache mget error', { error, keys });
			return keys.map(() => null);
		}
	}

	async mset(
		items: { key: string; value: any; ttl?: number }[],
	): Promise<void> {
		try {
			if (this.mockCache) {
				await Promise.all(
					items.map((item) =>
						this.mockCache!.set(item.key, item.value, item.ttl),
					),
				);
				return;
			}
			if (!this.redis || !this.isRedisAvailable) {
return;
}
			const pipeline = this.redis.pipeline();

			items.forEach(({ key, value, ttl }) => {
				const serialized = JSON.stringify(value);
				const expiry = ttl || this.defaultTTL;
				pipeline.setex(key, expiry, serialized);
			});

			await pipeline.exec();
		} catch (error) {
			logger.error('Cache mset error', { error });
		}
	}

	async flush(): Promise<void> {
		try {
			if (this.mockCache) {
				await this.mockCache.flush();
				return;
			}
			if (!this.redis || !this.isRedisAvailable) {
return;
}
			await this.redis.flushdb();
			logger.info('Cache flushed');
		} catch (error) {
			logger.error('Cache flush error', { error });
		}
	}

	async close(): Promise<void> {
		if (this.redis && this.isRedisAvailable) {
			await this.redis.quit();
			logger.info('Redis connection closed');
		}
	}
}

export const cacheService = new CacheService();
