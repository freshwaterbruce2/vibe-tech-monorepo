// Stripe has been deprecated in this deployment profile.
// This minimal stub remains only to satisfy any lingering imports.
export class StripeService {
	createPaymentIntent(): never {
		throw new Error('Stripe disabled');
	}
	confirmPaymentIntent(): never {
		throw new Error('Stripe disabled');
	}
	retrievePaymentIntent(): never {
		throw new Error('Stripe disabled');
	}
	createRefund(): never {
		throw new Error('Stripe disabled');
	}
	handleStripeWebhook(): never {
		throw new Error('Stripe disabled');
	}
	createCustomer(): never {
		throw new Error('Stripe disabled');
	}
	createSetupIntent(): never {
		throw new Error('Stripe disabled');
	}
}
export const stripeService = new StripeService();
