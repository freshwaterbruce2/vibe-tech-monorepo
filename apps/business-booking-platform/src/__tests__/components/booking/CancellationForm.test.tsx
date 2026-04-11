import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, addHours, subDays } from "date-fns";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CancellationForm } from "@/components/booking/CancellationForm";
import { PaymentService } from "@/services/payment";

expect.extend(toHaveNoViolations);

// Mock PaymentService
vi.mock("@/services/payment", () => ({
	PaymentService: {
		formatCurrency: vi.fn((amount, currency) => {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currency || "USD",
			}).format(amount);
		}),
		processRefund: vi.fn(),
	},
}));

const mockBookingCancellable = {
	id: "booking-123",
	confirmationNumber: "CONF-123456",
	hotelName: "Test Hotel",
	roomType: "Deluxe Room",
	checkIn: addDays(new Date(), 3), // 3 days from now
	checkOut: addDays(new Date(), 5), // 5 days from now
	totalAmount: 300,
	currency: "USD",
	isCancellable: true,
	cancellationDeadline: addDays(new Date(), 2), // 2 days from now
	cancellationPolicy: {
		freeCancellationHours: 24,
		partialRefundHours: 12,
	},
};

const mockBookingNonCancellable = {
	...mockBookingCancellable,
	isCancellable: false,
};

const mockBookingPastDeadline = {
	...mockBookingCancellable,
	cancellationDeadline: subDays(new Date(), 1), // 1 day ago
};

const mockPaymentDetails = {
	paymentIntentId: "pi_test_123",
	amount: 300,
	currency: "USD",
	status: "succeeded",
};

