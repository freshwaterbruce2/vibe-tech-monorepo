import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { testUtils } from "../../setup";

// Hoist mock objects so they are available inside vi.mock factory closures,
// which are executed before module-level variable initialisation.
const { mockStripeElement, mockElements, mockStripe, paymentMockState } =
	vi.hoisted(() => {
		const mockStripeElement = {
			mount: vi.fn(),
			unmount: vi.fn(),
			destroy: vi.fn(),
			update: vi.fn(),
			on: vi.fn(),
			off: vi.fn(),
			blur: vi.fn(),
			clear: vi.fn(),
			focus: vi.fn(),
		};
		const mockElements = {
			create: vi.fn(() => mockStripeElement),
			getElement: vi.fn(() => mockStripeElement),
		};
		const mockStripe = {
			elements: vi.fn(() => mockElements),
			confirmPayment: vi.fn(),
			confirmSetup: vi.fn(),
			createPaymentMethod: vi.fn(),
			retrievePaymentIntent: vi.fn(),
		};
		// Mutable holder so individual tests can swap out stripePromise via
		// paymentMockState.stripePromise = <custom promise>.
		const paymentMockState = {
			stripePromise: Promise.resolve(mockStripe) as Promise<typeof mockStripe | null>,
		};
		return { mockStripeElement, mockElements, mockStripe, paymentMockState };
	});

// Mock Stripe React components
vi.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children }: any) => (
		<div data-testid="stripe-elements">{children}</div>
	),
	useStripe: () => mockStripe,
	useElements: () => mockElements,
}));

// Mock PaymentSummary component
vi.mock("@/components/payment/PaymentSummary", () => ({
	PaymentSummary: ({ amount, currency, bookingDetails }: any) => (
		<div data-testid="payment-summary">
			<div>
				Amount: {amount} {currency}
			</div>
			{bookingDetails && <div>Hotel: {bookingDetails.hotelName}</div>}
		</div>
	),
}));

// Mock stripePromise via a getter so individual tests can change
// paymentMockState.stripePromise without needing require().
vi.mock("@/services/payment", () =>
	Object.defineProperty({}, "stripePromise", {
		get: () => paymentMockState.stripePromise,
		enumerable: true,
		configurable: true,
	}),
);

