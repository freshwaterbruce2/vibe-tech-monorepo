import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { hotels, rooms } from './hotels';
import { users } from './users';

export const bookings = pgTable(
	'bookings',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		confirmationNumber: varchar('confirmation_number', { length: 20 })
			.notNull()
			.unique(),

		// User info
		userId: uuid('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		guestEmail: varchar('guest_email', { length: 255 }).notNull(),
		guestFirstName: varchar('guest_first_name', { length: 100 }).notNull(),
		guestLastName: varchar('guest_last_name', { length: 100 }).notNull(),
		guestPhone: varchar('guest_phone', { length: 20 }).notNull(),

		// Hotel and room
		hotelId: uuid('hotel_id')
			.notNull()
			.references(() => hotels.id),
		roomId: uuid('room_id')
			.notNull()
			.references(() => rooms.id),

		// Dates
		checkIn: timestamp('check_in').notNull(),
		checkOut: timestamp('check_out').notNull(),
		nights: integer('nights').notNull(),

		// Guests
		adults: integer('adults').notNull().default(1),
		children: integer('children').notNull().default(0),

		// Pricing
		roomRate: numeric('room_rate', { precision: 10, scale: 2 }).notNull(),
		taxes: numeric('taxes', { precision: 10, scale: 2 }).notNull(),
		fees: numeric('fees', { precision: 10, scale: 2 }).notNull(),
		totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),

		// Status
		status: varchar('status', { length: 20 }).notNull().default('pending'),
		paymentStatus: varchar('payment_status', { length: 20 })
			.notNull()
			.default('pending'),

		// Additional info
		specialRequests: text('special_requests'),
		guestPreferences: jsonb('guest_preferences').default({}),

		// Cancellation
		isCancellable: boolean('is_cancellable').notNull().default(true),
		cancellationDeadline: timestamp('cancellation_deadline'),
		cancellationPolicy: jsonb('cancellation_policy').default({}),
		cancelledAt: timestamp('cancelled_at'),
		cancellationReason: text('cancellation_reason'),

		// Metadata
		source: varchar('source', { length: 50 }).default('website'),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		metadata: jsonb('metadata').default({}),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// User and hotel indexes
			userIdIdx: index('bookings_user_id_idx').on(table.userId),
			hotelIdIdx: index('bookings_hotel_id_idx').on(table.hotelId),
			roomIdIdx: index('bookings_room_id_idx').on(table.roomId),

			// Status tracking
			statusIdx: index('bookings_status_idx').on(table.status),
			paymentStatusIdx: index('bookings_payment_status_idx').on(
				table.paymentStatus,
			),
			statusesIdx: index('bookings_statuses_idx').on(
				table.status,
				table.paymentStatus,
			),

			// Date-based queries
			checkInIdx: index('bookings_check_in_idx').on(table.checkIn),
			checkOutIdx: index('bookings_check_out_idx').on(table.checkOut),
			dateRangeIdx: index('bookings_date_range_idx').on(
				table.checkIn,
				table.checkOut,
			),

			// Guest information
			emailIdx: index('bookings_email_idx').on(table.guestEmail),
			guestNameIdx: index('bookings_guest_name_idx').on(
				table.guestFirstName,
				table.guestLastName,
			),

			// Confirmation and lookup
			confirmationIdx: index('bookings_confirmation_idx').on(
				table.confirmationNumber,
			),

			// Analytics and reporting
			createdAtIdx: index('bookings_created_at_idx').on(table.createdAt),
			hotelDateIdx: index('bookings_hotel_date_idx').on(
				table.hotelId,
				table.checkIn,
			),

			// Complex queries
			userActiveIdx: index('bookings_user_active_idx')
				.on(table.userId, table.status)
				.where(sql`${table.status} IN ('confirmed', 'checked_in')`),
			hotelRevenueIdx: index('bookings_hotel_revenue_idx').on(
				table.hotelId,
				table.totalAmount,
				table.createdAt,
			),

			// Unique constraints
			confirmationUnique: unique('bookings_confirmation_unique').on(
				table.confirmationNumber,
			),

			// Data validation constraints
			dateValidation: check(
				'bookings_date_validation',
				sql`${table.checkOut} > ${table.checkIn}`,
			),
			nightsValidation: check(
				'bookings_nights_validation',
				sql`${table.nights} > 0`,
			),
			guestsValidation: check(
				'bookings_guests_validation',
				sql`${table.adults} > 0 AND ${table.adults} + ${table.children} <= 10`,
			),
			amountValidation: check(
				'bookings_amount_validation',
				sql`${table.totalAmount} > 0`,
			),
		};
	},
);

export const bookingStatusHistory = pgTable(
	'booking_status_history',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		previousStatus: varchar('previous_status', { length: 20 }),
		newStatus: varchar('new_status', { length: 20 }).notNull(),
		reason: text('reason'),
		changedBy: uuid('changed_by').references(() => users.id),
		metadata: jsonb('metadata').default({}),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			bookingIdIdx: index('booking_status_history_booking_id_idx').on(
				table.bookingId,
			),
		};
	},
);

export const bookingGuests = pgTable(
	'booking_guests',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 20 }).notNull(), // adult, child
		firstName: varchar('first_name', { length: 100 }).notNull(),
		lastName: varchar('last_name', { length: 100 }).notNull(),
		age: integer('age'),
		specialNeeds: jsonb('special_needs').default({}),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			bookingIdIdx: index('booking_guests_booking_id_idx').on(table.bookingId),
		};
	},
);

export const bookingAddons = pgTable(
	'booking_addons',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 50 }).notNull(), // breakfast, parking, spa, etc.
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		quantity: integer('quantity').notNull().default(1),
		unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
		totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),
		metadata: jsonb('metadata').default({}),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			bookingIdIdx: index('booking_addons_booking_id_idx').on(table.bookingId),
		};
	},
);

// Zod schemas
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export const insertBookingStatusHistorySchema =
	createInsertSchema(bookingStatusHistory);
export const selectBookingStatusHistorySchema =
	createSelectSchema(bookingStatusHistory);
export const insertBookingGuestSchema = createInsertSchema(bookingGuests);
export const selectBookingGuestSchema = createSelectSchema(bookingGuests);
export const insertBookingAddonSchema = createInsertSchema(bookingAddons);
export const selectBookingAddonSchema = createSelectSchema(bookingAddons);

// Type exports
export type Booking = z.infer<typeof selectBookingSchema>;
export type NewBooking = z.infer<typeof insertBookingSchema>;
export type BookingStatusHistory = z.infer<
	typeof selectBookingStatusHistorySchema
>;
export type NewBookingStatusHistory = z.infer<
	typeof insertBookingStatusHistorySchema
>;
export type BookingGuest = z.infer<typeof selectBookingGuestSchema>;
export type NewBookingGuest = z.infer<typeof insertBookingGuestSchema>;
export type BookingAddon = z.infer<typeof selectBookingAddonSchema>;
export type NewBookingAddon = z.infer<typeof insertBookingAddonSchema>;
