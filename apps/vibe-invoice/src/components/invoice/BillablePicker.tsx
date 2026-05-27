import { useEffect, useState } from "react";
import { formatCurrency } from "../../lib/currency";
import { expenseService, type Expense } from "../../services/expenseService";
import { timeService, type TimeEntry } from "../../services/timeService";
import Card from "../common/Card";

interface BillablePickerProps {
	currency: string;
	selectedExpenseIds: string[];
	onChangeExpenseIds: (ids: string[]) => void;
	selectedTimeEntryIds: string[];
	onChangeTimeEntryIds: (ids: string[]) => void;
}

const BillablePicker = ({
	currency,
	selectedExpenseIds,
	onChangeExpenseIds,
	selectedTimeEntryIds,
	onChangeTimeEntryIds,
}: BillablePickerProps) => {
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			expenseService.listExpenses({ unbilled: true }),
			timeService.listEntries({ unbilled: true }),
		])
			.then(([exps, entries]) => {
				if (cancelled) return;
				setExpenses(exps);
				setTimeEntries(entries);
				setError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Failed to load");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const toggleExpense = (id: string) => {
		const next = selectedExpenseIds.includes(id)
			? selectedExpenseIds.filter((x) => x !== id)
			: [...selectedExpenseIds, id];
		onChangeExpenseIds(next);
	};

	const toggleTimeEntry = (id: string) => {
		const next = selectedTimeEntryIds.includes(id)
			? selectedTimeEntryIds.filter((x) => x !== id)
			: [...selectedTimeEntryIds, id];
		onChangeTimeEntryIds(next);
	};

	if (loading) return <Card>Loading billable items…</Card>;
	if (error) return <Card><div className="ui-error">{error}</div></Card>;
	if (expenses.length === 0 && timeEntries.length === 0) return null;

	return (
		<Card className="ui-stack ui-stack--md">
			<h3 style={{ fontWeight: 700 }}>Pull from unbilled items</h3>

			{expenses.length > 0 ? (
				<div className="ui-stack ui-stack--xs">
					<div className="ui-muted" style={{ fontSize: "0.875rem" }}>
						Expenses ({expenses.length})
					</div>
					{expenses.map((exp) => (
						<label
							key={exp.id}
							className="ui-row"
							style={{ gap: 8, alignItems: "center" }}
						>
							<input
								type="checkbox"
								checked={selectedExpenseIds.includes(exp.id)}
								onChange={() => toggleExpense(exp.id)}
							/>
							<span style={{ flex: 1 }}>
								{exp.description ?? exp.vendor ?? "Expense"} —{" "}
								{exp.expenseDate}
							</span>
							<span>{formatCurrency(exp.amount, currency)}</span>
						</label>
					))}
				</div>
			) : null}

			{timeEntries.length > 0 ? (
				<div className="ui-stack ui-stack--xs">
					<div className="ui-muted" style={{ fontSize: "0.875rem" }}>
						Time entries ({timeEntries.length})
					</div>
					{timeEntries.map((te) => {
						const hours = (te.durationSeconds ?? 0) / 3600;
						const total = hours * (te.hourlyRate ?? 0);
						return (
							<label
								key={te.id}
								className="ui-row"
								style={{ gap: 8, alignItems: "center" }}
							>
								<input
									type="checkbox"
									checked={selectedTimeEntryIds.includes(te.id)}
									onChange={() => toggleTimeEntry(te.id)}
								/>
								<span style={{ flex: 1 }}>
									{hours.toFixed(2)}h @ {formatCurrency(te.hourlyRate ?? 0, currency)}/h —{" "}
									{te.startedAt.slice(0, 10)}
								</span>
								<span>{formatCurrency(total, currency)}</span>
							</label>
						);
					})}
				</div>
			) : null}
		</Card>
	);
};

export default BillablePicker;
