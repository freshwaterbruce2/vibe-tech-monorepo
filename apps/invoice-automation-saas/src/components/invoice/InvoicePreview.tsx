import { format } from "date-fns";
import type React from "react";
import { useMemo } from "react";
import type { InvoiceFormData } from "../../types/invoice";
import Card from "../common/Card";

interface InvoicePreviewProps {
	form: InvoiceFormData;
	invoiceNumber?: string;
	currency?: string;
}

const formatCurrency = (amount: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);

const safeNumber = (value: unknown) =>
	Number.isFinite(Number(value)) ? Number(value) : 0;

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
	form,
	invoiceNumber = "INV-0000",
	currency = "USD",
}) => {
	const totals = useMemo(() => {
		const items = form.items ?? [];
		const subtotal = items.reduce((sum, item) => {
			const quantity = safeNumber(item.quantity);
			const price = safeNumber(item.price);
			return sum + quantity * price;
		}, 0);

		const taxRate = safeNumber(form.tax) / 100;
		const tax = subtotal * taxRate;
		const total = subtotal + tax;
		return { subtotal, tax, total };
	}, [form.items, form.tax]);

	const issueDate = form.issueDate ? new Date(form.issueDate) : null;
	const dueDate = form.dueDate ? new Date(form.dueDate) : null;

	return (
		<Card className="ui-stack ui-stack--md ui-preview">
			<div className="ui-row" style={{ justifyContent: "space-between" }}>
				<div className="ui-stack" style={{ gap: "0.15rem" }}>
					<strong>Invoice</strong>
					<span className="ui-muted">{invoiceNumber}</span>
				</div>
				<div
					className="ui-stack"
					style={{ gap: "0.15rem", textAlign: "right" }}
				>
					<span className="ui-muted">Issue</span>
					<span>{issueDate ? format(issueDate, "MMM d, yyyy") : "—"}</span>
				</div>
			</div>

			<div className="ui-invoice__line" />

			<div className="ui-stack ui-stack--md">
				<div>
					<div className="ui-muted">Bill to</div>
					<div style={{ fontWeight: 600 }}>
						{form.client?.name || "Client name"}
					</div>
					<div className="ui-muted">
						{form.client?.email || "client@email.com"}
					</div>
					{form.client?.company ? (
						<div className="ui-muted">{form.client.company}</div>
					) : null}
					{form.client?.address ? (
						<div className="ui-muted">{form.client.address}</div>
					) : null}
				</div>
				<div>
					<div className="ui-muted">Due</div>
					<div style={{ fontWeight: 600 }}>
						{dueDate ? format(dueDate, "MMM d, yyyy") : "—"}
					</div>
				</div>
			</div>

			<div className="ui-invoice__line" />

			<div className="ui-stack ui-stack--md">
				{(form.items ?? []).length === 0 ? (
					<div className="ui-muted">Add line items to see totals.</div>
				) : (
					(form.items ?? []).map((item, index) => (
						<div
							key={item.id ?? index}
							className="ui-row"
							style={{ justifyContent: "space-between" }}
						>
							<span>{item.description || "Line item"}</span>
							<span className="ui-mono">
								{formatCurrency(
									safeNumber(item.quantity) * safeNumber(item.price),
									currency,
								)}
							</span>
						</div>
					))
				)}
			</div>

			<div className="ui-invoice__line" />

			<div className="ui-stack" style={{ gap: "0.35rem" }}>
				<div className="ui-row" style={{ justifyContent: "space-between" }}>
					<span className="ui-muted">Subtotal</span>
					<span className="ui-mono">
						{formatCurrency(totals.subtotal, currency)}
					</span>
				</div>
				<div className="ui-row" style={{ justifyContent: "space-between" }}>
					<span className="ui-muted">Tax</span>
					<span className="ui-mono">
						{formatCurrency(totals.tax, currency)}
					</span>
				</div>
				<div className="ui-row" style={{ justifyContent: "space-between" }}>
					<strong>Total</strong>
					<strong className="ui-mono">
						{formatCurrency(totals.total, currency)}
					</strong>
				</div>
			</div>

			{form.notes ? (
				<>
					<div className="ui-invoice__line" />
					<div className="ui-stack" style={{ gap: "0.35rem" }}>
						<div className="ui-muted">Notes</div>
						<div className="ui-text">{form.notes}</div>
					</div>
				</>
			) : null}
		</Card>
	);
};

export default InvoicePreview;
