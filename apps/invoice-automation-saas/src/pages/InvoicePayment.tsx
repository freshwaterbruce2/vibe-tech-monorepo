import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import Navigation from "../components/common/Navigation";
import PaymentForm from "../components/invoice/PaymentForm";
import { invoiceService } from "../services/invoiceService";
import type { Invoice } from "../types/invoice";

const InvoicePayment: React.FC = () => {
	const { invoiceId } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [paid, setPaid] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);

	const publicToken = useMemo(() => {
		const params = new URLSearchParams(location.search);
		const token = params.get("token");
		return token ?? undefined;
	}, [location.search]);

	useEffect(() => {
		let mounted = true;
		if (!invoiceId) return;
		void invoiceService
			.getInvoiceById(invoiceId, { publicToken })
			.then((found) => {
				if (!mounted) return;
				setInvoice(found);
				setPaid(found?.status === "paid");
				setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [invoiceId, publicToken]);

	const onPaid = async () => {
		if (!invoiceId) return;
		const updated = await invoiceService.markInvoicePaid(invoiceId, {
			publicToken,
		});
		if (updated) {
			setInvoice(updated);
			setPaid(true);
			toast.success("Payment recorded (local)");
		} else {
			toast.error("Invoice not found");
		}
	};

	if (loading) {
		return (
			<div className="ui-page">
				<Navigation variant="public" />
				<main className="ui-container ui-auth">
					<Card className="ui-auth__card">
						<h1 className="ui-h1">Loading…</h1>
						<p className="ui-muted">Fetching invoice details.</p>
					</Card>
				</main>
			</div>
		);
	}

	if (!invoice) {
		return (
			<div className="ui-page">
				<Navigation variant="public" />
				<main className="ui-container ui-auth">
					<Card className="ui-auth__card">
						<h1 className="ui-h1">Invoice not found</h1>
						<p className="ui-muted">
							No invoice data was provided for{" "}
							<span className="ui-mono">{invoiceId}</span>. Create an invoice
							first, or start the local API server to load invoices by ID.
						</p>
					</Card>
				</main>
			</div>
		);
	}

	return (
		<div className="ui-page">
			<Navigation variant="public" />
			<main className="ui-container ui-payment">
				<div
					className="ui-row"
					style={{ justifyContent: "space-between", alignItems: "center" }}
				>
					<div className="ui-stack ui-stack--md">
						<h1 className="ui-h1">Pay invoice</h1>
						<div className="ui-muted">{invoice.invoiceNumber}</div>
					</div>
					<button className="ui-link" onClick={() => navigate("/")}>
						Back to home
					</button>
				</div>

				<div className="ui-grid ui-grid--2">
					<Card className="ui-stack ui-stack--md">
						<h2 className="ui-h1" style={{ fontSize: "1.125rem" }}>
							Summary
						</h2>
						<div className="ui-row" style={{ justifyContent: "space-between" }}>
							<span className="ui-muted">Client</span>
							<span>{invoice.client.name}</span>
						</div>
						<div className="ui-row" style={{ justifyContent: "space-between" }}>
							<span className="ui-muted">Total</span>
							<strong>
								{new Intl.NumberFormat("en-US", {
									style: "currency",
									currency: invoice.currency,
								}).format(invoice.total)}
							</strong>
						</div>
						{paid ? <span className="ui-chip ui-chip--paid">paid</span> : null}
					</Card>

					<PaymentForm
						amount={invoice.total}
						currency={invoice.currency}
						onPaid={onPaid}
					/>
				</div>
			</main>
		</div>
	);
};

export default InvoicePayment;
