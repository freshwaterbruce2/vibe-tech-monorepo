import { addDays } from "date-fns";
import type { Invoice } from "../types/invoice";

export const generateMockInvoices = (): Invoice[] => {
	const now = new Date();
	const invoice1: Invoice = {
		id: "inv_mock_1",
		invoiceNumber: "INV-1001",
		issueDate: addDays(now, -14),
		dueDate: addDays(now, 0),
		client: { id: "c_1", name: "Acme Co", email: "billing@acme.co" },
		items: [
			{
				id: "it_1",
				description: "Retainer",
				quantity: 1,
				price: 1200,
				total: 1200,
			},
			{
				id: "it_2",
				description: "Support",
				quantity: 2,
				price: 150,
				total: 300,
			},
		],
		subtotal: 1500,
		tax: 0,
		total: 1500,
		status: "sent",
		currency: "USD",
		notes: "Thanks for your business!",
		terms: "Net 14",
		recurring: {
			enabled: true,
			frequency: "monthly",
			interval: 1,
			startDate: now,
			endType: "never",
			nextInvoiceDate: addDays(now, 30),
		},
		createdAt: now,
		updatedAt: now,
	};

	const invoice2: Invoice = {
		id: "inv_mock_2",
		invoiceNumber: "INV-1002",
		issueDate: addDays(now, -10),
		dueDate: addDays(now, 4),
		client: { id: "c_2", name: "Bluebird Studio", email: "ap@bluebird.studio" },
		items: [
			{
				id: "it_3",
				description: "Brand refresh",
				quantity: 1,
				price: 2200,
				total: 2200,
			},
		],
		subtotal: 2200,
		tax: 0,
		total: 2200,
		status: "paid",
		currency: "USD",
		createdAt: now,
		updatedAt: now,
	};

	return [invoice1, invoice2];
};
