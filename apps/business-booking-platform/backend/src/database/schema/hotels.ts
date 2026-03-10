import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const hotels = pgTable(
	'hotels',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		externalId: varchar('external_id', { length: 100 }).unique(),
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 255 }).notNull().unique(),
		description: text('description').notNull(),
		shortDescription: text('short_description'),

		// Location
		address: text('address').notNull(),
		city: varchar('city', { length: 100 }).notNull(),
		state: varchar('state', { length: 100 }),
		country: varchar('country', { length: 2 }).notNull(),
		postalCode: varchar('postal_code', { length: 20 }),
		latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
		longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
		neighborhood: varchar('neighborhood', { length: 100 }),

		// Ratings and stats
		rating: real('rating').notNull().default(0),
		reviewCount: integer('review_count').notNull().default(0),
		starRating: integer('star_rating').notNull(),

		// Pricing
		priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
		priceMax: numeric('price_max', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),

		// Features
		amenities: jsonb('amenities').notNull().default([]),
		images: jsonb('images').notNull().default([]),
		policies: jsonb('policies').notNull().default({}),
		nearbyAttractions: jsonb('nearby_attractions').default([]),

		// Contact
		phone: varchar('phone', { length: 20 }),
		email: varchar('email', { length: 255 }),
		website: text('website'),

		// Meta
		checkInTime: varchar('check_in_time', { length: 10 })
			.notNull()
			.default('15:00'),
		checkOutTime: varchar('check_out_time', { length: 10 })
			.notNull()
			.default('11:00'),
		totalRooms: integer('total_rooms'),
		chainId: uuid('chain_id'),

		// Status
		isActive: boolean('is_active').notNull().default(true),
		isFeatured: boolean('is_featured').notNull().default(false),

		// AI and search
		passionScores: jsonb('passion_scores').default({}),
		searchVector: text('search_vector'), // Full-text search vector
		sustainabilityScore: real('sustainability_score'),

		// Performance optimizations
		locationPoint: text('location_point'), // PostGIS point for spatial queries
		priceRange: varchar('price_range', { length: 20 }), // Indexed price category

		// Timestamps
		lastSyncedAt: timestamp('last_synced_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// Basic search indexes
			cityIdx: index('hotels_city_idx').on(table.city),
			countryIdx: index('hotels_country_idx').on(table.country),
			cityCountryIdx: index('hotels_city_country_idx').on(
				table.city,
				table.country,
			), // Composite for location searches

			// Rating and pricing indexes
			ratingIdx: index('hotels_rating_idx').on(table.rating),
			priceIdx: index('hotels_price_idx').on(table.priceMin, table.priceMax),
			priceRangeIdx: index('hotels_price_range_idx').on(table.priceRange),

			// Status and feature indexes
			activeIdx: index('hotels_active_idx').on(table.isActive),
			featuredIdx: index('hotels_featured_idx').on(table.isFeatured),
			activeFeaturedIdx: index('hotels_active_featured_idx').on(
				table.isActive,
				table.isFeatured,
			),

			// Location indexes
			locationIdx: index('hotels_location_idx').on(
				table.latitude,
				table.longitude,
			),
			neighborhoodIdx: index('hotels_neighborhood_idx').on(table.neighborhood),

			// Complex search indexes
			searchIdx: index('hotels_search_idx').on(
				table.city,
				table.isActive,
				table.rating,
			),
			priceSearchIdx: index('hotels_price_search_idx').on(
				table.city,
				table.priceMin,
				table.priceMax,
				table.isActive,
			),

			// Full-text search index
			searchVectorIdx: index('hotels_search_vector_idx').using(
				'gin',
				sql`to_tsvector('english', coalesce(${table.name}, '') || ' ' || coalesce(${table.description}, '') || ' ' || coalesce(${table.city}, ''))`,
			),

			// Unique constraints
			slugUnique: unique('hotels_slug_unique').on(table.slug),
			externalIdUnique: unique('hotels_external_id_unique').on(
				table.externalId,
			),

			// Data validation constraints
			ratingCheck: check(
				'hotels_rating_check',
				sql`${table.rating} >= 0 AND ${table.rating} <= 5`,
			),
			starRatingCheck: check(
				'hotels_star_rating_check',
				sql`${table.starRating} >= 1 AND ${table.starRating} <= 5`,
			),
			priceCheck: check(
				'hotels_price_check',
				sql`${table.priceMin} >= 0 AND ${table.priceMax} >= ${table.priceMin}`,
			),
			coordinatesCheck: check(
				'hotels_coordinates_check',
				sql`${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180`,
			),
		};
	},
);

export const rooms = pgTable(
	'rooms',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		hotelId: uuid('hotel_id')
			.notNull()
			.references(() => hotels.id, { onDelete: 'cascade' }),
		externalId: varchar('external_id', { length: 100 }),
		name: varchar('name', { length: 255 }).notNull(),
		type: varchar('type', { length: 50 }).notNull(),
		description: text('description'),

		// Capacity
		maxOccupancy: integer('max_occupancy').notNull(),
		adults: integer('adults').notNull().default(2),
		children: integer('children').notNull().default(0),

		// Pricing
		basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),

		// Features
		size: integer('size'), // in square feet/meters
		bedConfiguration: jsonb('bed_configuration').default([]),
		amenities: jsonb('amenities').default([]),
		images: jsonb('images').default([]),

		// Inventory
		totalQuantity: integer('total_quantity').notNull().default(1),

		// Status
		isActive: boolean('is_active').notNull().default(true),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			hotelIdIdx: index('rooms_hotel_id_idx').on(table.hotelId),
			typeIdx: index('rooms_type_idx').on(table.type),
			priceIdx: index('rooms_price_idx').on(table.basePrice),
		};
	},
);

export const roomAvailability = pgTable(
	'room_availability',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		roomId: uuid('room_id')
			.notNull()
			.references(() => rooms.id, { onDelete: 'cascade' }),
		date: timestamp('date').notNull(),
		available: integer('available').notNull().default(0),
		booked: integer('booked').notNull().default(0),
		price: numeric('price', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),
		restrictions: jsonb('restrictions').default({
			minStay: 1,
			maxStay: null,
			closedToArrival: false,
			closedToDeparture: false,
		}),
		lastUpdated: timestamp('last_updated').notNull().defaultNow(),
	},
	(table) => {
		return {
			roomDateIdx: index('room_availability_room_date_idx').on(
				table.roomId,
				table.date,
			),
			dateIdx: index('room_availability_date_idx').on(table.date),
		};
	},
);

// Zod schemas
export const insertHotelSchema = createInsertSchema(hotels);
export const selectHotelSchema = createSelectSchema(hotels);
export const insertRoomSchema = createInsertSchema(rooms);
export const selectRoomSchema = createSelectSchema(rooms);
export const insertRoomAvailabilitySchema =
	createInsertSchema(roomAvailability);
export const selectRoomAvailabilitySchema =
	createSelectSchema(roomAvailability);

// Type exports
export type Hotel = z.infer<typeof selectHotelSchema>;
export type NewHotel = z.infer<typeof insertHotelSchema>;
export type Room = z.infer<typeof selectRoomSchema>;
export type NewRoom = z.infer<typeof insertRoomSchema>;
export type RoomAvailability = z.infer<typeof selectRoomAvailabilitySchema>;
export type NewRoomAvailability = z.infer<typeof insertRoomAvailabilitySchema>;
