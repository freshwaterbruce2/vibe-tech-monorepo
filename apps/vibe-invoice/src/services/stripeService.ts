import { loadStripe, type Stripe } from "@stripe/stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

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

export interface CheckoutSessionResponse {
	url: string;
}

export const createCheckoutSession = async (
	invoiceId: string,
	publicToken: string,
): Promise<CheckoutSessionResponse> => {
	const res = await fetch(
		`${apiBase}/api/public/invoices/${encodeURIComponent(invoiceId)}/checkout-session`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: publicToken }),
		},
	);
	if (!res.ok) {
		const text = await res.text();
		throw new Error(
			`Could not start checkout session (${res.status}): ${text || res.statusText}`,
		);
	}
	const data = (await res.json()) as { url?: string };
	if (!data.url) {
		throw new Error("Checkout session response missing url");
	}
	return { url: data.url };
};
