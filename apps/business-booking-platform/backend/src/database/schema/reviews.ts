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
import { bookings } from './bookings';
import { hotels } from './hotels';
import { users } from './users';

export const reviews = pgTable(
	'reviews',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		hotelId: uuid('hotel_id')
			.notNull()
			.references(() => hotels.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		bookingId: uuid('booking_id').references(() => bookings.id),

		// Reviewer info
		reviewerName: varchar('reviewer_name', { length: 100 }).notNull(),
		reviewerEmail: varchar('reviewer_email', { length: 255 }),
		isVerifiedBooking: boolean('is_verified_booking').notNull().default(false),

		// Ratings
		overallRating: real('overall_rating').notNull(),
		cleanliness: real('cleanliness'),
		location: real('location'),
		service: real('service'),
		value: real('value'),
		comfort: real('comfort'),
		facilities: real('facilities'),

		// Review content
		title: varchar('title', { length: 255 }),
		comment: text('comment').notNull(),
		pros: text('pros'),
		cons: text('cons'),

		// Trip details
		tripType: varchar('trip_type', { length: 50 }), // business, leisure, family, couples, solo
		stayDate: timestamp('stay_date'),
		roomType: varchar('room_type', { length: 100 }),

		// Media
		images: jsonb('images').default([]),

		// Engagement
		helpfulCount: integer('helpful_count').notNull().default(0),
		notHelpfulCount: integer('not_helpful_count').notNull().default(0),
		responseFromHotel: text('response_from_hotel'),
		responseDate: timestamp('response_date'),

		// Moderation
		status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
		moderatedBy: uuid('moderated_by').references(() => users.id),
		moderatedAt: timestamp('moderated_at'),
		moderationNotes: text('moderation_notes'),

		// AI Analysis
		sentiment: varchar('sentiment', { length: 20 }), // positive, neutral, negative
		sentimentScore: real('sentiment_score'),
		keywords: jsonb('keywords').default([]),

		// Metadata
		language: varchar('language', { length: 5 }).notNull().default('en'),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

export const reviewReports = pgTable(
	'review_reports',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		reviewId: uuid('review_id')
			.notNull()
			.references(() => reviews.id, { onDelete: 'cascade' }),
		reportedBy: uuid('reported_by').references(() => users.id),
		reason: varchar('reason', { length: 50 }).notNull(), // spam, inappropriate, fake, other
		description: text('description'),
		status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, resolved, dismissed
		resolvedBy: uuid('resolved_by').references(() => users.id),
		resolvedAt: timestamp('resolved_at'),
		resolutionNotes: text('resolution_notes'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
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