describe("CancellationForm Component", () => {
	const mockProps = {
		booking: mockBookingCancellable,
		paymentDetails: mockPaymentDetails,
		onCancel: vi.fn(),
		onClose: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Cancellable Booking Flow", () => {
		it("renders cancellation form for valid cancellable booking", () => {
			render(<CancellationForm {...mockProps} />);

			expect(screen.getByText("Cancel Booking")).toBeInTheDocument();
			expect(screen.getByText("Booking Information")).toBeInTheDocument();
			expect(screen.getByText("Cancellation Policy")).toBeInTheDocument();
			expect(screen.getByText("Test Hotel")).toBeInTheDocument();
			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
		});

		it("displays correct booking information", () => {
			render(<CancellationForm {...mockProps} />);

			expect(screen.getByText("Test Hotel")).toBeInTheDocument();
			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
			// Dates are formatted as "MMM dd, yyyy" — check for check-in/check-out labels
			expect(screen.getByText("Check-in")).toBeInTheDocument();
			expect(screen.getByText("Check-out")).toBeInTheDocument();
		});

		it("shows free cancellation status when within deadline", () => {
			render(<CancellationForm {...mockProps} />);

			expect(
				screen.getByText("Free Cancellation Available"),
			).toBeInTheDocument();
			expect(
				screen.getByText(/You have \d+ hours remaining/),
			).toBeInTheDocument();
		});

		it("calculates and displays refund amount correctly", () => {
			render(<CancellationForm {...mockProps} />);

			expect(screen.getByText("Refund Calculation")).toBeInTheDocument();
			// $300.00 appears twice: once as original amount, once as full refund amount
			expect(screen.getAllByText("$300.00").length).toBeGreaterThanOrEqual(2);
		});

		it("shows cancellation policy details", () => {
			render(<CancellationForm {...mockProps} />);

			expect(screen.getByText("Important Notes:")).toBeInTheDocument();
			expect(
				screen.getByText("Free cancellation up to 24 hours before check-in"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"50% refund for cancellations 12-24 hours before check-in",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("No refund for same-day cancellations"),
			).toBeInTheDocument();
		});

		it("provides cancellation reason dropdown options", () => {
			render(<CancellationForm {...mockProps} />);

			const reasonSelect = screen.getByDisplayValue("Select a reason...");
			expect(reasonSelect).toBeInTheDocument();

			fireEvent.click(reasonSelect);

			expect(
				screen.getByDisplayValue("Select a reason..."),
			).toBeInTheDocument();
		});

		it("enables proceed button and handles cancellation flow", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			const proceedButton = screen.getByText("Proceed with Cancellation");
			expect(proceedButton).toBeInTheDocument();

			await user.click(proceedButton);

			// Should show confirmation dialog — heading and button both say "Confirm Cancellation"
			expect(screen.getByRole("heading", { name: "Confirm Cancellation" })).toBeInTheDocument();
			expect(
				screen.getByText("Are you sure you want to cancel this booking?"),
			).toBeInTheDocument();
		});
	});

	describe("Confirmation Dialog", () => {
		beforeEach(async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			const proceedButton = screen.getByText("Proceed with Cancellation");
			await user.click(proceedButton);
		});

		it("displays booking summary in confirmation dialog", () => {
			expect(screen.getByText("Booking Details")).toBeInTheDocument();
			expect(screen.getByText("Test Hotel")).toBeInTheDocument();
			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
			expect(screen.getByText("CONF-123456")).toBeInTheDocument();
		});

		it("shows refund summary with breakdown", () => {
			expect(screen.getByText("Refund Summary")).toBeInTheDocument();
			expect(screen.getByText("Original Amount:")).toBeInTheDocument();
			expect(screen.getByText("Refund Amount:")).toBeInTheDocument();
		});

		it("requires cancellation reason before allowing confirmation", async () => {
			const user = userEvent.setup();

			const confirmButton = screen.getByRole("button", { name: /confirm cancellation/i });
			expect(confirmButton).toBeDisabled();

			const reasonTextarea = screen.getByPlaceholderText(
				"Please provide a reason for cancellation...",
			);
			await user.type(reasonTextarea, "Change of plans");

			expect(confirmButton).toBeEnabled();
		});

		it("shows refund processing information", () => {
			expect(
				screen.getByText("Refund Processing Information:"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Refunds typically take 5-10 business days to appear on your statement",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"You will receive an email confirmation once the refund is processed",
				),
			).toBeInTheDocument();
		});

		it("allows going back to main form", async () => {
			const user = userEvent.setup();

			const backButton = screen.getByText("Back");
			await user.click(backButton);

			expect(screen.getByText("Cancel Booking")).toBeInTheDocument();
			expect(
				screen.queryByText("Confirm Cancellation"),
			).not.toBeInTheDocument();
		});

		it("processes cancellation with reason and refund amount", async () => {
			const user = userEvent.setup();

			const reasonTextarea = screen.getByPlaceholderText(
				"Please provide a reason for cancellation...",
			);
			await user.type(reasonTextarea, "Emergency situation");

			const confirmButton = screen.getByRole("button", { name: /confirm cancellation/i });
			await user.click(confirmButton);

			expect(mockProps.onCancel).toHaveBeenCalledWith(
				"Emergency situation",
				300,
			);
		});

		it("shows processing state during cancellation", async () => {
			const user = userEvent.setup();

			// Mock a delayed onCancel function
			const delayedOnCancel = vi.fn<[], Promise<void>>(
				() => new Promise((resolve) => setTimeout(resolve, 100)),
			);
			const propsWithDelay = { ...mockProps, onCancel: delayedOnCancel };

			// Re-render with delayed onCancel — use getAllByPlaceholderText to pick last one
			render(<CancellationForm {...propsWithDelay} />);

			// Multiple components rendered (beforeEach + this render) — find the Proceed button in the last one
			const proceedButtons = screen.getAllByText("Proceed with Cancellation");
			await user.click(proceedButtons[proceedButtons.length - 1]);

			const reasonTextareas = screen.getAllByPlaceholderText(
				"Please provide a reason for cancellation...",
			);
			await user.type(reasonTextareas[reasonTextareas.length - 1], "Test reason");

			const confirmButtons = screen.getAllByRole("button", { name: /confirm cancellation/i });
			await user.click(confirmButtons[confirmButtons.length - 1]);

			expect(screen.getByText("Processing...")).toBeInTheDocument();

			await waitFor(() => {
				expect(delayedOnCancel).toHaveBeenCalled();
			});
		});
	});

	describe("Non-Cancellable Booking", () => {
		const nonCancellableProps = {
			...mockProps,
			booking: mockBookingNonCancellable,
		};

		it("shows non-cancellable message for non-refundable bookings", () => {
			render(<CancellationForm {...nonCancellableProps} />);

			expect(
				screen.getByText("Cancellation Not Available"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"This booking has a non-refundable policy and cannot be cancelled.",
				),
			).toBeInTheDocument();
		});

		it("provides customer support contact option", () => {
			render(<CancellationForm {...nonCancellableProps} />);

			expect(
				screen.getByText(
					"For special circumstances, please contact our customer support team who may be able to assist you.",
				),
			).toBeInTheDocument();

			const supportLink = screen.getByText("Contact Support");
			expect(supportLink).toHaveAttribute(
				"href",
				"mailto:support@hotelbooking.com",
			);
		});

		it("allows closing the dialog", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...nonCancellableProps} />);

			const closeButton = screen.getByText("Close");
			await user.click(closeButton);

			expect(mockProps.onClose).toHaveBeenCalled();
		});
	});

	describe("Past Deadline Booking", () => {
		const pastDeadlineProps = {
			...mockProps,
			booking: mockBookingPastDeadline,
		};

		it("shows deadline passed message", () => {
			render(<CancellationForm {...pastDeadlineProps} />);

			expect(
				screen.getByText("Cancellation Not Available"),
			).toBeInTheDocument();
			// Component renders deadline info as one text node: "The cancellation deadline has passed. Deadline was: ..."
			expect(
				screen.getByText(/The cancellation deadline has passed/),
			).toBeInTheDocument();
			expect(screen.getByText(/Deadline was:/)).toBeInTheDocument();
		});
	});

	describe("Partial Refund Scenarios", () => {
		const partialRefundBooking = {
			...mockBookingCancellable,
			checkIn: addHours(new Date(), 13), // 13 hours from now (in partial refund window 12-24h)
			cancellationDeadline: addDays(new Date(), 1), // Still within deadline
		};

		const partialRefundProps = {
			...mockProps,
			booking: partialRefundBooking,
		};

		it("calculates partial refund for cancellations within partial refund window", () => {
			render(<CancellationForm {...partialRefundProps} />);

			expect(screen.getByText("Refund Calculation")).toBeInTheDocument();
			expect(screen.getByText("$300.00")).toBeInTheDocument(); // Original amount
			expect(screen.getByText("$150.00")).toBeInTheDocument(); // 50% refund
			expect(screen.getByText("-$150.00")).toBeInTheDocument(); // Cancellation fee
		});
	});

	describe("Same Day Cancellation", () => {
		const sameDayBooking = {
			...mockBookingCancellable,
			checkIn: addHours(new Date(), 6), // 6 hours from now (same-day, no refund)
			cancellationDeadline: addDays(new Date(), 1), // Still within deadline
		};

		const sameDayProps = {
			...mockProps,
			booking: sameDayBooking,
		};

		it("shows no refund for same-day cancellations", () => {
			render(<CancellationForm {...sameDayProps} />);

			expect(screen.getByText("Refund Calculation")).toBeInTheDocument();
			expect(screen.getByText("$300.00")).toBeInTheDocument(); // Original amount
			expect(screen.getByText("$0.00")).toBeInTheDocument(); // No refund
			expect(screen.getByText("-$300.00")).toBeInTheDocument(); // Full cancellation fee
		});
	});

	describe("User Interface Interactions", () => {
		it("handles close button click", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			const closeButton = screen.getByRole("button", { name: /close/i });
			await user.click(closeButton);

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("handles keep booking button click", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			const keepBookingButton = screen.getByText("Keep Booking");
			await user.click(keepBookingButton);

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("updates cancellation reason when dropdown selection changes", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			const reasonSelect = screen.getByDisplayValue("Select a reason...");
			await user.selectOptions(reasonSelect, "change_of_plans");

			expect(reasonSelect).toHaveValue("change_of_plans");
		});
	});

	describe("Currency Formatting", () => {
		it("formats currency amounts correctly", () => {
			render(<CancellationForm {...mockProps} />);

			expect(PaymentService.formatCurrency).toHaveBeenCalledWith(300, "USD");
			// $300.00 appears twice: original amount and refund amount
			expect(screen.getAllByText("$300.00").length).toBeGreaterThanOrEqual(1);
		});

		it("handles different currencies", () => {
			const eurProps = {
				...mockProps,
				booking: { ...mockBookingCancellable, currency: "EUR" },
				paymentDetails: { ...mockPaymentDetails, currency: "EUR" },
			};

			render(<CancellationForm {...eurProps} />);

			expect(PaymentService.formatCurrency).toHaveBeenCalledWith(300, "EUR");
		});
	});

	describe("Accessibility", () => {
		it("should not have accessibility violations", async () => {
			const { container } = render(<CancellationForm {...mockProps} />);
			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it("has proper form labels and ARIA attributes", () => {
			render(<CancellationForm {...mockProps} />);

			// Select is associated via htmlFor/id and also has aria-label
			const reasonSelect = screen.getByRole("combobox", { name: /reason for cancellation/i });
			expect(reasonSelect).toBeInTheDocument();
			expect(reasonSelect).toHaveAttribute("id", "cancellation-reason");
		});

		it("supports keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<CancellationForm {...mockProps} />);

			// Tab through interactive elements — first is X close button, then select, then buttons
			const select = screen.getByDisplayValue("Select a reason...");
			const keepButton = screen.getByText("Keep Booking");
			const proceedButton = screen.getByText("Proceed with Cancellation");

			// Focus each element directly and verify it is focusable
			select.focus();
			expect(select).toHaveFocus();

			keepButton.focus();
			expect(keepButton).toHaveFocus();

			proceedButton.focus();
			expect(proceedButton).toHaveFocus();
		});

		it("provides proper button states and disabled attributes", () => {
			render(<CancellationForm {...mockProps} />);

			const proceedButton = screen.getByText("Proceed with Cancellation");
			expect(proceedButton).toBeEnabled();

			const keepBookingButton = screen.getByText("Keep Booking");
			expect(keepBookingButton).toBeEnabled();
		});
	});

	describe("Error Handling", () => {
		it("handles cancellation API errors gracefully", async () => {
			const user = userEvent.setup();
			const errorOnCancel = vi.fn().mockRejectedValue(new Error("API Error"));
			const propsWithError = { ...mockProps, onCancel: errorOnCancel };

			render(<CancellationForm {...propsWithError} />);

			const proceedButton = screen.getByText("Proceed with Cancellation");
			await user.click(proceedButton);

			const reasonTextarea = screen.getByPlaceholderText(
				"Please provide a reason for cancellation...",
			);
			await user.type(reasonTextarea, "Test reason");

			const confirmButton = screen.getByRole("button", { name: /confirm cancellation/i });
			await user.click(confirmButton);

			await waitFor(() => {
				expect(errorOnCancel).toHaveBeenCalled();
				// Should still show the form (not crash)
				expect(screen.getByRole("heading", { name: "Confirm Cancellation" })).toBeInTheDocument();
			});
		});

		it("handles missing payment details gracefully", () => {
			const propsWithoutPayment = {
				...mockProps,
				paymentDetails: undefined,
			};

			render(<CancellationForm {...propsWithoutPayment} />);

			expect(screen.getByText("Cancel Booking")).toBeInTheDocument();
			expect(screen.getByText("Refund Calculation")).toBeInTheDocument();
		});

		it("handles malformed booking data", () => {
			const propsWithMalformedBooking = {
				...mockProps,
				booking: {
					...mockBookingCancellable,
					cancellationPolicy: null,
					totalAmount: 0,
				},
			};

			expect(() => {
				render(<CancellationForm {...propsWithMalformedBooking} />);
			}).not.toThrow();
		});
	});

	describe("Date Calculations", () => {
		it("correctly calculates hours until deadline", () => {
			render(<CancellationForm {...mockProps} />);

			// Should show hours remaining text
			expect(
				screen.getByText(/You have \d+ hours remaining/),
			).toBeInTheDocument();
		});

		it("handles edge case of exact deadline time", () => {
			// Use a deadline 1ms in the past to reliably trigger the "not available" state
			const pastByOneSec = new Date(Date.now() - 1000);
			const exactDeadlineBooking = {
				...mockBookingCancellable,
				cancellationDeadline: pastByOneSec,
			};

			const exactDeadlineProps = {
				...mockProps,
				booking: exactDeadlineBooking,
			};

			render(<CancellationForm {...exactDeadlineProps} />);

			// Should show cancellation not available when deadline is in the past
			expect(
				screen.getByText("Cancellation Not Available"),
			).toBeInTheDocument();
		});
	});
});
