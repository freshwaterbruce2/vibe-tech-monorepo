/* Minimal PayPal service placeholder - real integration can be added later. */

import { eq } from 'drizzle-orm';
import { getDb } from '../database';
import { bookings, payments } from '../database/schema';
import { logger } from '../utils/logger';

interface CreateOrderParams {
	bookingId: string;
	amount: number;
	currency: string;
	userId?: string;
}

class PayPalService {
	async createOrder(params: CreateOrderParams) {
		// Simulate order creation; in real implementation call PayPal Orders API
		const fakeOrderId = `paypal_order_${Date.now()}`;
		const db = await getDb();
		await db.insert(payments).values({
			bookingId: params.bookingId,
			userId: params.userId,
			amount: params.amount.toString(),
			currency: params.currency,
			status: 'pending',
			method: 'paypal',
			provider: 'paypal',
			transactionId: fakeOrderId,
			metadata: { simulated: true },
		});
		return { success: true, orderId: fakeOrderId };
	}

	async captureOrder(orderId: string) {
		const db = await getDb();
		// Mark payment succeeded
		const updated = await db
			.update(payments)
			.set({
				status: 'succeeded',
				processedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(payments.transactionId, orderId))
			.returning();
		if (!updated.length) {
return { success: false, error: 'Order not found' };
}
		// Optionally update booking status
		const payment = updated[0];
		await db
			.update(bookings)
			.set({ status: 'confirmed', updatedAt: new Date() })
			.where(eq(bookings.id, payment.bookingId));
		logger.info('Simulated PayPal capture', { orderId });
		return { success: true };
	}
}

export const paypalService = new PayPalService();
