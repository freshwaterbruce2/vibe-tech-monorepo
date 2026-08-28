import { CalendarClock, CreditCard, FileText, ShieldCheck } from "lucide-react";
import Card from "../common/Card";

const features = [
	{
		title: "Recurring billing",
		description:
			"Automatically generate invoices weekly, monthly, quarterly, or yearly.",
		Icon: CalendarClock,
	},
	{
		title: "Payment links",
		description: "Share a single link so clients can pay instantly by card.",
		Icon: CreditCard,
	},
	{
		title: "Professional templates",
		description: "Clean invoices with tax, line items, notes, and terms.",
		Icon: FileText,
	},
	{
		title: "Secure by default",
		description:
			"Auth, rate limiting hooks, and sensible defaults for production.",
		Icon: ShieldCheck,
	},
] as const;

const Features = () => {
	return (
		<section id="features" className="ui-section">
			<div className="ui-container">
				<div className="ui-section__header">
					<h2 className="ui-h1">Everything you need to invoice at scale</h2>
					<p className="ui-muted">
						Start simple, then grow into recurring payments and automation
						without rebuilding.
					</p>
				</div>

				<div className="ui-grid ui-grid--2">
					{features.map(({ title, description, Icon }) => (
						<Card key={title} className="ui-feature">
							<div className="ui-feature__icon">
								<Icon size={18} aria-hidden="true" />
							</div>
							<div className="ui-stack ui-stack--md">
								<h3 className="ui-feature__title">{title}</h3>
								<p className="ui-text">{description}</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
};

export default Features;
