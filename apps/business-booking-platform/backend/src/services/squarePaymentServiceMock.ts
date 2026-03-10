// Mock Square Payment Service for Local Development
import { randomUUID } from 'crypto';
import { getDb } from '../database';
import { payments, refunds } from '../database/schema';
import { logger } from '../utils/logger';

export class SquarePaymentService {
	constructor() {
		logger.info('Using mock Square payment service for local development');
	}

	async createPayment(params: {
		sourceId: string;
		amount: number;
		currency?: string;
		bookingId: string;
		userId?: string;
		metadata?: Record<string, string>;
		billingAddress?: any;
	}): Promise<{
		success: boolean;
		paymentId?: string;
		receiptUrl?: string;
		errorMessage?: string;
	}> {
		try {
			const db = await getDb();
			const paymentId = randomUUID();

			// Simulate successful payment for local testing
			await db.insert(payments).values({
				id: paymentId,
				bookingId: params.bookingId,
				userId: params.userId || '1',
				amount: params.amount.toString(),
				currency: params.currency || 'USD',
				status: 'completed',
				method: 'card',
				provider: 'square',
				transactionId: `sq_test_${randomUUID()}`,
				metadata: params.metadata || {},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			logger.info(`Mock payment created: ${paymentId}`);

			return {
				success: true,
				paymentId,
				receiptUrl: `http://localhost:3001/receipts/${paymentId}`,
			};
		} catch (error) {
			logger.error('Mock payment failed:', error);
			return {
				success: false,
				errorMessage: error instanceof Error ? error.message : 'Payment failed',
			};
		}
	}

	async getPayment(paymentId: string): Promise<any> {
		const db = await getDb();
		const payment = await db.query.payments.findFirst({
			where: (payments, { eq }) => eq(payments.id, paymentId),
		});

		return {
			payment: {
				id: payment?.id,
				status: payment?.status || 'COMPLETED',
				amountMoney: {
					amount: payment?.amount ? BigInt(payment.amount) : BigInt(0),
					currency: payment?.currency || 'USD',
				},
				createdAt: payment?.createdAt?.toISOString(),
			},
		};
	}

	async createRefund(params: {
		paymentId: string;
		amount?: number;
		reason?: string;
	}): Promise<{
		success: boolean;
		refundId?: string;
		errorMessage?: string;
	}> {
		try {
			const db = await getDb();
			const refundId = randomUUID();

			// Get original payment
			const payment = await db.query.payments.findFirst({
				where: (payments, { eq }) => eq(payments.id, params.paymentId),
			});

			if (!payment) {
				throw new Error('Payment not found');
			}

			const refundAmount = params.amount || parseFloat(payment.amount);

			await db.insert(refunds).values({
				id: refundId,
				paymentId: params.paymentId,
				amount: refundAmount.toString(),
				currency: payment.currency,
				status: 'completed',
				reason: params.reason || 'requested_by_customer',
				metadata: {},
				processedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			logger.info(`Mock refund created: ${refundId}`);

			return {
				success: true,
				refundId,
			};
		} catch (error) {
			logger.error('Mock refund failed:', error);
			return {
				success: false,
				errorMessage: error instanceof Error ? error.message : 'Refund failed',
			};
		}
	}

	async getRefund(refundId: string): Promise<any> {
		const db = await getDb();
		const refund = await db.query.refunds.findFirst({
			where: (refunds, { eq }) => eq(refunds.id, refundId),
		});

		return {
			refund: {
				id: refund?.id,
				status: refund?.status || 'COMPLETED',
				amountMoney: {
					amount: refund?.amount ? BigInt(refund.amount) : BigInt(0),
					currency: refund?.currency || 'USD',
				},
				createdAt: refund?.createdAt?.toISOString(),
			},
		};
	}

	async createCustomer(params: any): Promise<any> {
		return {
			customer: {
				id: `cust_${randomUUID()}`,
				email: params.email,
				givenName: params.givenName,
				familyName: params.familyName,
			},
		};
	}

	async createCard(params: any): Promise<any> {
		return {
			card: {
				id: `card_${randomUUID()}`,
				last4: '4242',
				expMonth: BigInt(12),
				expYear: BigInt(2025),
				cardholderName: params.cardholderName,
			},
		};
	}
}

export default SquarePaymentService;
