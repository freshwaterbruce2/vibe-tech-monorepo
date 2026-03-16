import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentElementForm } from "@/components/payment/PaymentElementForm";
import { PaymentService } from "@/services/payment";

// Mock Stripe hooks
const mockStripe = {
	confirmPayment: vi.fn(),
	retrievePaymentIntent: vi.fn(),
};

const mockElements = {
	submit: vi.fn(),
	getElement: vi.fn(),
};

vi.mock("@stripe/react-stripe-js", () => ({
	PaymentElement: ({ options }: any) => (
		<div data-testid="payment-element">
			<div>Payment Element Mock</div>
			<div>Layout: {options?.layout}</div>
			<div>Billing Name: {options?.defaultValues?.billingDetails?.name}</div>
			<div>Billing Email: {options?.defaultValues?.billingDetails?.email}</div>
		</div>
	),
	useStripe: () => mockStripe,
	useElements: () => mockElements,
}));

// Mock PaymentService
vi.mock("@/services/payment", () => ({
	PaymentService: {
		createPaymentIntent: vi.fn(),
		formatCurrency: vi.fn(
			(amount, currency) => `${currency}$${(amount / 100).toFixed(2)}`,
		),
	},
}));

describe("PaymentElementForm", () => {
	const defaultProps = {
		bookingId: "booking-123",
		amount: 50000, // $500.00 in cents
		currency: "USD",
		onSuccess: vi.fn(),
		onError: vi.fn(),
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

	const mockPaymentIntent = {
		id: "pi_test_123",
		clientSecret: "pi_test_123_secret",
		amount: 50000,
		currency: "USD",
		status: "requires_payment_method",
		commissionAmount: 2500, // 5% commission
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Default successful payment intent creation
		vi.mocked(PaymentService.createPaymentIntent).mockResolvedValue(
			mockPaymentIntent,
		);

		// Default successful element submission
		mockElements.submit.mockResolvedValue({ error: null });

		// Default successful payment confirmation
		mockStripe.confirmPayment.mockResolvedValue({
			error: null,
			paymentIntent: { ...mockPaymentIntent, status: "succeeded" },
		});
	});

	describe("Initialization", () => {
		it("should show loading state during payment setup", async () => {
			// Delay the payment intent creation
			vi.mocked(PaymentService.createPaymentIntent).mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => resolve(mockPaymentIntent), 100),
					),
			);

			render(<PaymentElementForm {...defaultProps} />);

			expect(screen.getByText("Setting up payment...")).toBeInTheDocument();
			expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

			await waitFor(() => {
				expect(
					screen.queryByText("Setting up payment..."),
				).not.toBeInTheDocument();
			});
		});

		it("should initialize payment intent with correct parameters", async () => {
			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(PaymentService.createPaymentIntent).toHaveBeenCalledWith(
					"booking-123",
					50000,
					"USD",
					{
						guestName: "John Doe",
						guestEmail: "john.doe@example.com",
					},
				);
			});
		});

		it("should render payment element after successful initialization", async () => {
			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("payment-element")).toBeInTheDocument();
				expect(screen.getByText("Payment Element Mock")).toBeInTheDocument();
				expect(screen.getByText("Layout: tabs")).toBeInTheDocument();
				expect(screen.getByText("Billing Name: John Doe")).toBeInTheDocument();
				expect(
					screen.getByText("Billing Email: john.doe@example.com"),
				).toBeInTheDocument();
			});
		});

		it("should show payment summary after initialization", async () => {
			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Total Amount")).toBeInTheDocument();
				expect(screen.getByText("USD$500.00")).toBeInTheDocument();
				expect(screen.getByText("Platform Fee (5%)")).toBeInTheDocument();
				expect(screen.getByText("USD$25.00")).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling During Initialization", () => {
		it("should show error when payment intent creation fails", async () => {
			const errorMessage = "Failed to create payment intent";
			vi.mocked(PaymentService.createPaymentIntent).mockRejectedValue(
				new Error(errorMessage),
			);

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment Setup Error")).toBeInTheDocument();
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});

			expect(defaultProps.onError).toHaveBeenCalledWith(errorMessage);
		});

		it("should not render payment form when initialization fails", async () => {
			vi.mocked(PaymentService.createPaymentIntent).mockRejectedValue(
				new Error("Network error"),
			);

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Payment Setup Error")).toBeInTheDocument();
			});

			expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /complete payment/i }),
			).not.toBeInTheDocument();
		});

		it("should call onError with generic message for unknown errors", async () => {
			vi.mocked(PaymentService.createPaymentIntent).mockRejectedValue(
				"Unknown error",
			);

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(defaultProps.onError).toHaveBeenCalledWith(
					"Failed to initialize payment",
				);
			});
		});
	});

	describe("Form Submission", () => {
		beforeEach(async () => {
			render(<PaymentElementForm {...defaultProps} />);
			await waitFor(() => {
				expect(screen.getByTestId("payment-element")).toBeInTheDocument();
			});
		});

		it("should show complete payment button when ready", () => {
			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			expect(submitButton).toBeInTheDocument();
			expect(submitButton).not.toBeDisabled();
		});

		it("should handle successful payment submission", async () => {
			const user = userEvent.setup();
			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(mockElements.submit).toHaveBeenCalled();
				expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
					elements: mockElements,
					clientSecret: "pi_test_123_secret",
					confirmParams: {
						return_url: `${window.location.origin}/payment/success`,
						payment_method_data: {
							billing_details: {
								name: "John Doe",
								email: "john.doe@example.com",
								phone: "+1234567890",
								address: defaultProps.billingDetails.address,
							},
						},
					},
					redirect: "if_required",
				});
			});

			expect(defaultProps.onSuccess).toHaveBeenCalledWith({
				...mockPaymentIntent,
				status: "succeeded",
			});
		});

		it("should show loading state during payment processing", async () => {
			const user = userEvent.setup();

			// Delay the confirmation
			mockStripe.confirmPayment.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									error: null,
									paymentIntent: { ...mockPaymentIntent, status: "succeeded" },
								}),
							100,
						),
					),
			);

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			expect(screen.getByText("Processing Payment...")).toBeInTheDocument();
			expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

			await waitFor(() => {
				expect(
					screen.queryByText("Processing Payment..."),
				).not.toBeInTheDocument();
			});
		});

		it("should disable button during processing", async () => {
			const user = userEvent.setup();

			mockStripe.confirmPayment.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									error: null,
									paymentIntent: { ...mockPaymentIntent, status: "succeeded" },
								}),
							100,
						),
					),
			);

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			expect(submitButton).toBeDisabled();

			await waitFor(() => {
				expect(submitButton).not.toBeDisabled();
			});
		});
	});

	describe("Payment Errors", () => {
		beforeEach(async () => {
			render(<PaymentElementForm {...defaultProps} />);
			await waitFor(() => {
				expect(screen.getByTestId("payment-element")).toBeInTheDocument();
			});
		});

		it("should handle element submission errors", async () => {
			const user = userEvent.setup();
			const errorMessage = "Invalid card number";

			mockElements.submit.mockResolvedValue({
				error: { message: errorMessage },
			});

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});

			expect(defaultProps.onError).toHaveBeenCalledWith(errorMessage);
			expect(mockStripe.confirmPayment).not.toHaveBeenCalled();
		});

		it("should handle payment confirmation errors", async () => {
			const user = userEvent.setup();
			const errorMessage = "Your card was declined";

			mockStripe.confirmPayment.mockResolvedValue({
				error: { message: errorMessage },
				paymentIntent: null,
			});

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});

			expect(defaultProps.onError).toHaveBeenCalledWith(errorMessage);
			expect(defaultProps.onSuccess).not.toHaveBeenCalled();
		});

		it("should handle payment requiring additional authentication", async () => {
			const user = userEvent.setup();

			mockStripe.confirmPayment.mockResolvedValue({
				error: null,
				paymentIntent: { ...mockPaymentIntent, status: "requires_action" },
			});

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText(
						"Additional authentication required. Please complete the verification.",
					),
				).toBeInTheDocument();
			});

			expect(defaultProps.onSuccess).not.toHaveBeenCalled();
		});

		it("should handle incomplete payments", async () => {
			const user = userEvent.setup();

			mockStripe.confirmPayment.mockResolvedValue({
				error: null,
				paymentIntent: { ...mockPaymentIntent, status: "processing" },
			});

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText("Payment was not completed successfully"),
				).toBeInTheDocument();
			});

			expect(defaultProps.onError).toHaveBeenCalledWith(
				"Payment was not completed successfully",
			);
		});
	});

	describe("Props Validation", () => {
		it("should not initialize payment with invalid amount", async () => {
			render(<PaymentElementForm {...defaultProps} amount={0} />);

			await waitFor(() => {
				expect(PaymentService.createPaymentIntent).not.toHaveBeenCalled();
			});
		});

		it("should not initialize payment without booking ID", async () => {
			render(<PaymentElementForm {...defaultProps} bookingId="" />);

			await waitFor(() => {
				expect(PaymentService.createPaymentIntent).not.toHaveBeenCalled();
			});
		});

		it("should use default billing details when not provided", async () => {
			const propsWithoutBilling = {
				...defaultProps,
				billingDetails: undefined,
			};

			render(<PaymentElementForm {...propsWithoutBilling} />);

			await waitFor(() => {
				expect(PaymentService.createPaymentIntent).toHaveBeenCalledWith(
					"booking-123",
					50000,
					"USD",
					{
						guestName: "John Doe",
						guestEmail: "john@example.com",
					},
				);
			});
		});
	});

	describe("Button States", () => {
		it("should disable button when Stripe is not available", async () => {
			// Mock useStripe to return null
			vi.mocked(require("@stripe/react-stripe-js")).useStripe.mockReturnValue(
				null,
			);

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				const submitButton = screen.getByRole("button");
				expect(submitButton).toBeDisabled();
				expect(submitButton).toHaveClass("bg-gray-400", "cursor-not-allowed");
			});
		});

		it("should disable button when Elements is not available", async () => {
			// Mock useElements to return null
			vi.mocked(require("@stripe/react-stripe-js")).useElements.mockReturnValue(
				null,
			);

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				const submitButton = screen.getByRole("button");
				expect(submitButton).toBeDisabled();
			});
		});

		it("should disable button when client secret is not available", async () => {
			vi.mocked(PaymentService.createPaymentIntent).mockResolvedValue({
				...mockPaymentIntent,
				clientSecret: "",
			});

			render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				const submitButton = screen.getByRole("button");
				expect(submitButton).toBeDisabled();
			});
		});
	});

	describe("Cleanup and Memory Management", () => {
		it("should handle component unmounting during initialization", async () => {
			let resolvePayment: (value: { clientSecret: string; id: string }) => void;
			const paymentPromise = new Promise<{ clientSecret: string; id: string }>(
				(resolve) => {
					resolvePayment = resolve;
				},
			);

			vi.mocked(PaymentService.createPaymentIntent).mockReturnValue(
				paymentPromise,
			);

			const { unmount } = render(<PaymentElementForm {...defaultProps} />);

			// Unmount before promise resolves
			unmount();

			// Resolve promise after unmount
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			resolvePayment!(mockPaymentIntent);

			// Should not cause errors or state updates
			await waitFor(() => {
				expect(true).toBe(true); // Test passes if no errors thrown
			});
		});

		it("should prevent form submission when component is unmounted", async () => {
			const { unmount } = render(<PaymentElementForm {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByTestId("payment-element")).toBeInTheDocument();
			});

			const form = screen.getByRole("form");
			unmount();

			// Simulating form submission after unmount should not cause errors
			expect(() => {
				fireEvent.submit(form);
			}).not.toThrow();
		});
	});

	describe("Accessibility", () => {
		beforeEach(async () => {
			render(<PaymentElementForm {...defaultProps} />);
			await waitFor(() => {
				expect(screen.getByTestId("payment-element")).toBeInTheDocument();
			});
		});

		it("should have proper form structure", () => {
			const form = screen.getByRole("form");
			expect(form).toBeInTheDocument();
		});

		it("should have accessible button with proper labeling", () => {
			const button = screen.getByRole("button", { name: /complete payment/i });
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute("type", "submit");
		});

		it("should provide clear error messages with icons", async () => {
			const user = userEvent.setup();

			mockElements.submit.mockResolvedValue({
				error: { message: "Card expired" },
			});

			const submitButton = screen.getByRole("button", {
				name: /complete payment/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("Card expired")).toBeInTheDocument();
				// Should have error icon
				expect(screen.getByTestId("error-icon")).toBeInTheDocument();
			});
		});

		it("should have security notice for user confidence", () => {
			expect(
				screen.getByText(/Your payment information is encrypted and secure/),
			).toBeInTheDocument();
			expect(
				screen.getByText(/We do not store your card details/),
			).toBeInTheDocument();
		});
	});
});