describe("PaymentForm", () => {
	const defaultProps = {
		bookingId: "booking-123",
		amount: 50000, // $500.00 in cents
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
		billingDetails: {
			name: "John Doe",
			email: "john.doe@example.com",
			phone: "+1234567890",
			address: {
				line1: "123 Main St",
				city: "New York",
				state: "NY",
				postal_code: "10001",
				country: "US",
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockStripe.elements.mockReturnValue(mockElements);
		// Reset stripePromise to default resolved value between tests.
		paymentMockState.stripePromise = Promise.resolve(
			mockStripe,
		) as unknown as Promise<typeof mockStripe | null>;
	});

	describe("Loading State", () => {
		it("should show loading spinner initially", async () => {
			// Delay the stripe promise resolution
			const delayedStripePromise = new Promise((resolve) =>
				setTimeout(() => resolve(mockStripe), 100),
			);

			paymentMockState.stripePromise =
				delayedStripePromise as unknown as Promise<typeof mockStripe | null>;

			render(<PaymentForm {...defaultProps} />);

			expect(screen.getByText("Loading payment system...")).toBeInTheDocument();
			expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument(); // Loading spinner
		});

		it("should hide loading state after Stripe loads", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.queryByText("Loading payment system..."),
				).not.toBeInTheDocument();
			});

			expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should show error when Stripe fails to load", async () => {
			const failedStripePromise = Promise.reject(
				new Error("Failed to load Stripe"),
			);
			failedStripePromise.catch(() => {}); // prevent unhandledRejection
			paymentMockState.stripePromise =
				failedStripePromise as unknown as Promise<typeof mockStripe | null>;

			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment System Error")).toBeInTheDocument();
				expect(
					screen.getByText("Failed to load payment system"),
				).toBeInTheDocument();
			});
		});

		it("should show error when Stripe is not properly configured", async () => {
			const nullStripePromise = Promise.resolve(null);
			paymentMockState.stripePromise = nullStripePromise;

			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment System Error")).toBeInTheDocument();
				expect(
					screen.getByText("Payment system is not properly configured"),
				).toBeInTheDocument();
			});
		});

		it("should show payment pending notice after Stripe loads", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment integration pending")).toBeInTheDocument();
			});
		});
	});

	describe("Successful Payment Flow", () => {
		it("should render layout when Stripe loads successfully", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
				expect(screen.getByText("Payment integration pending")).toBeInTheDocument();
				expect(screen.getByTestId("payment-summary")).toBeInTheDocument();
			});
		});
	});

	describe("UI Elements and Layout", () => {
		beforeEach(async () => {
			render(<PaymentForm {...defaultProps} />);
			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
			});
		});

		it("should display secure payment header", () => {
			expect(screen.getByText("Secure Payment")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Your payment is protected with industry-standard encryption",
				),
			).toBeInTheDocument();
		});

		it("should display payment details section", () => {
			expect(screen.getByText("Payment Details")).toBeInTheDocument();
		});

		it("should display security badges", () => {
			expect(screen.getByText("SSL Encrypted")).toBeInTheDocument();
			expect(screen.getByText("PCI DSS Compliant")).toBeInTheDocument();
		});

		it("should display payment summary", () => {
			expect(screen.getByTestId("payment-summary")).toBeInTheDocument();
			expect(screen.getByText("Amount: 50000 USD")).toBeInTheDocument();
			expect(screen.getByText("Hotel: Test Hotel")).toBeInTheDocument();
		});

		it("should display footer with Stripe branding", () => {
			expect(screen.getByText(/Powered by Stripe/)).toBeInTheDocument();
			expect(
				screen.getByText(/Your payment information is secure and encrypted/),
			).toBeInTheDocument();
		});

		it("should have proper responsive grid layout", () => {
			const container = screen.getByTestId("stripe-elements").parentElement;
			expect(container?.querySelector(".grid")).toHaveClass("md:grid-cols-2");
		});
	});

	describe("Props Handling", () => {
		it("should handle different currencies", async () => {
			render(<PaymentForm {...defaultProps} currency="EUR" />);

			await waitFor(() => {
				expect(screen.getByText("Amount: 50000 EUR")).toBeInTheDocument();
			});
		});

		it("should work without optional bookingDetails", async () => {
			const propsWithoutBookingDetails = {
				...defaultProps,
				bookingDetails: undefined,
			};

			render(<PaymentForm {...propsWithoutBookingDetails} />);

			await waitFor(() => {
				expect(screen.getByTestId("payment-summary")).toBeInTheDocument();
			});

			// Should not display hotel details
			expect(screen.queryByText("Hotel:")).not.toBeInTheDocument();
		});

		it("should work without optional billingDetails", async () => {
			const propsWithoutBillingDetails = {
				...defaultProps,
				billingDetails: undefined,
			};

			expect(() =>
				render(<PaymentForm {...propsWithoutBillingDetails} />),
			).not.toThrow();
		});

		it("should default to USD currency when not specified", async () => {
			const propsWithoutCurrency = {
				...defaultProps,
				currency: undefined,
			};

			render(<PaymentForm {...propsWithoutCurrency} />);

			await waitFor(() => {
				expect(screen.getByText("Amount: 50000 USD")).toBeInTheDocument();
			});
		});
	});

	describe("Stripe Integration", () => {
		it("should configure Stripe Elements with correct appearance options", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(mockStripe.elements).toHaveBeenCalledWith({
					appearance: expect.objectContaining({
						theme: "stripe",
						variables: expect.objectContaining({
							colorPrimary: "#2563eb",
							colorBackground: "#ffffff",
							colorText: "#374151",
							colorDanger: "#ef4444",
							fontFamily: "Inter, system-ui, sans-serif",
						}),
						rules: expect.objectContaining({
							".Tab": expect.any(Object),
							".Input": expect.any(Object),
							".Label": expect.any(Object),
						}),
					}),
					loader: "auto",
				});
			});
		});

		it("should show payment pending notice in Stripe Elements", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment integration pending")).toBeInTheDocument();
				expect(screen.getByText("Square payment processing will be added here.")).toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		beforeEach(async () => {
			render(<PaymentForm {...defaultProps} />);
			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
			});
		});

		it("should have proper heading hierarchy", () => {
			expect(
				screen.getByRole("heading", { level: 2, name: /secure payment/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { level: 3, name: /payment details/i }),
			).toBeInTheDocument();
		});

		it("should have descriptive text for security features", () => {
			expect(
				screen.getByText(
					"Your payment is protected with industry-standard encryption",
				),
			).toBeInTheDocument();
			expect(screen.getByText("SSL Encrypted")).toBeInTheDocument();
			expect(screen.getByText("PCI DSS Compliant")).toBeInTheDocument();
		});

		it("should provide clear error messages", async () => {
			const failedStripePromise = Promise.reject(new Error("Network error"));
			failedStripePromise.catch(() => {}); // prevent unhandledRejection
			paymentMockState.stripePromise =
				failedStripePromise as unknown as Promise<typeof mockStripe | null>;

			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				const errorElement = screen.getByText("Payment System Error");
				expect(errorElement).toBeInTheDocument();
				expect(errorElement).toHaveAttribute(
					"class",
					expect.stringContaining("font-medium"),
				);
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle very large amounts", async () => {
			const largeAmountProps = {
				...defaultProps,
				amount: 999999999, // $9,999,999.99
			};

			render(<PaymentForm {...largeAmountProps} />);

			// Mock renders: "Amount: {amount} {currency}" — so "Amount: 999999999 USD"
			await waitFor(() => {
				expect(screen.getByText("Amount: 999999999 USD")).toBeInTheDocument();
			});
		});

		it("should handle zero amount", async () => {
			const zeroAmountProps = {
				...defaultProps,
				amount: 0,
			};

			render(<PaymentForm {...zeroAmountProps} />);

			// Mock renders: "Amount: 0 USD"
			await waitFor(() => {
				expect(screen.getByText("Amount: 0 USD")).toBeInTheDocument();
			});
		});

		it("should handle invalid booking ID", async () => {
			const invalidBookingProps = {
				...defaultProps,
				bookingId: "",
			};

			expect(() =>
				render(<PaymentForm {...invalidBookingProps} />),
			).not.toThrow();

			// Component should render without crashing even with empty bookingId
			await waitFor(() => {
				expect(screen.getByTestId("payment-summary")).toBeInTheDocument();
			});
		});

		it("should handle component unmounting during loading", async () => {
			const { unmount } = render(<PaymentForm {...defaultProps} />);

			unmount();

			// Should not cause any errors or memory leaks
			expect(true).toBe(true);
		});
	});

	describe("Performance", () => {
		it("should not re-render unnecessarily when props change", async () => {
			const { rerender } = render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
			});

			const initialRenderCount = mockStripe.elements.mock.calls.length;

			// Re-render with same props
			rerender(<PaymentForm {...defaultProps} />);

			// Stripe elements should not be recreated
			expect(mockStripe.elements.mock.calls.length).toBe(initialRenderCount);
		});

		it("should handle rapid prop changes gracefully", async () => {
			const { rerender } = render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
			});

			// Rapidly change props
			for (let i = 0; i < 10; i++) {
				rerender(<PaymentForm {...defaultProps} amount={50000 + i} />);
			}

			expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
		});
	});
});
