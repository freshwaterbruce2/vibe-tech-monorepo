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
import { hotels, rooms } from './hotels';
import { users } from './users';

export const bookings = sqliteTable(
	'bookings',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		confirmationNumber: text('confirmation_number', { length: 20 })
			.notNull()
			.unique(),

		// User info
		userId: text('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		guestEmail: text('guest_email', { length: 255 }).notNull(),
		guestFirstName: text('guest_first_name', { length: 100 }).notNull(),
		guestLastName: text('guest_last_name', { length: 100 }).notNull(),
		guestPhone: text('guest_phone', { length: 20 }).notNull(),

		// Hotel and room
		hotelId: text('hotel_id')
			.notNull()
			.references(() => hotels.id),
		roomId: text('room_id')
			.notNull()
			.references(() => rooms.id),

		// Dates
		checkIn: integer('check_in', { mode: 'timestamp' }).notNull(),
		checkOut: integer('check_out', { mode: 'timestamp' }).notNull(),
		nights: integer('nights').notNull(),

		// Guests
		adults: integer('adults').notNull().default(1),
		children: integer('children').notNull().default(0),

		// Pricing
		roomRate: real('room_rate').notNull(),
		taxes: real('taxes').notNull(),
		fees: real('fees').notNull(),
		totalAmount: real('total_amount').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),

		// Status
		status: text('status', { length: 20 }).notNull().default('pending'),
		paymentStatus: text('payment_status', { length: 20 })
			.notNull()
			.default('pending'),

		// Additional info
		specialRequests: text('special_requests'),
		guestPreferences: text('guest_preferences', { mode: 'json' }).default({}),

		// Cancellation
		isCancellable: integer('is_cancellable', { mode: 'boolean' })
			.notNull()
			.default(true),
		cancellationDeadline: integer('cancellation_deadline', {
			mode: 'timestamp',
		}),
		cancellationPolicy: text('cancellation_policy', { mode: 'json' }).default(
			{},
		),
		cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
		cancellationReason: text('cancellation_reason'),

		// Metadata
		source: text('source', { length: 50 }).default('website'),
		ipAddress: text('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		metadata: text('metadata', { mode: 'json' }).default({}),

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

			// Unique constraints
			confirmationUnique: unique('bookings_confirmation_unique').on(
				table.confirmationNumber,
			),
		};
	},
);

export const bookingStatusHistory = sqliteTable(
	'booking_status_history',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		previousStatus: text('previous_status', { length: 20 }),
		newStatus: text('new_status', { length: 20 }).notNull(),
		reason: text('reason'),
		changedBy: text('changed_by').references(() => users.id),
		metadata: text('metadata', { mode: 'json' }).default({}),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			bookingIdIdx: index('booking_status_history_booking_id_idx').on(
				table.bookingId,
			),
		};
	},
);

export const bookingGuests = sqliteTable(
	'booking_guests',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		type: text('type', { length: 20 }).notNull(), // adult, child
		firstName: text('first_name', { length: 100 }).notNull(),
		lastName: text('last_name', { length: 100 }).notNull(),
		age: integer('age'),
		specialNeeds: text('special_needs', { mode: 'json' }).default({}),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			bookingIdIdx: index('booking_guests_booking_id_idx').on(table.bookingId),
		};
	},
);

export const bookingAddons = sqliteTable(
	'booking_addons',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		type: text('type', { length: 50 }).notNull(), // breakfast, parking, spa, etc.
		name: text('name', { length: 255 }).notNull(),
		description: text('description'),
		quantity: integer('quantity').notNull().default(1),
		unitPrice: real('unit_price').notNull(),
		totalPrice: real('total_price').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),
		metadata: text('metadata', { mode: 'json' }).default({}),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
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
