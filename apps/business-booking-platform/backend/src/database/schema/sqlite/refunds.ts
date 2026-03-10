import { relations } from 'drizzle-orm';
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { bookings } from './bookings.js';
import { payments } from './payments.js';
import { users } from './users.js';

export const refundRequests = sqliteTable(
	'refund_requests',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id),
		paymentId: text('payment_id')
			.notNull()
			.references(() => payments.id),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => users.id),
		amount: real('amount').notNull(),
		reason: text('reason').notNull(),
		status: text('status', {
			enum: ['pending', 'approved', 'rejected', 'processed', 'failed'],
		})
			.notNull()
			.default('pending'),
		adminNotes: text('admin_notes'),
		squareRefundId: text('square_refund_id'),
		processedBy: text('processed_by').references(() => users.id),
		createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
			() => new Date(),
		),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
			() => new Date(),
		),
		processedAt: integer('processed_at', { mode: 'timestamp' }),
	},
	(table) => ({
		bookingIdIndex: index('refund_requests_booking_id_idx').on(table.bookingId),
		paymentIdIndex: index('refund_requests_payment_id_idx').on(table.paymentId),
		statusIndex: index('refund_requests_status_idx').on(table.status),
		createdAtIndex: index('refund_requests_created_at_idx').on(table.createdAt),
	}),
);

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
	booking: one(bookings, {
		fields: [refundRequests.bookingId],
		references: [bookings.id],
	}),
	payment: one(payments, {
		fields: [refundRequests.paymentId],
		references: [payments.id],
	}),
	requester: one(users, {
		fields: [refundRequests.requestedBy],
		references: [users.id],
	}),
	processor: one(users, {
		fields: [refundRequests.processedBy],
		references: [users.id],
	}),
}));

export const insertRefundRequestSchema = createInsertSchema(refundRequests);
export const selectRefundRequestSchema = createInsertSchema(refundRequests);

export type RefundRequest = typeof refundRequests.$inferSelect;
export type InsertRefundRequest = typeof refundRequests.$inferInsert;
