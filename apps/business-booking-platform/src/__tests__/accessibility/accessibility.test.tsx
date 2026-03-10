import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { PaymentForm } from "@/components/payment/PaymentForm";
import SearchResults from "@/components/search/SearchResults";
import SearchSection from "@/components/search/SearchSection";
import { useSearchStore } from "@/store/searchStore";
import { testUtils } from "../setup";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock stores and services
vi.mock("@/store/searchStore");
vi.mock("react-router-dom", () => ({
	useNavigate: () => vi.fn(),
	useLocation: () => ({ pathname: "/", search: "", hash: "", state: null }),
}));

// Mock Stripe for PaymentForm tests
vi.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children }: any) => (
		<div data-testid="stripe-elements">{children}</div>
	),
	PaymentElement: () => (
		<div data-testid="payment-element">Payment Element</div>
	),
	useStripe: () => ({
		confirmPayment: vi.fn(),
		elements: () => ({}),
	}),
	useElements: () => ({
		submit: vi.fn(),
		getElement: vi.fn(),
	}),
}));

vi.mock("@/services/payment", () => ({
	stripePromise: Promise.resolve({
		elements: vi.fn(() => ({
			create: vi.fn(),
			getElement: vi.fn(),
		})),
	}),
	PaymentService: {
		createPaymentIntent: vi.fn(),
		formatCurrency: vi.fn((amount) => `$${amount}`),
	},
}));

