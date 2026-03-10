import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	unique,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const hotels = sqliteTable(
	'hotels',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		externalId: text('external_id', { length: 100 }).unique(),
		name: text('name', { length: 255 }).notNull(),
		slug: text('slug', { length: 255 }).notNull().unique(),
		description: text('description').notNull(),
		shortDescription: text('short_description'),

		// Location
		address: text('address').notNull(),
		city: text('city', { length: 100 }).notNull(),
		state: text('state', { length: 100 }),
		country: text('country', { length: 2 }).notNull(),
		postalCode: text('postal_code', { length: 20 }),
		latitude: real('latitude').notNull(),
		longitude: real('longitude').notNull(),
		neighborhood: text('neighborhood', { length: 100 }),

		// Ratings and stats
		rating: real('rating').notNull().default(0),
		reviewCount: integer('review_count').notNull().default(0),
		starRating: integer('star_rating').notNull(),

		// Pricing
		priceMin: real('price_min').notNull(),
		priceMax: real('price_max').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),

		// Features - SQLite stores JSON as text
		amenities: text('amenities', { mode: 'json' }).notNull().default([]),
		images: text('images', { mode: 'json' }).notNull().default([]),
		policies: text('policies', { mode: 'json' }).notNull().default({}),
		nearbyAttractions: text('nearby_attractions', { mode: 'json' }).default([]),

		// Contact
		phone: text('phone', { length: 20 }),
		email: text('email', { length: 255 }),
		website: text('website'),

		// Meta
		checkInTime: text('check_in_time', { length: 10 })
			.notNull()
			.default('15:00'),
		checkOutTime: text('check_out_time', { length: 10 })
			.notNull()
			.default('11:00'),
		totalRooms: integer('total_rooms'),
		chainId: text('chain_id'),

		// Status
		isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
		isFeatured: integer('is_featured', { mode: 'boolean' })
			.notNull()
			.default(false),

		// AI and search
		passionScores: text('passion_scores', { mode: 'json' }).default({}),
		searchVector: text('search_vector'), // Full-text search vector
		sustainabilityScore: real('sustainability_score'),

		// Performance optimizations
		locationPoint: text('location_point'), // Spatial queries representation
		priceRange: text('price_range', { length: 20 }), // Indexed price category

		// Timestamps
		lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			// Basic search indexes
			cityIdx: index('hotels_city_idx').on(table.city),
			countryIdx: index('hotels_country_idx').on(table.country),
			cityCountryIdx: index('hotels_city_country_idx').on(
				table.city,
				table.country,
			),

			// Rating and pricing indexes
			ratingIdx: index('hotels_rating_idx').on(table.rating),
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

			// Unique constraints
			slugUnique: unique('hotels_slug_unique').on(table.slug),
			externalIdUnique: unique('hotels_external_id_unique').on(
				table.externalId,
			),
		};
	},
);

export const rooms = sqliteTable(
	'rooms',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		hotelId: text('hotel_id')
			.notNull()
			.references(() => hotels.id, { onDelete: 'cascade' }),
		externalId: text('external_id', { length: 100 }),
		name: text('name', { length: 255 }).notNull(),
		type: text('type', { length: 50 }).notNull(),
		description: text('description'),

		// Capacity
		maxOccupancy: integer('max_occupancy').notNull(),
		adults: integer('adults').notNull().default(2),
		children: integer('children').notNull().default(0),

		// Pricing
		basePrice: real('base_price').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),

		// Features
		size: integer('size'), // in square feet/meters
		bedConfiguration: text('bed_configuration', { mode: 'json' }).default([]),
		amenities: text('amenities', { mode: 'json' }).default([]),
		images: text('images', { mode: 'json' }).default([]),

		// Inventory
		totalQuantity: integer('total_quantity').notNull().default(1),

		// Status
		isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

		// Timestamps
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			hotelIdIdx: index('rooms_hotel_id_idx').on(table.hotelId),
			typeIdx: index('rooms_type_idx').on(table.type),
			priceIdx: index('rooms_price_idx').on(table.basePrice),
		};
	},
);

export const roomAvailability = sqliteTable(
	'room_availability',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		roomId: text('room_id')
			.notNull()
			.references(() => rooms.id, { onDelete: 'cascade' }),
		date: integer('date', { mode: 'timestamp' }).notNull(),
		available: integer('available').notNull().default(0),
		booked: integer('booked').notNull().default(0),
		price: real('price').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),
		restrictions: text('restrictions', { mode: 'json' }).default({
			minStay: 1,
			maxStay: null,
			closedToArrival: false,
			closedToDeparture: false,
		}),
		lastUpdated: integer('last_updated', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
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
