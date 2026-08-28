import { useCallback, useEffect, useMemo, useState } from "react";
import { invoiceService } from "../services/invoiceService";
import type { Invoice } from "../types/invoice";

export const useRealtimeInvoices = () => {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// First emission from subscribe() is the synchronous current snapshot
		// (empty cache, no error) before any fetch resolves. We ignore that one
		// so `loading` stays true until the initial fetch settles to either
		// data or an error.
		let primed = false;
		const unsubscribe = invoiceService.subscribe(({ invoices: next, error: nextError }) => {
			setInvoices(next);
			setError(nextError);
			if (primed) {
				setLoading(false);
			} else {
				primed = true;
			}
		});
		return () => unsubscribe();
	}, []);

	const retry = useCallback(async () => {
		setLoading(true);
		try {
			await invoiceService.listInvoices();
		} catch {
			// Service has already broadcast the error to subscribers; nothing
			// to do here. Loading will clear via the subscription handler.
		}
	}, []);

	const totals = useMemo(() => {
		const totalRevenue = invoices
			.filter((i) => i.status === "paid")
			.reduce((sum, invoice) => sum + invoice.total, 0);

		const outstanding = invoices
			.filter((i) => i.status !== "paid")
			.reduce((sum, invoice) => sum + invoice.total, 0);

		return { totalRevenue, outstanding };
	}, [invoices]);

	return { invoices, loading, error, retry, totals };
};
