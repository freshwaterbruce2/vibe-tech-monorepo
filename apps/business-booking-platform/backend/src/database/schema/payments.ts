import {
	boolean,
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
import { users } from './users';

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id),
		userId: uuid('user_id').references(() => users.id),

		// Payment details
		amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),
		status: varchar('status', { length: 20 }).notNull().default('pending'),

		// Payment method
		method: varchar('method', { length: 20 }).notNull(), // card, paypal, bank_transfer
		provider: varchar('provider', { length: 50 }).notNull(), // stripe, paypal, etc.

		// Transaction info
		transactionId: varchar('transaction_id', { length: 255 }).unique(),
		referenceNumber: varchar('reference_number', { length: 255 }),

		// Card details (tokenized)
		cardLast4: varchar('card_last4', { length: 4 }),
		cardBrand: varchar('card_brand', { length: 20 }),
		cardExpMonth: varchar('card_exp_month', { length: 2 }),
		cardExpYear: varchar('card_exp_year', { length: 4 }),

		// 3D Secure
		threeDSecureStatus: varchar('three_d_secure_status', { length: 20 }),

		// Billing address
		billingAddress: jsonb('billing_address').default({}),

		// Metadata
		metadata: jsonb('metadata').default({}),
		errorCode: varchar('error_code', { length: 50 }),
		errorMessage: text('error_message'),

		// Timestamps
		processedAt: timestamp('processed_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			bookingIdIdx: index('payments_booking_id_idx').on(table.bookingId),
			userIdIdx: index('payments_user_id_idx').on(table.userId),
			statusIdx: index('payments_status_idx').on(table.status),
			transactionIdIdx: index('payments_transaction_id_idx').on(
				table.transactionId,
			),
		};
	},
);

export const refunds = pgTable(
	'refunds',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		paymentId: uuid('payment_id')
			.notNull()
			.references(() => payments.id),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id),

		// Refund details
		amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('USD'),
		status: varchar('status', { length: 20 }).notNull().default('pending'),

		// Transaction info
		transactionId: varchar('transaction_id', { length: 255 }).unique(),
		reason: text('reason').notNull(),

		// Processing
		processedBy: uuid('processed_by').references(() => users.id),
		processedAt: timestamp('processed_at'),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			paymentIdIdx: index('refunds_payment_id_idx').on(table.paymentId),
			bookingIdIdx: index('refunds_booking_id_idx').on(table.bookingId),
			statusIdx: index('refunds_status_idx').on(table.status),
		};
	},
);

export const paymentMethods = pgTable(
	'payment_methods',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Method details
		type: varchar('type', { length: 20 }).notNull(), // card, bank_account
		provider: varchar('provider', { length: 50 }).notNull(), // stripe, paypal

		// Tokenized data
		token: text('token').notNull(),
		last4: varchar('last4', { length: 4 }),
		brand: varchar('brand', { length: 20 }),
		expMonth: varchar('exp_month', { length: 2 }),
		expYear: varchar('exp_year', { length: 4 }),

		// Status
		isDefault: boolean('is_default').notNull().default(false),
		isActive: boolean('is_active').notNull().default(true),

		// Metadata
		nickname: varchar('nickname', { length: 100 }),
		billingAddress: jsonb('billing_address').default({}),
		metadata: jsonb('metadata').default({}),

		// Timestamps
		lastUsedAt: timestamp('last_used_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			userIdIdx: index('payment_methods_user_id_idx').on(table.userId),
			typeIdx: index('payment_methods_type_idx').on(table.type),
		};
	},
);

// Zod schemas
export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);
export const insertRefundSchema = createInsertSchema(refunds);
export const selectRefundSchema = createSelectSchema(refunds);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const selectPaymentMethodSchema = createSelectSchema(paymentMethods);

// Type exports
export type Payment = z.infer<typeof selectPaymentSchema>;
export type NewPayment = z.infer<typeof insertPaymentSchema>;
export type Refund = z.infer<typeof selectRefundSchema>;
export type NewRefund = z.infer<typeof insertRefundSchema>;
export type PaymentMethod = z.infer<typeof selectPaymentMethodSchema>;
export type NewPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
