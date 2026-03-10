import {
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { bookings } from './bookings';
import { payments } from './payments';
import { users } from './users';

export const commissions = pgTable(
	'commissions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id),
		paymentId: uuid('payment_id')
			.notNull()
			.references(() => payments.id),

		// Commission details
		baseAmount: numeric('base_amount', { precision: 10, scale: 2 }).notNull(), // Original booking amount
		commissionRate: numeric('commission_rate', { precision: 5, scale: 4 })
			.notNull()
			.default('0.0500'), // 5% default
		commissionAmount: numeric('commission_amount', {
			precision: 10,
			scale: 2,
		}).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),

		// Status tracking
		status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, earned, paid, reversed

		// Platform details
		platformFee: numeric('platform_fee', { precision: 10, scale: 2 }).notNull(),
		hotelEarnings: numeric('hotel_earnings', {
			precision: 10,
			scale: 2,
		}).notNull(),

		// Payout tracking
		payoutId: varchar('payout_id', { length: 255 }), // Stripe payout ID when paid
		payoutDate: timestamp('payout_date'),
		payoutAmount: numeric('payout_amount', { precision: 10, scale: 2 }),

		// Tax information
		taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0.0000'),
		taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default(
			'0.00',
		),

		// Processing
		processedBy: uuid('processed_by').references(() => users.id),
		processedAt: timestamp('processed_at'),

		// Metadata
		metadata: jsonb('metadata').default({}),
		notes: text('notes'),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			bookingIdIdx: index('commissions_booking_id_idx').on(table.bookingId),
			paymentIdIdx: index('commissions_payment_id_idx').on(table.paymentId),
			statusIdx: index('commissions_status_idx').on(table.status),
			payoutDateIdx: index('commissions_payout_date_idx').on(table.payoutDate),
			createdAtIdx: index('commissions_created_at_idx').on(table.createdAt),
		};
	},
);

export const revenueReports = pgTable(
	'revenue_reports',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Report details
		reportType: varchar('report_type', { length: 20 }).notNull(), // daily, weekly, monthly, yearly
		reportDate: timestamp('report_date').notNull(),
		startDate: timestamp('start_date').notNull(),
		endDate: timestamp('end_date').notNull(),

		// Revenue metrics
		totalBookings: numeric('total_bookings', { precision: 10, scale: 0 })
			.notNull()
			.default('0'),
		totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 })
			.notNull()
			.default('0.00'),
		totalCommissions: numeric('total_commissions', { precision: 12, scale: 2 })
			.notNull()
			.default('0.00'),
		totalRefunds: numeric('total_refunds', { precision: 12, scale: 2 })
			.notNull()
			.default('0.00'),
		netRevenue: numeric('net_revenue', { precision: 12, scale: 2 })
			.notNull()
			.default('0.00'),

		// Booking metrics
		successfulBookings: numeric('successful_bookings', {
			precision: 10,
			scale: 0,
		})
			.notNull()
			.default('0'),
		cancelledBookings: numeric('cancelled_bookings', {
			precision: 10,
			scale: 0,
		})
			.notNull()
			.default('0'),
		refundedBookings: numeric('refunded_bookings', { precision: 10, scale: 0 })
			.notNull()
			.default('0'),
		averageOrderValue: numeric('average_order_value', {
			precision: 10,
			scale: 2,
		})
			.notNull()
			.default('0.00'),

		// Payment metrics
		totalPayments: numeric('total_payments', { precision: 10, scale: 0 })
			.notNull()
			.default('0'),
		successfulPayments: numeric('successful_payments', {
			precision: 10,
			scale: 0,
		})
			.notNull()
			.default('0'),
		failedPayments: numeric('failed_payments', { precision: 10, scale: 0 })
			.notNull()
			.default('0'),
		paymentSuccessRate: numeric('payment_success_rate', {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default('0.00'),

		// Currency breakdown
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),
		currencyBreakdown: jsonb('currency_breakdown').default({}),

		// Additional metrics
		topPaymentMethods: jsonb('top_payment_methods').default([]),
		topCountries: jsonb('top_countries').default([]),
		topCities: jsonb('top_cities').default([]),

		// Processing
		generatedBy: uuid('generated_by').references(() => users.id),
		generatedAt: timestamp('generated_at').notNull().defaultNow(),

		// Status
		status: varchar('status', { length: 20 }).notNull().default('completed'),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			reportTypeIdx: index('revenue_reports_report_type_idx').on(
				table.reportType,
			),
			reportDateIdx: index('revenue_reports_report_date_idx').on(
				table.reportDate,
			),
			currencyIdx: index('revenue_reports_currency_idx').on(table.currency),
			statusIdx: index('revenue_reports_status_idx').on(table.status),
		};
	},
);

export const payoutBatches = pgTable(
	'payout_batches',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Payout details
		batchId: varchar('batch_id', { length: 255 }).notNull().unique(),
		stripePayoutId: varchar('stripe_payout_id', { length: 255 }),

		// Amounts
		totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
		commissionCount: numeric('commission_count', {
			precision: 10,
			scale: 0,
		}).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),

		// Status
		status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed

		// Processing
		processedBy: uuid('processed_by').references(() => users.id),
		processedAt: timestamp('processed_at'),

		// Stripe details
		stripeStatus: varchar('stripe_status', { length: 50 }),
		stripeCreated: timestamp('stripe_created'),
		stripeArrivalDate: timestamp('stripe_arrival_date'),

		// Metadata
		metadata: jsonb('metadata').default({}),
		notes: text('notes'),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			batchIdIdx: index('payout_batches_batch_id_idx').on(table.batchId),
			statusIdx: index('payout_batches_status_idx').on(table.status),
			processedAtIdx: index('payout_batches_processed_at_idx').on(
				table.processedAt,
			),
		};
	},
);

// Zod schemas
export const insertCommissionSchema = createInsertSchema(commissions);
export const selectCommissionSchema = createSelectSchema(commissions);
export const insertRevenueReportSchema = createInsertSchema(revenueReports);
export const selectRevenueReportSchema = createSelectSchema(revenueReports);
export const insertPayoutBatchSchema = createInsertSchema(payoutBatches);
export const selectPayoutBatchSchema = createSelectSchema(payoutBatches);

// Type exports
export type Commission = z.infer<typeof selectCommissionSchema>;
export type NewCommission = z.infer<typeof insertCommissionSchema>;
export type RevenueReport = z.infer<typeof selectRevenueReportSchema>;
export type NewRevenueReport = z.infer<typeof insertRevenueReportSchema>;
export type PayoutBatch = z.infer<typeof selectPayoutBatchSchema>;
export type NewPayoutBatch = z.infer<typeof insertPayoutBatchSchema>;
