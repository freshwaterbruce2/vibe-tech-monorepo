import { and, asc, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getDb } from './index';
import { hotelSearch, hotels, rooms, searchAnalytics } from './schema';

/**
 * Database Optimizer Service
 *
 * Provides optimized query patterns, caching strategies, and performance
 * monitoring for the hotel booking platform.
 */

export interface SearchFilters {
	city?: string;
	country?: string;
	checkIn?: Date;
	checkOut?: Date;
	adults?: number;
	children?: number;
	minPrice?: number;
	maxPrice?: number;
	starRating?: number;
	amenities?: string[];
	priceRange?: 'budget' | 'mid-range' | 'upscale' | 'luxury';
	sortBy?: 'price' | 'rating' | 'popularity' | 'distance';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

export interface HotelSearchResult {
	id: string;
	name: string;
	slug: string;
	description: string;
	city: string;
	country: string;
	rating: number;
	reviewCount: number;
	starRating: number;
	priceMin: number;
	priceMax: number;
	currency: string;
	amenities: string[];
	images: any[];
	isActive: boolean;
	isFeatured: boolean;
	distance?: number;
	relevanceScore?: number;
}

export interface SearchPerformanceMetrics {
	executionTimeMs: number;
	cacheHit: boolean;
	totalResults: number;
	queryComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Optimized Hotel Search
 * Uses composite indexes and full-text search for maximum performance
 */
export class HotelSearchOptimizer {
	private db = getDb();
	private cache = new Map<string, { data: any; expireAt: number }>();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	/**
	 * Optimized hotel search with full-text search and filtering
	 */
	async searchHotels(
		filters: SearchFilters,
		searchQuery?: string,
	): Promise<{
		hotels: HotelSearchResult[];
		metrics: SearchPerformanceMetrics;
	}> {
		const startTime = Date.now();
		const cacheKey = this.generateCacheKey(filters, searchQuery);

		// Check cache first
		const cached = this.getCachedResult(cacheKey);
		if (cached) {
			return {
				hotels: cached,
				metrics: {
					executionTimeMs: Date.now() - startTime,
					cacheHit: true,
					totalResults: cached.length,
					queryComplexity: 'simple',
				},
			};
		}

		let query = this.db
			.select({
				id: hotels.id,
				name: hotels.name,
				slug: hotels.slug,
				description: hotels.description,
				city: hotels.city,
				country: hotels.country,
				rating: hotels.rating,
				reviewCount: hotels.reviewCount,
				starRating: hotels.starRating,
				priceMin: hotels.priceMin,
				priceMax: hotels.priceMax,
				currency: hotels.currency,
				amenities: hotels.amenities,
				images: hotels.images,
				isActive: hotels.isActive,
				isFeatured: hotels.isFeatured,
				// Add search relevance score if full-text search is used
				relevanceScore: searchQuery
					? sql<number>`ts_rank_cd(to_tsvector('english', ${hotels.name} || ' ' || ${hotels.description} || ' ' || ${hotels.city}), plainto_tsquery('english', ${searchQuery}))`
					: sql<number>`0`,
			})
			.from(hotels)
			.where(eq(hotels.isActive, true));

		// Apply filters with optimized conditions
		const conditions = this.buildWhereConditions(filters);
		if (conditions.length > 0) {
			query = query.where(and(...conditions));
		}

		// Apply sorting with proper indexes
		query = this.applySorting(query, filters);

		// Apply pagination
		if (filters.limit) {
			query = query.limit(filters.limit);
		}
		if (filters.offset) {
			query = query.offset(filters.offset);
		}

		try {
			const results = await query;
			const executionTime = Date.now() - startTime;

			// Convert price strings to numbers for HotelSearchResult interface
			const formattedResults = results.map((hotel: any) => ({
				...hotel,
				priceMin: Number(hotel.priceMin),
				priceMax: Number(hotel.priceMax),
			}));

			// Cache results
			this.setCachedResult(cacheKey, formattedResults);

			// Log search analytics
			await this.logSearchAnalytics(
				filters,
				searchQuery,
				formattedResults.length,
				executionTime,
			);

			return {
				hotels: formattedResults as HotelSearchResult[],
				metrics: {
					executionTimeMs: executionTime,
					cacheHit: false,
					totalResults: results.length,
					queryComplexity: this.determineQueryComplexity(filters, searchQuery),
				},
			};
		} catch (error) {
			logger.error('Hotel search error:', error);
			throw new Error('Search failed');
		}
	}

