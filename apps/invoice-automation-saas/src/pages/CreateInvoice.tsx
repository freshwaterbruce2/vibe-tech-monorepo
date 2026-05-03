import { addDays, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
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

function createInvoiceIdentifiers() {
	const createdAtMs = Date.now();
	return {
		id: `inv_${createdAtMs}`,
		clientId: `client_${createdAtMs}`,
		invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
	};
}

const CreateInvoice = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const editId = searchParams.get("edit");
	const isEditMode = Boolean(editId);

	const [recurring, setRecurring] = useState<RecurringSettingsValue>({
		enabled: false,
		frequency: "monthly",
		interval: 1,
	});
	const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

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

	useEffect(() => {
		if (!editId) return;
		let cancelled = false;
		void (async () => {
			try {
				const invoice = await invoiceService.getInvoiceById(editId);
				if (cancelled) return;
				if (!invoice) {
					setLoadError("Invoice not found");
					return;
				}
				if (invoice.status !== "draft") {
					setLoadError(
						`Only drafts can be edited (status: ${invoice.status})`,
					);
					return;
				}
				setEditingInvoice(invoice);
				methods.reset({
					client: {
						name: invoice.client.name,
						email: invoice.client.email,
						phone: invoice.client.phone,
						company: invoice.client.company,
						address: invoice.client.address,
					},
					items: invoice.items.map((item) => ({
						id: item.id,
						description: item.description,
						quantity: item.quantity,
						price: item.price,
						total: item.total,
					})),
					issueDate: format(invoice.issueDate, "yyyy-MM-dd"),
					dueDate: format(invoice.dueDate, "yyyy-MM-dd"),
					tax: invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 0,
					notes: invoice.notes ?? "",
					terms: invoice.terms ?? "",
				});
				if (invoice.recurring?.enabled) {
					setRecurring({
						enabled: true,
						frequency: invoice.recurring.frequency,
						interval: invoice.recurring.interval,
					});
				}
			} catch (err) {
				if (!cancelled)
					setLoadError(
						err instanceof Error ? err.message : "Failed to load invoice",
					);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [editId, methods]);

	const watched = useWatch({
		control: methods.control,
	});

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
		const baseId = editingInvoice?.id ?? createInvoiceIdentifiers().id;
		const baseClientId =
			editingInvoice?.client.id ?? createInvoiceIdentifiers().clientId;
		const baseInvoiceNumber =
			editingInvoice?.invoiceNumber ?? createInvoiceIdentifiers().invoiceNumber;

		const invoice: Invoice = {
			id: baseId,
			invoiceNumber: baseInvoiceNumber,
			issueDate: new Date(data.issueDate),
			dueDate: new Date(data.dueDate),
			client: {
				id: baseClientId,
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
					id: item.id ?? `${baseId}_item_${index}`,
					description: item.description ?? "",
					quantity,
					price,
					total: quantity * price,
				};
			}),
			subtotal: totals.subtotal,
			tax: totals.tax,
			total: totals.total,
			status: editingInvoice ? "draft" : "sent",
			notes: data.notes,
			terms: data.terms,
			currency: "USD",
			recurring: recurring.enabled
				? {
						enabled: true,
						frequency: recurring.frequency,
						interval: recurring.interval,
						startDate: editingInvoice?.recurring?.startDate ?? new Date(),
						endType: "never",
					}
				: undefined,
			createdAt: editingInvoice?.createdAt ?? new Date(),
			updatedAt: new Date(),
		};

		if (editingInvoice) {
			const updated = await invoiceService.updateInvoice(
				editingInvoice.id,
				invoice,
			);
			toast.success("Draft updated");
			navigate(`/invoice/${updated.id}/payment`);
		} else {
			const created = await invoiceService.createInvoice(invoice);
			toast.success("Invoice created");
			const suffix = created.publicToken
				? `?token=${encodeURIComponent(created.publicToken)}`
				: "";
			navigate(`/invoice/${created.id}/payment${suffix}`);
		}
	};

	return (
		<div className="ui-page">
			<Navigation variant="app" />
			<main className="ui-container ui-invoice-builder">
				<div
					className="ui-row"
					style={{ justifyContent: "space-between", alignItems: "center" }}
				>
					<h1 className="ui-h1">
						{isEditMode ? "Edit draft invoice" : "Create invoice"}
					</h1>
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							void navigate("/dashboard");
						}}
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
							{loadError ? (
								<div className="ui-error" role="alert">
									{loadError}
								</div>
							) : null}
							<Button type="submit" disabled={Boolean(loadError)}>
								{isEditMode ? "Save changes" : "Create invoice"}
							</Button>
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
