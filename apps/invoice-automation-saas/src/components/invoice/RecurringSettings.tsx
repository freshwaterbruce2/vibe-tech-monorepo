import Card from "../common/Card";
import Input from "../common/Input";

export interface RecurringSettingsValue {
	enabled: boolean;
	frequency: "weekly" | "monthly" | "quarterly" | "yearly";
	interval: number;
}

interface RecurringSettingsProps {
	value: RecurringSettingsValue;
	onChange: (next: RecurringSettingsValue) => void;
}

const RecurringSettings = ({
	value,
	onChange,
}: RecurringSettingsProps) => {
	return (
		<Card className="ui-stack ui-stack--md">
			<div className="ui-row" style={{ justifyContent: "space-between" }}>
				<h2 className="ui-h1" style={{ fontSize: "1.125rem" }}>
					Recurring billing
				</h2>
				<label className="ui-toggle">
					<input
						type="checkbox"
						checked={value.enabled}
						onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
					/>
					<span className="ui-toggle__track" aria-hidden="true" />
					<span className="ui-muted">{value.enabled ? "Enabled" : "Off"}</span>
				</label>
			</div>

			{!value.enabled ? (
				<p className="ui-muted">
					Turn this on to auto-generate invoices on a schedule.
				</p>
			) : (
				<div className="ui-grid ui-grid--2">
					<div className="ui-field">
						<label className="ui-label" htmlFor="recurring-frequency">
							Frequency
						</label>
						<select
							id="recurring-frequency"
							className="ui-input"
							value={value.frequency}
							onChange={(e) =>
								onChange({
									...value,
									frequency: e.target
										.value as RecurringSettingsValue["frequency"],
								})
							}
						>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="quarterly">Quarterly</option>
							<option value="yearly">Yearly</option>
						</select>
					</div>
					<Input
						label="Interval"
						type="number"
						min={1}
						value={value.interval}
						onChange={(e) =>
							onChange({
								...value,
								interval: Number.isFinite(e.target.valueAsNumber)
									? e.target.valueAsNumber
									: 1,
							})
						}
						hint="E.g. every 2 months."
					/>
				</div>
			)}
		</Card>
	);
};

export default RecurringSettings;
