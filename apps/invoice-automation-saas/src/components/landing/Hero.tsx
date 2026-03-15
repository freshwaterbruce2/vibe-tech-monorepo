import { ArrowRight, Zap } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Card from "../common/Card";

const Hero = () => {
	return (
		<section className="ui-hero">
			<div className="ui-container ui-hero__grid">
				<div className="ui-stack ui-stack--md">
					<div className="ui-pill">
						<Zap size={16} aria-hidden="true" />
						<span>Automate invoices in minutes</span>
					</div>
					<h1 className="ui-hero__title">
						Invoice automation that helps you get paid faster
					</h1>
					<p className="ui-text ui-hero__subtitle">
						Create invoices, send payment links, and set up recurring billing.
						Built for small teams who want less busywork and more cash flow.
					</p>
					<div className="ui-row">
						<Link to="/signup">
							<Button size="lg">
								Get started <ArrowRight size={16} aria-hidden="true" />
							</Button>
						</Link>
						<Link to="/login">
							<Button variant="ghost" size="lg">
								Log in
							</Button>
						</Link>
					</div>
					<div className="ui-muted">No credit card required to start.</div>
				</div>

				<Card className="ui-hero__card">
					<div className="ui-stack ui-stack--md">
						<div className="ui-muted">Preview</div>
						<div className="ui-invoice">
							<div
								className="ui-row"
								style={{ justifyContent: "space-between" }}
							>
								<strong>Invoice</strong>
								<span className="ui-muted">#INV-1024</span>
							</div>
							<div className="ui-invoice__line" />
							<div className="ui-stack ui-stack--md">
								<div
									className="ui-row"
									style={{ justifyContent: "space-between" }}
								>
									<span>Website design</span>
									<span>$2,000.00</span>
								</div>
								<div
									className="ui-row"
									style={{ justifyContent: "space-between" }}
								>
									<span>Maintenance</span>
									<span>$200.00</span>
								</div>
							</div>
							<div className="ui-invoice__line" />
							<div
								className="ui-row"
								style={{ justifyContent: "space-between" }}
							>
								<strong>Total</strong>
								<strong>$2,200.00</strong>
							</div>
							<Button style={{ width: "100%" }}>Pay invoice</Button>
						</div>
					</div>
				</Card>
			</div>
		</section>
	);
};

export default Hero;
