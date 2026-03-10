import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export async function initializeCache(): Promise<void> {
	try {
		// Test cache connection
		await cacheService.set('test:connection', { connected: true }, 10);
		const test = await cacheService.get('test:connection');

		if (!test) {
			throw new Error('Cache connection test failed');
		}

		await cacheService.delete('test:connection');
		logger.info('Cache initialized successfully');
	} catch (error) {
		logger.warn('Cache initialization failed - running without cache:', error);
		// Continue without cache - it's optional for local development
	}
}

export { cacheService };