	/**
	 * Advanced full-text search using PostgreSQL's text search capabilities
	 */
	async fullTextSearch(
		searchQuery: string,
		filters: SearchFilters = {},
	): Promise<{
		hotels: HotelSearchResult[];
		metrics: SearchPerformanceMetrics;
	}> {
		const startTime = Date.now();

		if (!searchQuery || searchQuery.trim().length < 2) {
			return this.searchHotels(filters);
		}

		const query = this.db
			.select({
				id: hotels.id,
				name: hotels.name,
				slug: hotels.slug,
				description: hotels.description,
				city: hotels.city,
				country: hotels.country,
				rating: hotels.rating,
				reviewCount: hotels.reviewCount,
				starRating: hotels.starRating,
				priceMin: hotels.priceMin,
				priceMax: hotels.priceMax,
				currency: hotels.currency,
				amenities: hotels.amenities,
				images: hotels.images,
				isActive: hotels.isActive,
				isFeatured: hotels.isFeatured,
				relevanceScore: sql<number>`
          ts_rank_cd(
            to_tsvector('english', ${hotels.name} || ' ' || ${hotels.description} || ' ' || ${hotels.city}),
            plainto_tsquery('english', ${searchQuery})
          ) * 100
        `,
			})
			.from(hotels)
			.innerJoin(hotelSearch, eq(hotels.id, hotelSearch.hotelId))
			.where(
				and(
					eq(hotels.isActive, true),
					sql`to_tsvector('english', ${hotels.name} || ' ' || ${hotels.description} || ' ' || ${hotels.city}) @@ plainto_tsquery('english', ${searchQuery})`,
					...this.buildWhereConditions(filters),
				),
			)
			.orderBy(
				desc(
					sql`ts_rank_cd(to_tsvector('english', ${hotels.name} || ' ' || ${hotels.description} || ' ' || ${hotels.city}), plainto_tsquery('english', ${searchQuery}))`,
				),
			)
			.limit(filters.limit || 20);

		try {
			const results = await query;
			const executionTime = Date.now() - startTime;

			// Convert price strings to numbers for HotelSearchResult interface
			const formattedResults = results.map((hotel: any) => ({
				...hotel,
				priceMin: Number(hotel.priceMin),
				priceMax: Number(hotel.priceMax),
			}));

			await this.logSearchAnalytics(
				filters,
				searchQuery,
				formattedResults.length,
				executionTime,
			);

			return {
				hotels: formattedResults as HotelSearchResult[],
				metrics: {
					executionTimeMs: executionTime,
					cacheHit: false,
					totalResults: results.length,
					queryComplexity: 'complex',
				},
			};
		} catch (error) {
			logger.error('Full-text search error:', error);
			throw error;
		}
	}

	/**
	 * Get hotel availability for date range (optimized query)
	 */
	async getHotelAvailability(
		hotelId: string,
		checkIn: Date,
		checkOut: Date,
		adults: number,
		children = 0,
	) {
		const startTime = Date.now();
		// TODO: Implement date range filtering with bookings check
		// checkIn and checkOut will be used when booking conflicts are checked

		const availableRooms = await this.db
			.select({
				roomId: rooms.id,
				roomName: rooms.name,
				roomType: rooms.type,
				maxOccupancy: rooms.maxOccupancy,
				basePrice: rooms.basePrice,
				amenities: rooms.amenities,
				images: rooms.images,
				totalQuantity: rooms.totalQuantity,
			})
			.from(rooms)
			.where(
				and(
					eq(rooms.hotelId, hotelId),
					eq(rooms.isActive, true),
					gte(rooms.maxOccupancy, adults + children),
				),
			);

		logger.info(
			`Hotel availability query executed in ${Date.now() - startTime}ms`,
		);
		return availableRooms;
	}

