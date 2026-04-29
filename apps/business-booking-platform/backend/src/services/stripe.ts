import StripeSDK from 'stripe';
import { logger } from '../utils/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
	logger.warn('STRIPE_SECRET_KEY is not set — Stripe calls will fail at runtime');
}

const stripe = new StripeSDK(STRIPE_SECRET_KEY ?? '', {
	apiVersion: '2026-03-25.dahlia',
});

export class StripeService {
	/**
	 * Create a PaymentIntent. Amount must be in the smallest currency unit (e.g. cents for USD).
	 */
	async createPaymentIntent(params: {
		amount: number;
		currency?: string;
		metadata?: Record<string, string>;
	}) {
		const intent = await stripe.paymentIntents.create({
			amount: params.amount,
			currency: (params.currency ?? 'usd').toLowerCase(),
			metadata: params.metadata ?? {},
		});

		logger.info('Stripe PaymentIntent created', {
			id: intent.id,
			amount: intent.amount,
			currency: intent.currency,
		});

		return intent;
	}

	/**
	 * Confirm a PaymentIntent with an optional payment method.
	 */
	async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
		const intent = await stripe.paymentIntents.confirm(paymentIntentId, {
			...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
		});

		logger.info('Stripe PaymentIntent confirmed', {
			id: intent.id,
			status: intent.status,
		});

		return intent;
	}

	/**
	 * Retrieve an existing PaymentIntent by ID.
	 */
	async retrievePaymentIntent(paymentIntentId: string) {
		return stripe.paymentIntents.retrieve(paymentIntentId);
	}

	/**
	 * Issue a full or partial refund against a PaymentIntent.
	 * Non-Stripe fields (bookingId, processedBy) are stored in metadata.
	 */
	async createRefund(params: {
		paymentIntentId?: string;
		/** Alias accepted from admin route */
		payment_intent?: string;
		amount?: number;
		reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
		bookingId?: string;
		processedBy?: string;
		metadata?: Record<string, string>;
	}) {
		const intentId = params.paymentIntentId ?? params.payment_intent;
		if (!intentId) {
			throw new Error('createRefund requires paymentIntentId or payment_intent');
		}

		const mergedMetadata: Record<string, string> = {
			...(params.metadata ?? {}),
			...(params.bookingId ? { bookingId: params.bookingId } : {}),
			...(params.processedBy ? { processedBy: params.processedBy } : {}),
		};

		const refund = await stripe.refunds.create({
			payment_intent: intentId,
			...(params.amount !== undefined ? { amount: params.amount } : {}),
			...(params.reason ? { reason: params.reason } : {}),
			...(Object.keys(mergedMetadata).length > 0 ? { metadata: mergedMetadata } : {}),
		});

		logger.info('Stripe refund created', {
			id: refund.id,
			payment_intent: refund.payment_intent,
			amount: refund.amount,
			status: refund.status,
		});

		return refund;
	}

	/**
	 * Create a SetupIntent for saving a payment method without charging.
	 */
	async createSetupIntent(params?: { metadata?: Record<string, string> }) {
		return stripe.setupIntents.create({
			metadata: params?.metadata ?? {},
		});
	}

	/**
	 * Validate and parse an incoming Stripe webhook event.
	 * Throws a StripeSignatureVerificationError if the signature is invalid.
	 */
	async handleStripeWebhook(payload: Buffer, signature: string) {
		if (!STRIPE_WEBHOOK_SECRET) {
			throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
		}

		const event = stripe.webhooks.constructEvent(
			payload,
			signature,
			STRIPE_WEBHOOK_SECRET,
		);

		logger.info('Stripe webhook received', {
			type: event.type,
			id: event.id,
		});

		return event;
	}

	/**
	 * Create a Stripe Checkout Session for hosted payment pages.
	 */
	async createCheckoutSession(params: {
		lineItems: { price: string; quantity: number }[];
		successUrl: string;
		cancelUrl: string;
		mode?: 'payment' | 'subscription' | 'setup';
		metadata?: Record<string, string>;
	}) {
		const session = await stripe.checkout.sessions.create({
			line_items: params.lineItems,
			mode: params.mode ?? 'payment',
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			metadata: params.metadata ?? {},
		});

		logger.info('Stripe Checkout Session created', {
			id: session.id,
			paymentStatus: session.payment_status,
		});

		return session;
	}
}

export const stripeService = new StripeService();
export default StripeService;
