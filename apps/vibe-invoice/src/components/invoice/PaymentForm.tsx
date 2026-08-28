import { useState } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import { createCheckoutSession } from "../../services/stripeService";

interface PaymentFormProps {
	invoiceId: string;
	publicToken: string;
	amount: number;
	currency: string;
	disabled?: boolean;
}

const formatCurrency = (amount: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);

const PaymentForm = ({
	invoiceId,
	publicToken,
	amount,
	currency,
	disabled = false,
}: PaymentFormProps) => {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const startCheckout = async () => {
		setSubmitting(true);
		setError(null);
		try {
			const { url } = await createCheckoutSession(invoiceId, publicToken);
			window.location.href = url;
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not start checkout");
			setSubmitting(false);
		}
	};

	return (
		<Card className="ui-stack ui-stack--md">
			<h2 className="ui-h1" style={{ fontSize: "1.125rem" }}>
				Payment
			</h2>
			<p className="ui-text">
				Amount due: <strong>{formatCurrency(amount, currency)}</strong>
			</p>
			{error ? (
				<p className="ui-text" style={{ color: "var(--ui-color-danger, #dc2626)" }}>
					{error}
				</p>
			) : null}
			<Button
				onClick={() => void startCheckout()}
				loading={submitting}
				disabled={disabled || submitting}
			>
				Pay with Stripe
			</Button>
		</Card>
	);
};

export default PaymentForm;
