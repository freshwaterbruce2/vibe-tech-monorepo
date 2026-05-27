import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { Invoice } from "../../types/invoice";
import Card from "../common/Card";

interface RecurringInvoicesProps {
	invoices: Invoice[];
}

const RecurringInvoices = ({ invoices }: RecurringInvoicesProps) => {
	const recurring = invoices.filter((i) => i.recurring?.enabled);

	return (
		<Card className="ui-stack ui-stack--md">
			<div className="ui-row" style={{ justifyContent: "space-between" }}>
				<h2 className="ui-h1" style={{ fontSize: "1.125rem" }}>
					Recurring
				</h2>
				<span className="ui-muted">
					<CalendarClock size={16} aria-hidden="true" /> {recurring.length}{" "}
					active
				</span>
			</div>

			{recurring.length === 0 ? (
				<p className="ui-muted">No recurring invoices yet.</p>
			) : (
				<div className="ui-table">
					<div className="ui-table__head">
						<span>Client</span>
						<span>Frequency</span>
						<span>Next</span>
					</div>
					{recurring.map((invoice) => (
						<div key={invoice.id} className="ui-table__row">
							<span>{invoice.client.name}</span>
							<span className="ui-muted">
								{invoice.recurring?.frequency} × {invoice.recurring?.interval}
							</span>
							<span className="ui-muted">
								{invoice.recurring?.nextInvoiceDate
									? format(invoice.recurring.nextInvoiceDate, "MMM d, yyyy")
									: "—"}
							</span>
						</div>
					))}
				</div>
			)}
		</Card>
	);
};

export default RecurringInvoices;