	/**
	 * Build optimized WHERE conditions
	 */
	private buildWhereConditions(filters: SearchFilters) {
		const conditions = [];

		if (filters.city) {
			conditions.push(ilike(hotels.city, `%${filters.city}%`));
		}

		if (filters.country) {
			conditions.push(eq(hotels.country, filters.country));
		}

		if (filters.minPrice !== undefined) {
			conditions.push(gte(hotels.priceMin, String(filters.minPrice)));
		}

		if (filters.maxPrice !== undefined) {
			conditions.push(lte(hotels.priceMax, String(filters.maxPrice)));
		}

		if (filters.starRating) {
			conditions.push(eq(hotels.starRating, filters.starRating));
		}

		if (filters.priceRange) {
			conditions.push(eq(hotels.priceRange, filters.priceRange));
		}

		if (filters.amenities && filters.amenities.length > 0) {
			// Use JSONB containment for amenities search
			conditions.push(
				sql`${hotels.amenities} ?| array[${filters.amenities.map((a) => `'${a}'`).join(',')}]`,
			);
		}

		return conditions;
	}

	/**
	 * Apply optimized sorting
	 */
	private applySorting(query: any, filters: SearchFilters) {
		const sortBy = filters.sortBy || 'relevance';
		const sortOrder = filters.sortOrder || 'desc';

		switch (sortBy) {
			case 'price':
				return sortOrder === 'asc'
					? query.orderBy(asc(hotels.priceMin))
					: query.orderBy(desc(hotels.priceMin));

			case 'rating':
				return sortOrder === 'asc'
					? query.orderBy(asc(hotels.rating))
					: query.orderBy(desc(hotels.rating));

			case 'popularity':
				return query.orderBy(desc(hotels.reviewCount));

			default:
				// Default: featured first, then by rating
				return query.orderBy(desc(hotels.isFeatured), desc(hotels.rating));
		}
	}

	/**
	 * Cache management
	 */
	private generateCacheKey(
		filters: SearchFilters,
		searchQuery?: string,
	): string {
		const filterStr = JSON.stringify(filters);
		const queryStr = searchQuery || '';
		return `search:${Buffer.from(filterStr + queryStr).toString('base64')}`;
	}

	private getCachedResult(key: string): any | null {
		const cached = this.cache.get(key);
		if (cached && cached.expireAt > Date.now()) {
			return cached.data;
		}
		this.cache.delete(key);
		return null;
	}

	private setCachedResult(key: string, data: any): void {
		this.cache.set(key, {
			data,
			expireAt: Date.now() + this.cacheTimeout,
		});
	}

	/**
	 * Determine query complexity for monitoring
	 */
	private determineQueryComplexity(
		filters: SearchFilters,
		searchQuery?: string,
	): 'simple' | 'moderate' | 'complex' {
		let complexity = 0;

		if (searchQuery) {
complexity += 2;
}
		if (filters.amenities?.length) {
complexity += 2;
}
		if (filters.checkIn && filters.checkOut) {
complexity += 3;
}
		if (filters.minPrice || filters.maxPrice) {
complexity += 1;
}

		if (complexity >= 5) {
return 'complex';
}
		if (complexity >= 3) {
return 'moderate';
}
		return 'simple';
	}

	/**
	 * Log search analytics for performance monitoring
	 */
	private async logSearchAnalytics(
		filters: SearchFilters,
		searchQuery: string | undefined,
		resultCount: number,
		executionTime: number,
	): Promise<void> {
		try {
			await this.db.insert(searchAnalytics).values({
				query: searchQuery || 'filtered_search',
				queryType: searchQuery ? 'natural_language' : 'filtered',
				normalizedQuery: searchQuery?.toLowerCase().trim() || null,
				filters: JSON.stringify(filters),
				totalResults: resultCount,
				executionTimeMs: executionTime,
				cacheHit: false,
				sessionId: null, // Would be set from request context
				userId: null, // Would be set from request context
			});
		} catch (error) {
			logger.error('Failed to log search analytics:', error);
		}
	}
}

/**
 * Database Performance Monitor
 * Tracks query performance and provides optimization recommendations
 */
export class DatabasePerformanceMonitor {
	private async getDatabase() {
		return await getDb();
	}

