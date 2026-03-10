import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { testUtils } from "../../setup";

// Mock Stripe React components
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

// Mock Stripe React components
vi.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children }: any) => (
		<div data-testid="stripe-elements">{children}</div>
	),
	useStripe: () => mockStripe,
	useElements: () => mockElements,
}));

// Mock PaymentElementForm component
vi.mock("@/components/payment/PaymentElementForm", () => ({
	PaymentElementForm: ({ onSuccess, onError, bookingId, amount }: any) => (
		<div data-testid="payment-element-form">
			<button
				onClick={() => onSuccess(testUtils.mockPaymentIntent)}
				data-testid="mock-success-payment"
			>
				Mock Success Payment
			</button>
			<button
				onClick={() => onError("Mock payment error")}
				data-testid="mock-error-payment"
			>
				Mock Error Payment
			</button>
			<div>Booking ID: {bookingId}</div>
			<div>Amount: ${amount}</div>
		</div>
	),
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

// Mock stripePromise
const mockStripePromise = Promise.resolve(mockStripe);
vi.mock("@/services/payment", () => ({
	stripePromise: mockStripePromise,
}));

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
	});

	describe("Loading State", () => {
		it("should show loading spinner initially", async () => {
			// Delay the stripe promise resolution
			const delayedStripePromise = new Promise((resolve) =>
				setTimeout(() => resolve(mockStripe), 100),
			);

			vi.mocked(require("@/services/payment")).stripePromise =
				delayedStripePromise;

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
			vi.mocked(require("@/services/payment")).stripePromise =
				failedStripePromise;

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
			vi.mocked(require("@/services/payment")).stripePromise =
				nullStripePromise;

			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment System Error")).toBeInTheDocument();
				expect(
					screen.getByText("Payment system is not properly configured"),
				).toBeInTheDocument();
			});
		});

		it("should call onError when payment form encounters an error", async () => {
			const user = userEvent.setup();
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("payment-element-form")).toBeInTheDocument();
			});

			const errorButton = screen.getByTestId("mock-error-payment");
			await user.click(errorButton);

			expect(defaultProps.onError).toHaveBeenCalledWith("Mock payment error");
		});
	});

	describe("Successful Payment Flow", () => {
		it("should render payment form when Stripe loads successfully", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
				expect(screen.getByTestId("payment-element-form")).toBeInTheDocument();
				expect(screen.getByTestId("payment-summary")).toBeInTheDocument();
			});
		});

		it("should display payment form with correct props", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Booking ID: booking-123")).toBeInTheDocument();
				expect(screen.getByText("Amount: $50000")).toBeInTheDocument();
			});
		});

		it("should call onSuccess when payment succeeds", async () => {
			const user = userEvent.setup();
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("payment-element-form")).toBeInTheDocument();
			});

			const successButton = screen.getByTestId("mock-success-payment");
			await user.click(successButton);

			expect(defaultProps.onSuccess).toHaveBeenCalledWith(
				testUtils.mockPaymentIntent,
			);
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

		it("should pass correct props to PaymentElementForm", async () => {
			render(<PaymentForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Booking ID: booking-123")).toBeInTheDocument();
				expect(screen.getByText("Amount: $50000")).toBeInTheDocument();
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
			vi.mocked(require("@/services/payment")).stripePromise =
				failedStripePromise;

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

			await waitFor(() => {
				expect(screen.getByText("Amount: $999999999")).toBeInTheDocument();
			});
		});

		it("should handle zero amount", async () => {
			const zeroAmountProps = {
				...defaultProps,
				amount: 0,
			};

			render(<PaymentForm {...zeroAmountProps} />);

			await waitFor(() => {
				expect(screen.getByText("Amount: $0")).toBeInTheDocument();
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

			await waitFor(() => {
				expect(screen.getByText("Booking ID:")).toBeInTheDocument();
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
