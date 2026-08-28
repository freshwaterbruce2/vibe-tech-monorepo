import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Card from "../common/Card";

interface PricingTier {
	name: string;
	price: string;
	subtitle: string;
	features: readonly string[];
	featured?: boolean;
}

const tiers: PricingTier[] = [
	{
		name: "Starter",
		price: "$0",
		subtitle: "For trying it out",
		features: ["Unlimited draft invoices", "Basic payment links", "PDF export"],
	},
	{
		name: "Pro",
		price: "$19",
		subtitle: "Per month, billed monthly",
		featured: true,
		features: [
			"Recurring billing",
			"Automated reminders",
			"Client directory",
			"Analytics events",
		],
	},
	{
		name: "Team",
		price: "$49",
		subtitle: "Per month, billed monthly",
		features: ["Multi-user access", "Advanced roles", "Priority support"],
	},
];

const Pricing = () => {
	return (
		<section id="pricing" className="ui-section ui-section--alt">
			<div className="ui-container">
				<div className="ui-section__header">
					<h2 className="ui-h1">Pricing that scales with your business</h2>
					<p className="ui-muted">
						Keep it simple. Upgrade when automation starts saving you time.
					</p>
				</div>

				<div className="ui-grid ui-grid--3">
					{tiers.map((tier) => (
						<Card
							key={tier.name}
							className={["ui-tier", tier.featured ? "ui-tier--featured" : ""]
								.filter(Boolean)
								.join(" ")}
						>
							<div className="ui-stack ui-stack--md">
								<div
									className="ui-row"
									style={{ justifyContent: "space-between" }}
								>
									<h3 className="ui-tier__name">{tier.name}</h3>
									{tier.featured ? (
										<span className="ui-badge">Most popular</span>
									) : null}
								</div>
								<div className="ui-tier__price">
									<span className="ui-tier__amount">{tier.price}</span>
									{tier.price !== "$0" ? (
										<span className="ui-muted">/mo</span>
									) : null}
								</div>
								<div className="ui-muted">{tier.subtitle}</div>

								<ul className="ui-list">
									{tier.features.map((feature) => (
										<li key={feature}>
											<Check size={16} aria-hidden="true" />
											<span>{feature}</span>
										</li>
									))}
								</ul>

								<Link to="/signup">
									<Button
										variant={tier.featured ? "primary" : "ghost"}
										style={{ width: "100%" }}
									>
										Start with {tier.name}
									</Button>
								</Link>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
};

export default Pricing;