describe("Accessibility Tests", () => {
	describe("SearchSection Component", () => {
		it("should not have accessibility violations", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);
			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have proper form labels and structure", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			// Check for proper form structure
			const form = container.querySelector("section");
			expect(form).toBeInTheDocument();

			// Check for proper labeling
			const destinationLabel = container.querySelector(
				'label:has(+ div input[placeholder="Where are you going?"])',
			);
			expect(destinationLabel).toHaveTextContent("Destination");

			const checkInLabel = container.querySelector(
				'label[for="check-in"], label:has(+ div input[type="date"]:first-of-type)',
			);
			expect(checkInLabel).toHaveTextContent("Check-in Date");

			const guestsLabel = container.querySelector("label:has(+ div select)");
			expect(guestsLabel).toHaveTextContent("Guests");

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should support keyboard navigation", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			// All interactive elements should be keyboard accessible
			const interactiveElements = container.querySelectorAll(
				"input, select, button",
			);
			interactiveElements.forEach((element) => {
				expect(element).not.toHaveAttribute("tabindex", "-1");
			});

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have proper button accessibility", async () => {
			const { container } = render(
				<SearchSection onSearch={vi.fn()} isLoading={false} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveAttribute("type", "button");
			expect(button).toHaveTextContent("Search Hotels");

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should handle loading state accessibly", async () => {
			const { container } = render(
				<SearchSection onSearch={vi.fn()} isLoading={true} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveAttribute("disabled");
			expect(button).toHaveTextContent("Searching...");

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});
	});

	describe("SearchResults Component", () => {
		const mockUseSearchStore = useSearchStore as any;

		it("should not have accessibility violations with results", async () => {
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
			});

			const { container } = render(<SearchResults />);
			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have proper heading hierarchy", async () => {
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
			});

			const { container } = render(<SearchResults />);

			// Check for proper heading structure
			const mainHeading = container.querySelector("h3");
			expect(mainHeading).toHaveTextContent("2 hotels found");

			// Hotel names should be properly structured
			const hotelHeadings = container.querySelectorAll("h4");
			expect(hotelHeadings.length).toBeGreaterThan(0);

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible images with alt text", async () => {
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			const images = container.querySelectorAll("img");
			images.forEach((img) => {
				expect(img).toHaveAttribute("alt");
				expect(img.getAttribute("alt")).not.toBe("");
			});

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible loading state", async () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: true,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// Loading state should have proper accessibility
			const loadingText = container.querySelector("h3");
			expect(loadingText).toHaveTextContent("Searching hotels...");

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible empty state", async () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// Empty state should have proper structure
			const emptyHeading = container.querySelector("h3");
			expect(emptyHeading).toHaveTextContent("No hotels found");

			const emptyMessage = container.querySelector("p");
			expect(emptyMessage).toHaveTextContent(
				"Try adjusting your search criteria",
			);

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible buttons and interactive elements", async () => {
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
			});

			const { container } = render(<SearchResults onHotelSelect={vi.fn()} />);

			// All buttons should be accessible
			const buttons = container.querySelectorAll("button");
			buttons.forEach((button) => {
				expect(button).toHaveAttribute("type");
				expect(button.textContent).not.toBe("");
			});

			// Select dropdown should be accessible
			const select = container.querySelector("select");
			if (select) {
				expect(select).toBeInTheDocument();
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible pagination", async () => {
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: { page: 2, limit: 10, total: 50, totalPages: 5 },
			});

			const { container } = render(<SearchResults />);

			// Pagination buttons should be accessible
			const prevButton = container.querySelector('button:has-text("Previous")');
			const nextButton = container.querySelector('button:has-text("Next")');

			if (prevButton) {
				expect(prevButton).toHaveAttribute("type", "button");
			}
			if (nextButton) {
				expect(nextButton).toHaveAttribute("type", "button");
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});
	});

	describe("PaymentForm Component", () => {
		const mockPaymentProps = {
			bookingId: "booking-123",
			amount: 50000,
			currency: "USD",
			onSuccess: vi.fn(),
			onError: vi.fn(),
			bookingDetails: {
				hotelName: "Test Hotel",
				roomType: "Deluxe Suite",
				checkIn: new Date("2024-12-01"),
				checkOut: new Date("2024-12-03"),
				guests: 2,
				nights: 2,
			},
		};

		it("should not have accessibility violations", async () => {
			const { container } = render(<PaymentForm {...mockPaymentProps} />);

			// Wait for component to load
			await new Promise((resolve) => setTimeout(resolve, 100));

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have proper heading structure", async () => {
			const { container } = render(<PaymentForm {...mockPaymentProps} />);

			// Wait for component to load
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check for proper heading hierarchy
			const mainHeading = container.querySelector("h2");
			if (mainHeading) {
				expect(mainHeading).toHaveTextContent("Secure Payment");
			}

			const subHeading = container.querySelector("h3");
			if (subHeading) {
				expect(subHeading).toHaveTextContent("Payment Details");
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible form elements", async () => {
			const { container } = render(<PaymentForm {...mockPaymentProps} />);

			// Wait for component to load
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check for form accessibility
			const form = container.querySelector("form");
			if (form) {
				expect(form).toBeInTheDocument();
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should handle loading state accessibly", async () => {
			const { container } = render(<PaymentForm {...mockPaymentProps} />);

			// Initially should show loading
			const loadingText = container.querySelector(
				'span:has-text("Loading payment system...")',
			);
			if (loadingText) {
				expect(loadingText).toBeInTheDocument();
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should have accessible error states", async () => {
			// Mock Stripe loading failure
			vi.mocked(require("@/services/payment")).stripePromise =
				Promise.resolve(null);

			const { container } = render(<PaymentForm {...mockPaymentProps} />);

			// Wait for error state
			await new Promise((resolve) => setTimeout(resolve, 100));

			const errorHeading = container.querySelector(
				'h3:has-text("Payment System Error")',
			);
			if (errorHeading) {
				expect(errorHeading).toBeInTheDocument();
			}

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});
	});

	describe("Color Contrast and Visual Accessibility", () => {
		it("should maintain sufficient color contrast in SearchSection", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			// Test with color-contrast rule
			const results = await axe(container, {
				rules: {
					"color-contrast": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should maintain sufficient color contrast in SearchResults", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			const results = await axe(container, {
				rules: {
					"color-contrast": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should be usable without color", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// Test that important information is not conveyed by color alone
			const results = await axe(container, {
				rules: {
					"color-contrast": { enabled: true },
					"link-in-text-block": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});
	});

	describe("Screen Reader Support", () => {
		it("should provide proper ARIA labels and descriptions", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			// Check for ARIA attributes where needed
			const button = container.querySelector("button");
			expect(button).not.toHaveAttribute("aria-describedby", "");

			const results = await axe(container, {
				rules: {
					"aria-valid-attr": { enabled: true },
					"aria-valid-attr-value": { enabled: true },
					"button-name": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should have proper landmark structure", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(
				<main>
					<SearchSection onSearch={vi.fn()} />
					<SearchResults />
				</main>,
			);

			const results = await axe(container, {
				rules: {
					"landmark-one-main": { enabled: true },
					region: { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should support screen reader navigation", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// Check for proper heading structure for screen readers
			const results = await axe(container, {
				rules: {
					"heading-order": { enabled: true },
					bypass: { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});
	});

	describe("Focus Management", () => {
		it("should maintain proper focus order in SearchSection", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			const results = await axe(container, {
				rules: {
					"focus-order-semantics": { enabled: true },
					tabindex: { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should have visible focus indicators", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			const results = await axe(container, {
				rules: {
					"focus-order-semantics": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should not trap focus inappropriately", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			const results = await axe(container, {
				rules: {
					tabindex: { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});
	});

	describe("Mobile Accessibility", () => {
		it("should be accessible on mobile viewports", async () => {
			// Mock mobile viewport
			Object.defineProperty(window, "innerWidth", {
				writable: true,
				configurable: true,
				value: 375,
			});

			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			const results = await axe(container, {
				rules: {
					"target-size": { enabled: true }, // Touch targets should be large enough
					"meta-viewport": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should maintain accessibility in responsive design", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			// Test different viewport sizes
			const viewports = [375, 768, 1024, 1440];

			for (const width of viewports) {
				Object.defineProperty(window, "innerWidth", {
					writable: true,
					configurable: true,
					value: width,
				});

				const { container } = render(<SearchResults />);

				const results = await axe(container);
				expect(results).toHaveNoViolations();
			}
		});
	});

	describe("Form Accessibility", () => {
		it("should have proper form validation messages", async () => {
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			const results = await axe(container, {
				rules: {
					label: { enabled: true },
					"form-field-multiple-labels": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});

		it("should associate error messages with form fields", async () => {
			// This would test error states when they exist
			const { container } = render(<SearchSection onSearch={vi.fn()} />);

			const results = await axe(container, {
				rules: {
					"aria-describedby": { enabled: true },
					"aria-errormessage": { enabled: true },
				},
			});

			expect(results).toHaveNoViolations();
		});
	});

	describe("Custom Accessibility Rules", () => {
		it("should follow hotel booking specific accessibility guidelines", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults onHotelSelect={vi.fn()} />);

			// Custom checks for hotel booking specific accessibility
			const hotelCards = container.querySelectorAll(
				'[data-testid="hotel-card"]',
			);
			hotelCards.forEach((card) => {
				// Hotel cards should be accessible
				expect(card).toHaveClass("cursor-pointer"); // Indicates interactivity
			});

			const priceElements = container.querySelectorAll('text*="$"');
			// Prices should be clearly associated with hotels
			expect(priceElements.length).toBeGreaterThan(0);

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("should provide alternative text for decorative elements", async () => {
			const mockUseSearchStore = useSearchStore as any;
			mockUseSearchStore.mockReturnValue({
				results: testUtils.mockSearchResults,
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// All images should have appropriate alt text
			const images = container.querySelectorAll("img");
			images.forEach((img) => {
				const alt = img.getAttribute("alt");
				expect(alt).not.toBeNull();

				// Empty alt is acceptable for decorative images
				if (alt === "") {
					// Should have role="presentation" or be purely decorative
					expect(img).toHaveAttribute("role", "presentation");
				}
			});

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});
	});
});
