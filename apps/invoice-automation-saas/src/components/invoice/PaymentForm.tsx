import { useState } from "react";
import Button from "../common/Button";
import Card from "../common/Card";

interface PaymentFormProps {
	amount: number;
	currency: string;
	onPaid: () => Promise<void> | void;
}

const formatCurrency = (amount: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);

const PaymentForm = ({
	amount,
	currency,
	onPaid,
}: PaymentFormProps) => {
	const [submitting, setSubmitting] = useState(false);

	const pay = async () => {
		setSubmitting(true);
		try {
			await onPaid();
		} finally {
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
			<Button onClick={() => void pay()} loading={submitting}>
				Mark as paid (local simulation)
			</Button>
			<p className="ui-muted">
				When you add a backend, replace this with a real Stripe Checkout
				session.
			</p>
		</Card>
	);
};

export default PaymentForm;
