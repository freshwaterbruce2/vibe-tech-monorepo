import crypto from 'crypto';
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { bookings } from './bookings';
import { hotels } from './hotels';
import { users } from './users';

export const reviews = sqliteTable(
	'reviews',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		hotelId: text('hotel_id')
			.notNull()
			.references(() => hotels.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		bookingId: text('booking_id').references(() => bookings.id),

		// Reviewer info
		reviewerName: text('reviewer_name', { length: 100 }).notNull(),
		reviewerEmail: text('reviewer_email', { length: 255 }),
		isVerifiedBooking: integer('is_verified_booking', { mode: 'boolean' })
			.notNull()
			.default(false),

		// Ratings
		overallRating: real('overall_rating').notNull(),
		cleanliness: real('cleanliness'),
		location: real('location'),
		service: real('service'),
		value: real('value'),
		comfort: real('comfort'),
		facilities: real('facilities'),

		// Review content
		title: text('title', { length: 255 }),
		comment: text('comment').notNull(),
		pros: text('pros'),
		cons: text('cons'),

		// Trip details
		tripType: text('trip_type', { length: 50 }), // business, leisure, family, couples, solo
		stayDate: integer('stay_date', { mode: 'timestamp' }),
		roomType: text('room_type', { length: 100 }),

		// Media
		images: text('images', { mode: 'json' }).default([]),

		// Engagement
		helpfulCount: integer('helpful_count').notNull().default(0),
		notHelpfulCount: integer('not_helpful_count').notNull().default(0),
		responseFromHotel: text('response_from_hotel'),
		responseDate: integer('response_date', { mode: 'timestamp' }),

		// Moderation
		status: text('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
		moderatedBy: text('moderated_by').references(() => users.id),
		moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
		moderationNotes: text('moderation_notes'),

		// AI Analysis
		sentiment: text('sentiment', { length: 20 }), // positive, neutral, negative
		sentimentScore: real('sentiment_score'),
		keywords: text('keywords', { mode: 'json' }).default([]),

		// Metadata
		language: text('language', { length: 5 }).notNull().default('en'),
		ipAddress: text('ip_address', { length: 45 }),
		userAgent: text('user_agent'),

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
			hotelIdIdx: index('reviews_hotel_id_idx').on(table.hotelId),
			userIdIdx: index('reviews_user_id_idx').on(table.userId),
			bookingIdIdx: index('reviews_booking_id_idx').on(table.bookingId),
			statusIdx: index('reviews_status_idx').on(table.status),
			ratingIdx: index('reviews_rating_idx').on(table.overallRating),
			dateIdx: index('reviews_created_at_idx').on(table.createdAt),
		};
	},
);

export const reviewReports = sqliteTable(
	'review_reports',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		reviewId: text('review_id')
			.notNull()
			.references(() => reviews.id, { onDelete: 'cascade' }),
		reportedBy: text('reported_by').references(() => users.id),
		reason: text('reason', { length: 50 }).notNull(), // spam, inappropriate, fake, other
		description: text('description'),
		status: text('status', { length: 20 }).notNull().default('pending'), // pending, resolved, dismissed
		resolvedBy: text('resolved_by').references(() => users.id),
		resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
		resolutionNotes: text('resolution_notes'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => {
		return {
			reviewIdIdx: index('review_reports_review_id_idx').on(table.reviewId),
			statusIdx: index('review_reports_status_idx').on(table.status),
		};
	},
);

// Zod schemas
export const insertReviewSchema = createInsertSchema(reviews);
export const selectReviewSchema = createSelectSchema(reviews);
export const insertReviewReportSchema = createInsertSchema(reviewReports);
export const selectReviewReportSchema = createSelectSchema(reviewReports);

// Type exports
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewReport = typeof reviewReports.$inferSelect;
export type NewReviewReport = typeof reviewReports.$inferInsert;
