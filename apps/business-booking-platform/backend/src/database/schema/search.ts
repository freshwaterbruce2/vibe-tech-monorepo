import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { hotels } from './hotels';

/**
 * Full-Text Search Optimization for Hotels
 *
 * This table provides optimized full-text search capabilities with pre-computed
 * search vectors and relevance scoring for hotel discovery.
 */
export const hotelSearch = pgTable(
	'hotel_search',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		hotelId: uuid('hotel_id')
			.notNull()
			.references(() => hotels.id, { onDelete: 'cascade' })
			.unique(),

		// Full-text search vectors
		nameVector: text('name_vector'), // Hotel name search vector
		descriptionVector: text('description_vector'), // Description search vector
		locationVector: text('location_vector'), // City, neighborhood, attractions
		amenitiesVector: text('amenities_vector'), // Amenities and features
		combinedVector: text('combined_vector'), // All searchable text combined

		// Search boost scores (for relevance ranking)
		popularityScore: real('popularity_score').default(0), // Based on bookings/reviews
		qualityScore: real('quality_score').default(0), // Based on rating and amenities
		locationScore: real('location_score').default(0), // Based on attractions/transit

		// Search metadata
		searchableText: text('searchable_text'), // Denormalized searchable content
		keywordTags: jsonb('keyword_tags').default([]), // Extracted keywords for fast matching

		// Timestamps
		lastIndexed: timestamp('last_indexed').notNull().defaultNow(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			hotelIdIdx: index('hotel_search_hotel_id_idx').on(table.hotelId),

			// Full-text search indexes (GIN for performance)
			nameVectorIdx: index('hotel_search_name_vector_idx').using(
				'gin',
				sql`to_tsvector('english', ${table.nameVector})`,
			),
			descriptionVectorIdx: index('hotel_search_description_vector_idx').using(
				'gin',
				sql`to_tsvector('english', ${table.descriptionVector})`,
			),
			locationVectorIdx: index('hotel_search_location_vector_idx').using(
				'gin',
				sql`to_tsvector('english', ${table.locationVector})`,
			),
			amenitiesVectorIdx: index('hotel_search_amenities_vector_idx').using(
				'gin',
				sql`to_tsvector('english', ${table.amenitiesVector})`,
			),
			combinedVectorIdx: index('hotel_search_combined_vector_idx').using(
				'gin',
				sql`to_tsvector('english', ${table.combinedVector})`,
			),

			// Relevance scoring indexes
			popularityIdx: index('hotel_search_popularity_idx').on(
				table.popularityScore,
			),
			qualityIdx: index('hotel_search_quality_idx').on(table.qualityScore),
			locationIdx: index('hotel_search_location_score_idx').on(
				table.locationScore,
			),

			// Combined scoring for ranking
			scoringIdx: index('hotel_search_scoring_idx').on(
				table.popularityScore,
				table.qualityScore,
				table.locationScore,
			),

			// Keyword tags (GIN for JSONB operations)
			keywordTagsIdx: index('hotel_search_keyword_tags_idx').using(
				'gin',
				table.keywordTags,
			),
		};
	},
);

/**
 * Search analytics and optimization
 * Tracks search queries and results for continuous improvement
 */
export const searchAnalytics = pgTable(
	'search_analytics',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Search query info
		query: text('query').notNull(),
		queryType: varchar('query_type', { length: 20 }).notNull(), // natural_language, filtered, map_based
		normalizedQuery: text('normalized_query'), // Processed/cleaned query

		// Search parameters
		filters: jsonb('filters').default({}), // Applied filters (price, location, etc.)
		sortBy: varchar('sort_by', { length: 50 }), // Sorting preference

		// Results metrics
		totalResults: integer('total_results').notNull().default(0),
		clickedResults: integer('clicked_results').notNull().default(0),
		bookedResults: integer('booked_results').notNull().default(0),

		// Performance metrics
		executionTimeMs: integer('execution_time_ms'),
		cacheHit: boolean('cache_hit').notNull().default(false),

		// User context
		sessionId: varchar('session_id', { length: 255 }),
		userId: uuid('user_id'),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),

		// Geographic context
		userLocation: jsonb('user_location').default({}), // lat/lng if available
		searchLocation: jsonb('search_location').default({}), // target search area

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// Query analysis
			queryIdx: index('search_analytics_query_idx').on(table.query),
			queryTypeIdx: index('search_analytics_query_type_idx').on(
				table.queryType,
			),
			normalizedQueryIdx: index('search_analytics_normalized_query_idx').on(
				table.normalizedQuery,
			),

			// Performance tracking
			executionTimeIdx: index('search_analytics_execution_time_idx').on(
				table.executionTimeMs,
			),
			cacheHitIdx: index('search_analytics_cache_hit_idx').on(table.cacheHit),

			// User behavior
			sessionIdx: index('search_analytics_session_idx').on(table.sessionId),
			userIdx: index('search_analytics_user_idx').on(table.userId),

			// Time-based analysis
			createdAtIdx: index('search_analytics_created_at_idx').on(
				table.createdAt,
			),
			dailyIdx: index('search_analytics_daily_idx').on(
				sql`date_trunc('day', ${table.createdAt})`,
			),
		};
	},
);

// Zod schemas
export const insertHotelSearchSchema = createInsertSchema(hotelSearch);
export const selectHotelSearchSchema = createSelectSchema(hotelSearch);
export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics);
export const selectSearchAnalyticsSchema = createSelectSchema(searchAnalytics);

// Type exports
export type HotelSearch = z.infer<typeof selectHotelSearchSchema>;
export type NewHotelSearch = z.infer<typeof insertHotelSearchSchema>;
export type SearchAnalytics = z.infer<typeof selectSearchAnalyticsSchema>;
export type NewSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
