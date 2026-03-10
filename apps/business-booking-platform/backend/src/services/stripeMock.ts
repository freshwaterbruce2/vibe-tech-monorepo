// Mock Stripe Service for Local Development
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export class StripeService {
	constructor() {
		logger.info('Using mock Stripe service for local development');
	}

	async createPaymentIntent(params: {
		amount: number;
		currency?: string;
		metadata?: Record<string, string>;
	}) {
		const paymentIntentId = `pi_test_${randomUUID()}`;
		const clientSecret = `${paymentIntentId}_secret_${randomUUID()}`;

		logger.info('Mock payment intent created', {
			paymentIntentId,
			amount: params.amount,
			currency: params.currency || 'USD',
		});

		return {
			id: paymentIntentId,
			client_secret: clientSecret,
			amount: params.amount,
			currency: params.currency || 'usd',
			status: 'requires_payment_method',
			metadata: params.metadata || {},
		};
	}

	async confirmPaymentIntent(
		paymentIntentId: string,
		paymentMethodId?: string,
	) {
		logger.info('Mock payment intent confirmed', {
			paymentIntentId,
			paymentMethodId,
		});

		return {
			id: paymentIntentId,
			status: 'succeeded',
			amount_received: 10000, // Mock amount
			payment_method: paymentMethodId || `pm_test_${randomUUID()}`,
		};
	}

	async retrievePaymentIntent(paymentIntentId: string) {
		return {
			id: paymentIntentId,
			status: 'succeeded',
			amount: 10000,
			currency: 'usd',
			metadata: {},
		};
	}

	async createRefund(params: {
		payment_intent: string;
		amount?: number;
		reason?: string;
		metadata?: Record<string, string>;
	}) {
		const refundId = `re_test_${randomUUID()}`;

		logger.info('Mock refund created', {
			refundId,
			paymentIntent: params.payment_intent,
			amount: params.amount,
		});

		return {
			id: refundId,
			payment_intent: params.payment_intent,
			amount: params.amount || 10000,
			currency: 'usd',
			status: 'succeeded',
			reason: params.reason || 'requested_by_customer',
			metadata: params.metadata || {},
		};
	}

	async createSetupIntent(params?: { metadata?: Record<string, string> }) {
		const setupIntentId = `seti_test_${randomUUID()}`;
		const clientSecret = `${setupIntentId}_secret_${randomUUID()}`;

		return {
			id: setupIntentId,
			client_secret: clientSecret,
			status: 'requires_payment_method',
			metadata: params?.metadata || {},
		};
	}

	async handleStripeWebhook(_payload: Buffer, _signature: string) {
		// Mock webhook handling
		logger.info('Mock webhook received');

		// Simulate webhook event
		return {
			type: 'payment_intent.succeeded',
			data: {
				object: {
					id: `pi_test_${randomUUID()}`,
					status: 'succeeded',
					amount: 10000,
					metadata: {},
				},
			},
		};
	}

	async createCheckoutSession(params: any) {
		const sessionId = `cs_test_${randomUUID()}`;

		return {
			id: sessionId,
			url: `https://checkout.stripe.com/test/${sessionId}`,
			payment_status: 'unpaid',
			metadata: params.metadata || {},
		};
	}
}

// Export singleton instance for local development
export const stripeService = new StripeService();

export default StripeService;
