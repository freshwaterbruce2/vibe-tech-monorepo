import Navigation from "../components/common/Navigation";
import Features from "../components/landing/Features";
import Hero from "../components/landing/Hero";
import Pricing from "../components/landing/Pricing";

const Landing = () => {
	return (
		<div className="ui-page">
			<Navigation variant="public" />
			<main>
				<Hero />
				<Features />
				<Pricing />
			</main>
			<footer className="ui-footer">
				<div className="ui-container ui-footer__inner">
					<span className="ui-muted">
						© {new Date().getFullYear()} InvoiceFlow
					</span>
					<span className="ui-muted">
						Built locally in `apps/invoice-automation-saas`
					</span>
				</div>
			</footer>
		</div>
	);
};

export default Landing;
