export interface InvoiceItem {
	id: string;
	description: string;
	quantity: number;
	price: number;
	total: number;
}

export interface Client {
	id: string;
	name: string;
	email: string;
	address?: string;
	phone?: string;
	company?: string;
}

export interface RecurringInvoice {
	enabled: boolean;
	frequency: "weekly" | "monthly" | "quarterly" | "yearly";
	interval: number;
	startDate: Date;
	endDate?: Date;
	endType: "never" | "date" | "occurrences";
	occurrences?: number;
	nextInvoiceDate?: Date;
}

export interface Invoice {
	id: string;
	invoiceNumber: string;
	issueDate: Date;
	dueDate: Date;
	client: Client;
	items: InvoiceItem[];
	subtotal: number;
	tax: number;
	total: number;
	status: "draft" | "sent" | "paid" | "overdue";
	notes?: string;
	terms?: string;
	currency: string;
	recurring?: RecurringInvoice;
	parentInvoiceId?: string; // For tracking recurring invoice series
	publicToken?: string; // For public payment links (local backend)
	createdAt: Date;
	updatedAt: Date;
}

export interface InvoiceFormData {
	client: Partial<Client>;
	items: Partial<InvoiceItem>[];
	issueDate: string;
	dueDate: string;
	notes?: string;
	terms?: string;
	tax?: number;
}
