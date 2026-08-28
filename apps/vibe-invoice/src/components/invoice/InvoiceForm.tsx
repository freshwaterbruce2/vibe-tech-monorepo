import { Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { TaxRate } from "../../services/taxRateService";
import type { InvoiceFormData } from "../../types/invoice";
import Button from "../common/Button";
import Card from "../common/Card";
import Input from "../common/Input";

interface InvoiceFormProps {
	taxRates?: TaxRate[];
}

const InvoiceForm = ({ taxRates = [] }: InvoiceFormProps) => {
	const {
		register,
		formState: { errors },
		control,
	} = useFormContext<InvoiceFormData>();

	const { fields, append, remove } = useFieldArray({
		name: "items",
		control,
	});

	const taxStrategy = useWatch({ control, name: "taxStrategy" }) ?? "invoice";

	return (
		<Card className="ui-stack ui-stack--md">
			<h2 className="ui-h1" style={{ fontSize: "1.125rem" }}>
				Invoice details
			</h2>

			<div className="ui-grid ui-grid--2">
				<Input
					label="Client name"
					{...register("client.name", { required: "Client name is required" })}
					error={errors.client?.name?.message}
				/>
				<Input
					label="Client email"
					type="email"
					{...register("client.email", {
						required: "Client email is required",
					})}
					error={errors.client?.email?.message}
				/>
			</div>

			<div className="ui-grid ui-grid--2">
				<Input label="Company" {...register("client.company")} />
				<Input label="Phone" {...register("client.phone")} />
			</div>

			<Input label="Address" {...register("client.address")} />

			<div className="ui-grid ui-grid--2">
				<Input
					label="Issue date"
					type="date"
					{...register("issueDate", { required: "Issue date is required" })}
					error={errors.issueDate?.message as string | undefined}
				/>
				<Input
					label="Due date"
					type="date"
					{...register("dueDate", { required: "Due date is required" })}
					error={errors.dueDate?.message as string | undefined}
				/>
			</div>

			<div className="ui-invoice-items ui-stack ui-stack--md">
				<div className="ui-row" style={{ justifyContent: "space-between" }}>
					<h3 style={{ fontWeight: 700 }}>Line items</h3>
					<Button
						type="button"
						variant="ghost"
						onClick={() =>
							append({
								id: `tmp_${Date.now()}`,
								description: "",
								quantity: 1,
								price: 0,
								total: 0,
							})
						}
					>
						Add item
					</Button>
				</div>

				{fields.length === 0 ? (
					<div className="ui-muted">Add at least one line item.</div>
				) : null}

				{fields.map((field, index) => (
					<div key={field.id} className="ui-invoice-item">
						<div className="ui-grid ui-grid--2">
							<Input
								label="Description"
								{...register(`items.${index}.description` as const, {
									required: "Description is required",
								})}
								error={errors.items?.[index]?.description?.message}
							/>
							<div className="ui-row ui-invoice-item__actions">
								<Input
									label="Qty"
									type="number"
									min={0}
									step={1}
									{...register(`items.${index}.quantity` as const, {
										valueAsNumber: true,
									})}
									error={errors.items?.[index]?.quantity?.message}
								/>
								<Input
									label="Price"
									type="number"
									min={0}
									step={0.01}
									{...register(`items.${index}.price` as const, {
										valueAsNumber: true,
									})}
									error={errors.items?.[index]?.price?.message}
								/>
								<Button
									type="button"
									variant="ghost"
									onClick={() => remove(index)}
									aria-label="Remove line item"
									title="Remove"
								>
									<Trash2 size={16} aria-hidden="true" />
								</Button>
							</div>
						</div>
						{taxStrategy === "item" && taxRates.length > 0 ? (
							<div className="ui-grid ui-grid--2">
								<label className="ui-stack ui-stack--xs">
									<span className="ui-muted">Tax rate</span>
									<select
										className="ui-input"
										{...register(`items.${index}.taxRateId` as const)}
										defaultValue=""
									>
										<option value="">No tax</option>
										{taxRates.map((rate) => (
											<option key={rate.id} value={rate.id}>
												{rate.name} ({rate.ratePct}%)
											</option>
										))}
									</select>
								</label>
								<div />
							</div>
						) : null}
					</div>
				))}
			</div>

			<div className="ui-grid ui-grid--2">
				<label className="ui-stack ui-stack--xs">
					<span className="ui-muted">Tax strategy</span>
					<select className="ui-input" {...register("taxStrategy")}>
						<option value="invoice">Flat invoice tax</option>
						<option value="item" disabled={taxRates.length === 0}>
							Per-item tax {taxRates.length === 0 ? "(create tax rates first)" : ""}
						</option>
					</select>
				</label>
				{taxStrategy === "invoice" ? (
					<Input
						label="Tax (%)"
						type="number"
						min={0}
						step={0.01}
						{...register("tax", { valueAsNumber: true })}
					/>
				) : (
					<div />
				)}
			</div>

			<Input label="Notes" {...register("notes")} />
			<Input label="Terms" {...register("terms")} />
		</Card>
	);
};

export default InvoiceForm;
