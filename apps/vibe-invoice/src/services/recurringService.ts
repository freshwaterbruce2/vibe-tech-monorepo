import { addMonths, addWeeks, addYears } from "date-fns";
import type { RecurringInvoice } from "../types/invoice";

export const computeNextInvoiceDate = (
	recurring: RecurringInvoice,
	from: Date = new Date(),
) => {
	const interval = Math.max(1, recurring.interval ?? 1);
	switch (recurring.frequency) {
		case "weekly":
			return addWeeks(from, interval);
		case "monthly":
			return addMonths(from, interval);
		case "quarterly":
			return addMonths(from, interval * 3);
		case "yearly":
			return addYears(from, interval);
		default:
			return addMonths(from, 1);
	}
};
