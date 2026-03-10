import { useEffect, useMemo, useState } from "react";
import { invoiceService } from "../services/invoiceService";
import type { Invoice } from "../types/invoice";

export const useRealtimeInvoices = () => {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = invoiceService.subscribe((next) => {
			setInvoices(next);
			setLoading(false);
		});
		return () => unsubscribe();
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

	return { invoices, loading, totals };
};
