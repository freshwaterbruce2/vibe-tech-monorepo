import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { bookings } from './bookings';
import { users } from './users';

export const payments = sqliteTable(
	'payments',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id),
		userId: text('user_id').references(() => users.id),

		// Payment details
		amount: real('amount').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),
		status: text('status', { length: 20 }).notNull().default('pending'),

		// Payment method
		method: text('method', { length: 20 }).notNull(), // card, paypal, bank_transfer
		provider: text('provider', { length: 50 }).notNull(), // stripe, paypal, etc.

		// Transaction info
		transactionId: text('transaction_id', { length: 255 }).unique(),
		referenceNumber: text('reference_number', { length: 255 }),

		// Card details (tokenized)
		cardLast4: text('card_last4', { length: 4 }),
		cardBrand: text('card_brand', { length: 20 }),
		cardExpMonth: text('card_exp_month', { length: 2 }),
		cardExpYear: text('card_exp_year', { length: 4 }),

		// 3D Secure
		threeDSecureStatus: text('three_d_secure_status', { length: 20 }),

		// Billing address
		billingAddress: text('billing_address', { mode: 'json' }).default({}),

		// Metadata
		metadata: text('metadata', { mode: 'json' }).default({}),
		errorCode: text('error_code', { length: 50 }),
		errorMessage: text('error_message'),

		// Timestamps
		processedAt: integer('processed_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
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

export const refunds = sqliteTable(
	'refunds',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		paymentId: text('payment_id')
			.notNull()
			.references(() => payments.id),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id),

		// Refund details
		amount: real('amount').notNull(),
		currency: text('currency', { length: 3 }).notNull().default('USD'),
		status: text('status', { length: 20 }).notNull().default('pending'),

		// Transaction info
		transactionId: text('transaction_id', { length: 255 }).unique(),
		reason: text('reason').notNull(),

		// Processing
		processedBy: text('processed_by').references(() => users.id),
		processedAt: integer('processed_at', { mode: 'timestamp' }),

		// Metadata
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
			paymentIdIdx: index('refunds_payment_id_idx').on(table.paymentId),
			bookingIdIdx: index('refunds_booking_id_idx').on(table.bookingId),
			statusIdx: index('refunds_status_idx').on(table.status),
		};
	},
);

export const paymentMethods = sqliteTable(
	'payment_methods',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Method details
		type: text('type', { length: 20 }).notNull(), // card, bank_account
		provider: text('provider', { length: 50 }).notNull(), // stripe, paypal

		// Tokenized data
		token: text('token').notNull(),
		last4: text('last4', { length: 4 }),
		brand: text('brand', { length: 20 }),
		expMonth: text('exp_month', { length: 2 }),
		expYear: text('exp_year', { length: 4 }),

		// Status
		isDefault: integer('is_default', { mode: 'boolean' })
			.notNull()
			.default(false),
		isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

		// Metadata
		nickname: text('nickname', { length: 100 }),
		billingAddress: text('billing_address', { mode: 'json' }).default({}),
		metadata: text('metadata', { mode: 'json' }).default({}),

		// Timestamps
		lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
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