	/**
	 * Monitor slow queries and provide recommendations
	 */
	async getPerformanceReport(): Promise<{
		slowQueries: any[];
		indexRecommendations: string[];
		cacheHitRate: number;
		averageResponseTime: number;
	}> {
		const slowQueries = await this.getSlowQueries();
		const indexRecommendations = await this.getIndexRecommendations();
		const cacheStats = await this.getCacheStatistics();

		return {
			slowQueries,
			indexRecommendations,
			cacheHitRate: cacheStats.hitRate,
			averageResponseTime: cacheStats.avgResponseTime,
		};
	}

	/**
	 * Get slow queries from performance log
	 */
	private async getSlowQueries() {
		const db = await this.getDatabase();
		return db.execute(sql`
      SELECT 
        operation,
        AVG(response_time_ms) as avg_time,
        COUNT(*) as occurrences,
        MAX(response_time_ms) as max_time
      FROM performance_log
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
        AND response_time_ms > 1000
      GROUP BY operation
      ORDER BY avg_time DESC
      LIMIT 10
    `);
	}

	/**
	 * Generate index recommendations based on query patterns
	 */
	private async getIndexRecommendations(): Promise<string[]> {
		const recommendations = [];

		// Check for missing indexes on frequently searched columns
		const db = await this.getDatabase();
		const frequentSearches = await db.execute(sql`
      SELECT 
        filters,
        COUNT(*) as frequency
      FROM search_analytics
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY filters
      ORDER BY frequency DESC
      LIMIT 20
    `);

		// Analyze filter patterns and suggest indexes
		for (const search of frequentSearches.rows) {
			try {
				const filters = JSON.parse(search.filters as string);
				if (filters.city && filters.priceRange) {
					recommendations.push(
						'CREATE INDEX CONCURRENTLY hotels_city_price_range_idx ON hotels(city, price_range) WHERE is_active = true;',
					);
				}
				if (filters.amenities) {
					recommendations.push(
						'CREATE INDEX CONCURRENTLY hotels_amenities_gin_idx ON hotels USING gin(amenities);',
					);
				}
			} catch (error) {
				// Skip invalid JSON
			}
		}

		return [...new Set(recommendations)]; // Remove duplicates
	}

	/**
	 * Get cache statistics
	 */
	private async getCacheStatistics() {
		const db = await this.getDatabase();
		const stats = await db.execute(sql`
      SELECT 
        AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) * 100 as hit_rate,
        AVG(execution_time_ms) as avg_response_time
      FROM search_analytics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

		return {
			hitRate: Number(stats.rows[0]?.hit_rate || 0),
			avgResponseTime: Number(stats.rows[0]?.avg_response_time || 0),
		};
	}

	/**
	 * Optimize database maintenance tasks
	 */
	async runMaintenance(): Promise<void> {
		logger.info('Starting database maintenance...');

		try {
			const db = await this.getDatabase();
			// Refresh materialized views
			await db.execute(sql`SELECT refresh_stale_materialized_views('1 hour')`);
			logger.info('Materialized views refreshed');

			// Update table statistics
			await db.execute(sql`ANALYZE hotels, bookings, search_analytics`);
			logger.info('Table statistics updated');

			// Clean old audit logs (keep 1 year)
			await db.execute(sql`SELECT cleanup_audit_logs(365)`);
			logger.info('Old audit logs cleaned');

			// Refresh hotel search indexes
			await db.execute(sql`SELECT refresh_hotel_search_indexes()`);
			logger.info('Hotel search indexes refreshed');
		} catch (error) {
			logger.error('Database maintenance failed:', error);
			throw error;
		}
	}
}

// Export singleton instances
export const hotelSearchOptimizer = new HotelSearchOptimizer();
export const performanceMonitor = new DatabasePerformanceMonitor();
