import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SquarePaymentForm } from "../../components/payment/SquarePaymentForm";

// Mock window.Square
const tokenizeMock = vi.fn();
const cardInstance = { tokenize: tokenizeMock } as any;
const paymentsMock = vi
	.fn()
	.mockResolvedValue({ card: vi.fn().mockResolvedValue(cardInstance) });

beforeEach(() => {
	(window as any).Square = { payments: paymentsMock };
	tokenizeMock.mockReset();
});

describe("SquarePaymentForm component", () => {
	it("renders loading then form", async () => {
		render(
			<SquarePaymentForm
				bookingId="b1"
				amount={123}
				onSuccess={vi.fn()}
				onError={vi.fn()}
				bookingDetails={{
					hotelName: "H",
					checkIn: "2024-01-01",
					checkOut: "2024-01-02",
					guestName: "T User",
					roomType: "Deluxe",
				}}
			/>,
		);
		expect(
			screen.getByText(/Loading secure payment form/i),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByText(/Payment Details/)).toBeInTheDocument(),
		);
	});

	it("handles successful payment", async () => {
		tokenizeMock.mockResolvedValue({ status: "OK", token: "tok_123" });
		(globalThis as any).fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, paymentId: "sq_pay_1" }),
		});
		const onSuccess = vi.fn();

		render(
			<SquarePaymentForm
				bookingId="b1"
				amount={50}
				onSuccess={onSuccess}
				onError={vi.fn()}
				bookingDetails={{
					hotelName: "H",
					checkIn: "2024-01-01",
					checkOut: "2024-01-02",
					guestName: "T User",
					roomType: "Deluxe",
				}}
			/>,
		);

		await waitFor(() => screen.getByText(/Payment Details/));
		fireEvent.click(screen.getByRole("button", { name: /Pay \$50.00 USD/ }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
	});

	it("handles tokenization failure", async () => {
		tokenizeMock.mockResolvedValue({
			status: "ERROR",
			errors: [{ message: "Bad card" }],
		});
		const onError = vi.fn();
		render(
			<SquarePaymentForm
				bookingId="b1"
				amount={10}
				onSuccess={vi.fn()}
				onError={onError}
				bookingDetails={{
					hotelName: "H",
					checkIn: "2024-01-01",
					checkOut: "2024-01-02",
					guestName: "T User",
					roomType: "Deluxe",
				}}
			/>,
		);
		await waitFor(() => screen.getByText(/Payment Details/));
		fireEvent.click(screen.getByRole("button", { name: /Pay \$10.00 USD/ }));
		await waitFor(() => expect(onError).toHaveBeenCalled());
	});
});
