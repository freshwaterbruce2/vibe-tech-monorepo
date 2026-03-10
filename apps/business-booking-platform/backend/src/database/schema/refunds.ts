import { relations } from 'drizzle-orm';
import {
	decimal,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { bookings } from './bookings.js';
import { payments } from './payments.js';
import { users } from './users.js';

export const refundRequests = pgTable(
	'refund_requests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => bookings.id),
		paymentId: uuid('payment_id')
			.notNull()
			.references(() => payments.id),
		requestedBy: uuid('requested_by')
			.notNull()
			.references(() => users.id),
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
		reason: text('reason').notNull(),
		status: text('status', {
			enum: ['pending', 'approved', 'rejected', 'processed', 'failed'],
		})
			.notNull()
			.default('pending'),
		adminNotes: text('admin_notes'),
		squareRefundId: text('square_refund_id'),
		processedBy: uuid('processed_by').references(() => users.id),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		processedAt: timestamp('processed_at'),
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
