import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentService } from "@/domain/payments";

vi.mock("axios");
const mockedAxios = axios as unknown as { post: any; get: any; create: any };

// Minimal mock for axios.create returning axios itself
(mockedAxios.create as any) = () => mockedAxios;

describe("PaymentService (Square)", () => {
	beforeEach(() => {
		mockedAxios.post = vi.fn();
		mockedAxios.get = vi.fn();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("creates a Square payment successfully", async () => {
		mockedAxios.post.mockResolvedValueOnce({
			data: {
				success: true,
				paymentId: "sq_pay_123",
				receiptUrl: "https://receipt",
			},
		});
		const result = await PaymentService.createSquarePayment({
			bookingId: "b1",
			amount: 100,
			sourceId: "tok_123",
			currency: "USD",
		});
		expect(result.success).toBe(true);
		expect(result.paymentId).toBe("sq_pay_123");
	});

	it("handles Square payment validation error", async () => {
		await expect(
			PaymentService.createSquarePayment({
				bookingId: "b1",
				amount: -10,
				sourceId: "tok_123",
				currency: "USD",
			} as any),
		).rejects.toThrow();
	});

	it("fetches booking payments", async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: {
				success: true,
				data: {
					payments: [],
					refunds: [],
					summary: {
						totalPaid: 0,
						totalRefunded: 0,
						pendingPayments: 0,
						pendingRefunds: 0,
					},
				},
			},
		});
		const data = await PaymentService.getBookingPayments("b1");
		expect(data.summary.totalPaid).toBe(0);
	});

	it("creates refund", async () => {
		mockedAxios.post.mockResolvedValueOnce({
			data: { success: true, refundId: "rf_123" },
		});
		const res = await PaymentService.createRefund({
			paymentId: "sq_pay_123",
			bookingId: "b1",
			amount: 50,
			reason: "test",
		} as any);
		expect(res.refundId).toBe("rf_123");
	});
});
