import { addDays, format } from "date-fns";
import type React from "react";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../components/common/Button";
import Navigation from "../components/common/Navigation";
import InvoiceForm from "../components/invoice/InvoiceForm";
import InvoicePreview from "../components/invoice/InvoicePreview";
import RecurringSettings, {
	type RecurringSettingsValue,
} from "../components/invoice/RecurringSettings";
import { invoiceService } from "../services/invoiceService";
import type { Invoice, InvoiceFormData } from "../types/invoice";

const safeNumber = (value: unknown) =>
	Number.isFinite(Number(value)) ? Number(value) : 0;

const CreateInvoice: React.FC = () => {
	const navigate = useNavigate();
	const [recurring, setRecurring] = useState<RecurringSettingsValue>({
		enabled: false,
		frequency: "monthly",
		interval: 1,
	});

	const methods = useForm<InvoiceFormData>({
		defaultValues: {
			client: { name: "", email: "" },
			items: [
				{ id: "tmp_1", description: "", quantity: 1, price: 0, total: 0 },
			],
			issueDate: format(new Date(), "yyyy-MM-dd"),
			dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
			tax: 0,
			notes: "",
			terms: "Net 14",
		},
		mode: "onBlur",
	});

	const watched = methods.watch();

	const totals = useMemo(() => {
		const subtotal = (watched.items ?? []).reduce((sum, item) => {
			const quantity = safeNumber(item.quantity);
			const price = safeNumber(item.price);
			return sum + quantity * price;
		}, 0);
		const taxRate = safeNumber(watched.tax) / 100;
		const tax = subtotal * taxRate;
		return { subtotal, tax, total: subtotal + tax };
	}, [watched.items, watched.tax]);

	const onSubmit = async (data: InvoiceFormData) => {
		const id = `inv_${Date.now()}`;
		const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

		const invoice: Invoice = {
			id,
			invoiceNumber,
			issueDate: new Date(data.issueDate),
			dueDate: new Date(data.dueDate),
			client: {
				id: `client_${Date.now()}`,
				name: data.client.name ?? "Client",
				email: data.client.email ?? "",
				address: data.client.address,
				phone: data.client.phone,
				company: data.client.company,
			},
			items: (data.items ?? []).map((item, index) => {
				const quantity = safeNumber(item.quantity);
				const price = safeNumber(item.price);
				return {
					id: item.id ?? `${id}_item_${index}`,
					description: item.description ?? "",
					quantity,
					price,
					total: quantity * price,
				};
			}),
			subtotal: totals.subtotal,
			tax: totals.tax,
			total: totals.total,
			status: "sent",
			notes: data.notes,
			terms: data.terms,
			currency: "USD",
			recurring: recurring.enabled
				? {
						enabled: true,
						frequency: recurring.frequency,
						interval: recurring.interval,
						startDate: new Date(),
						endType: "never",
					}
				: undefined,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const created = await invoiceService.createInvoice(invoice);
		toast.success("Invoice created");
		const suffix = created.publicToken
			? `?token=${encodeURIComponent(created.publicToken)}`
			: "";
		navigate(`/invoice/${created.id}/payment${suffix}`);
	};

	return (
		<div className="ui-page">
			<Navigation variant="app" />
			<main className="ui-container ui-invoice-builder">
				<div
					className="ui-row"
					style={{ justifyContent: "space-between", alignItems: "center" }}
				>
					<h1 className="ui-h1">Create invoice</h1>
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate("/dashboard")}
					>
						Back to dashboard
					</Button>
				</div>

				<div className="ui-invoice-builder__grid">
					<FormProvider {...methods}>
						<form
							className="ui-stack ui-stack--md"
							onSubmit={methods.handleSubmit(onSubmit)}
						>
							<InvoiceForm />
							<RecurringSettings value={recurring} onChange={setRecurring} />
							<Button type="submit">Create invoice</Button>
						</form>
					</FormProvider>

					<div className="ui-stack ui-stack--md">
						<div className="ui-muted">Live preview</div>
						<InvoicePreview
							form={watched}
							invoiceNumber="INV-PREVIEW"
							currency="USD"
						/>
					</div>
				</div>
			</main>
		</div>
	);
};

export default CreateInvoice;
