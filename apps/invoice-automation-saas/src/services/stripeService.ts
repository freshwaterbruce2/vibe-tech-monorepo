import { loadStripe, type Stripe } from "@stripe/stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";

let stripePromise: Promise<Stripe | null> | null = null;

export const isStripeConfigured = () => Boolean(stripePublicKey);

export const getStripe = async () => {
	if (!isStripeConfigured()) return Promise.resolve(null);
	if (!stripePromise) {
		stripePromise = loadStripe(stripePublicKey);
	}
	return stripePromise;
};

export const assertStripeConfigured = () => {
	if (!isStripeConfigured()) {
		throw new Error("Stripe is not configured. Set VITE_STRIPE_PUBLIC_KEY.");
	}
};
