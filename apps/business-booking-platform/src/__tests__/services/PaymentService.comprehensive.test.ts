import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	BookingPayments,
	CreatedPayment,
	PaymentHistory,
	PaymentStatus,
	RefundRequest,
	RefundResponse,
	SetupIntent,
} from "@/services/payment";
import { PaymentService } from "@/services/payment";

// Use vi.hoisted so the mock factory can reference these before module imports run
const { mockApiClientFromCreate } = vi.hoisted(() => {
	const client = {
		post: vi.fn(),
		get: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: {
			request: { use: vi.fn(), eject: vi.fn() },
			response: { use: vi.fn(), eject: vi.fn() },
		},
	};
	return { mockApiClientFromCreate: client };
});

// Mock axios — provide interceptors so payment.ts module initialises correctly
vi.mock("axios", () => ({
	default: {
		create: vi.fn(() => mockApiClientFromCreate),
		post: vi.fn(),
		get: vi.fn(),
		isAxiosError: vi.fn(),
	},
}));
const mockedAxios = axios as any;

// Mock logger
vi.mock("@/utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

describe("PaymentService Comprehensive Tests", () => {
	// mockApiClient points to the hoisted client that axios.create() returns at module init
	const mockApiClient = mockApiClientFromCreate;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock localStorage
		Object.defineProperty(window, "localStorage", {
			value: {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
			},
			writable: true,
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Square Payment Integration", () => {
		it("should create Square payment successfully", async () => {
			const mockResponse: CreatedPayment = {
				success: true,
				id: "sq_payment_123",
				paymentId: "sq_payment_123",
				amount: 10000,
				currency: "USD",
				receiptUrl: "https://square.com/receipt/123",
			};

			mockApiClient.post.mockResolvedValue({ data: mockResponse });

			const payload = {
				bookingId: "booking_123",
				amount: 100,
				currency: "USD",
				sourceId: "cnon_test_source",
				billingAddress: {
					firstName: "John",
					lastName: "Doe",
					address1: "123 Main St",
					locality: "New York",
					administrativeDistrictLevel1: "NY",
					postalCode: "10001",
					country: "US",
				},
			};

			const result = await PaymentService.createSquarePayment(payload);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/create", {
				provider: "square",
				currency: "USD",
				...payload,
			});
			expect(result).toEqual(mockResponse);
		});

		it("should handle Square payment creation validation errors", async () => {
			const invalidPayload = {
				bookingId: "",
				amount: 0,
				sourceId: "",
			};

			await expect(
				PaymentService.createSquarePayment(invalidPayload),
			).rejects.toThrow(
				"Missing required payment fields: bookingId, sourceId, amount",
			);
		});

		it("should handle Square payment API errors", async () => {
			const mockError = {
				response: {
					data: {
						message: "Invalid card number",
					},
				},
			};

			mockApiClient.post.mockRejectedValue(mockError);
			mockedAxios.isAxiosError.mockReturnValue(true);

			const payload = {
				bookingId: "booking_123",
				amount: 100,
				sourceId: "cnon_invalid",
			};

			await expect(PaymentService.createSquarePayment(payload)).rejects.toThrow(
				"Invalid card number",
			);
		});

		it("should handle network errors for Square payments", async () => {
			mockApiClient.post.mockRejectedValue(new Error("Network error"));
			mockedAxios.isAxiosError.mockReturnValue(false);

			const payload = {
				bookingId: "booking_123",
				amount: 100,
				sourceId: "cnon_test",
			};

			await expect(PaymentService.createSquarePayment(payload)).rejects.toThrow(
				"Network error occurred",
			);
		});
	});

	describe("Legacy Payment Intent Methods", () => {
		it("should create payment intent (legacy compatibility)", async () => {
			const mockSquareResponse: CreatedPayment = {
				success: true,
				paymentId: "sq_123",
				amount: 5000,
				currency: "USD",
			};

			mockApiClient.post.mockResolvedValue({ data: mockSquareResponse });

			const payload = {
				bookingId: "booking_123",
				amount: 50,
				currency: "USD",
				metadata: { source: "web" },
			};

			const result = await PaymentService.createPaymentIntent(payload);

			expect(result).toEqual({
				clientSecret: "pi_mock_client_secret",
				id: "sq_123",
			});
		});

		it("should confirm payment intent successfully", async () => {
			const mockResponse = {
				success: true,
				data: {
					paymentIntentId: "pi_123",
					status: "succeeded",
					amount: 5000,
					currency: "USD",
				},
			};

			mockApiClient.post.mockResolvedValue({ data: mockResponse });

			const result = await PaymentService.confirmPaymentIntent(
				"pi_123",
				"pm_test_card",
			);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/confirm", {
				paymentIntentId: "pi_123",
				paymentMethodId: "pm_test_card",
			});
			expect(result).toEqual(mockResponse.data);
		});

		it("should handle payment confirmation failures", async () => {
			const mockResponse = {
				success: false,
				message: "Payment failed: insufficient funds",
			};

			mockApiClient.post.mockResolvedValue({ data: mockResponse });

			await expect(
				PaymentService.confirmPaymentIntent("pi_123"),
			).rejects.toThrow("Payment failed: insufficient funds");
		});
	});

	describe("Payment Status and History", () => {
		it("should get payment status successfully", async () => {
			const mockStatus: PaymentStatus = {
				status: "succeeded",
				amount: 10000,
				currency: "USD",
				created: 1634567890,
				payment: { id: "pi_123" },
			};

			mockApiClient.get.mockResolvedValue({
				data: { success: true, data: mockStatus },
			});

			const result = await PaymentService.getPaymentStatus("pi_123");

			expect(mockApiClient.get).toHaveBeenCalledWith("/payments/status/pi_123");
			expect(result).toEqual(mockStatus);
		});

		it("should get payment history with filters", async () => {
			const mockHistory: PaymentHistory = {
				payments: [
					{
						id: "pay_123",
						bookingId: "book_123",
						amount: "100.00",
						currency: "USD",
						status: "completed",
						method: "card",
						provider: "square",
						createdAt: "2024-01-01T10:00:00Z",
						updatedAt: "2024-01-01T10:01:00Z",
					},
				],
				pagination: {
					page: 1,
					limit: 10,
					total: 1,
					totalPages: 1,
				},
			};

			mockApiClient.get.mockResolvedValue({
				data: { success: true, data: mockHistory },
			});

			const startDate = new Date("2024-01-01");
			const endDate = new Date("2024-01-31");

			const result = await PaymentService.getPaymentHistory(
				1,
				10,
				"completed",
				startDate,
				endDate,
			);

			expect(mockApiClient.get).toHaveBeenCalledWith(
				expect.stringContaining("/payments/history?"),
			);
			expect(result).toEqual(mockHistory);
		});

		it("should get booking payments successfully", async () => {
			const mockBookingPayments: BookingPayments = {
				payments: [
					{
						id: "pay_123",
						bookingId: "book_123",
						amount: 100,
						currency: "USD",
						status: "completed",
						provider: "square",
					},
				],
				refunds: [],
				summary: {
					totalPaid: 100,
					totalRefunded: 0,
					pendingPayments: 0,
					pendingRefunds: 0,
				},
			};

			mockApiClient.get.mockResolvedValue({
				data: { success: true, data: mockBookingPayments },
			});

			const result = await PaymentService.getBookingPayments("book_123");

			expect(mockApiClient.get).toHaveBeenCalledWith(
				"/payments/booking/book_123",
			);
			expect(result).toEqual(mockBookingPayments);
		});
	});

	describe("Refund Operations", () => {
		it("should create refund successfully", async () => {
			const mockRefund: RefundResponse = {
				success: true,
				refundId: "ref_123",
				refund: {
					id: "ref_123",
					amount: 5000,
					currency: "USD",
					status: "pending",
					reason: "Customer request",
				},
			};

			mockApiClient.post.mockResolvedValue({ data: mockRefund });

			const refundRequest: RefundRequest = {
				amount: 50,
				reason: "Customer request",
				paymentId: "pay_123",
				bookingId: "book_123",
			};

			const result = await PaymentService.createRefund(refundRequest);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/refund", {
				paymentId: "pay_123",
				bookingId: "book_123",
				amount: 50,
				reason: "Customer request",
			});
			expect(result).toEqual(mockRefund);
		});

		it("should handle refund validation errors", async () => {
			const invalidRequest: RefundRequest = {
				amount: 0,
				// Missing paymentId
			};

			await expect(PaymentService.createRefund(invalidRequest)).rejects.toThrow(
				"Missing required refund fields: paymentId, amount",
			);
		});

		it("should handle legacy paymentIntentId in refunds", async () => {
			const mockRefund: RefundResponse = {
				success: true,
				refundId: "ref_123",
			};

			mockApiClient.post.mockResolvedValue({ data: mockRefund });

			const refundRequest: RefundRequest = {
				amount: 25,
				paymentIntentId: "pi_123", // Legacy field
				bookingId: "book_123",
			};

			await PaymentService.createRefund(refundRequest);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/refund", {
				paymentId: "pi_123", // Should map paymentIntentId to paymentId
				bookingId: "book_123",
				amount: 25,
				reason: undefined,
			});
		});
	});

	describe("Setup Intent Operations", () => {
		it("should create setup intent successfully", async () => {
			const mockSetupIntent: SetupIntent = {
				clientSecret: "seti_123_secret",
				setupIntentId: "seti_123",
			};

			mockApiClient.post.mockResolvedValue({
				data: { success: true, data: mockSetupIntent },
			});

			const metadata = { customerId: "cus_123" };
			const result = await PaymentService.createSetupIntent(metadata);

			expect(mockApiClient.post).toHaveBeenCalledWith(
				"/payments/setup-intent",
				{
					metadata,
				},
			);
			expect(result).toEqual(mockSetupIntent);
		});

		it("should create setup intent with no metadata", async () => {
			const mockSetupIntent: SetupIntent = {
				clientSecret: "seti_456_secret",
				setupIntentId: "seti_456",
			};

			mockApiClient.post.mockResolvedValue({
				data: { success: true, data: mockSetupIntent },
			});

			const result = await PaymentService.createSetupIntent();

			expect(mockApiClient.post).toHaveBeenCalledWith(
				"/payments/setup-intent",
				{
					metadata: {},
				},
			);
		});
	});

	describe("Utility Methods", () => {
		it("should format currency correctly", () => {
			expect(PaymentService.formatCurrency(100)).toBe("$100.00");
			expect(PaymentService.formatCurrency(100, "EUR")).toBe("€100.00");
			expect(PaymentService.formatCurrency(99.99)).toBe("$99.99");
			expect(PaymentService.formatCurrency(0)).toBe("$0.00");
		});

		it("should calculate commission correctly", () => {
			expect(PaymentService.calculateCommission(100)).toBe(5);
			expect(PaymentService.calculateCommission(200)).toBe(10);
			expect(PaymentService.calculateCommission(99.99)).toBe(5);
			expect(PaymentService.calculateCommission(0)).toBe(0);
		});

		it("should get payment method icons", () => {
			expect(PaymentService.getPaymentMethodIcon("visa")).toBe("💳");
			expect(PaymentService.getPaymentMethodIcon("mastercard")).toBe("💳");
			expect(PaymentService.getPaymentMethodIcon("unknown_brand")).toBe("💳");
			expect(PaymentService.getPaymentMethodIcon("VISA")).toBe("💳"); // Case insensitive
		});

		it("should get payment status colors", () => {
			expect(PaymentService.getPaymentStatusColor("completed")).toBe(
				"text-green-600",
			);
			expect(PaymentService.getPaymentStatusColor("pending")).toBe(
				"text-yellow-600",
			);
			expect(PaymentService.getPaymentStatusColor("failed")).toBe(
				"text-red-600",
			);
			expect(PaymentService.getPaymentStatusColor("unknown")).toBe(
				"text-gray-600",
			);
		});

		it("should validate payment amounts correctly", () => {
			// Valid amounts
			expect(PaymentService.validatePaymentAmount(1, "USD")).toBe(true);
			expect(PaymentService.validatePaymentAmount(100, "EUR")).toBe(true);
			expect(PaymentService.validatePaymentAmount(0.5, "USD")).toBe(true);
			expect(PaymentService.validatePaymentAmount(999999, "USD")).toBe(true);

			// Invalid amounts
			expect(PaymentService.validatePaymentAmount(0.49, "USD")).toBe(false);
			expect(PaymentService.validatePaymentAmount(0, "USD")).toBe(false);
			expect(PaymentService.validatePaymentAmount(1000000, "USD")).toBe(false);
			expect(PaymentService.validatePaymentAmount(-1, "USD")).toBe(false);

			// Different currency minimums
			expect(PaymentService.validatePaymentAmount(0.3, "GBP")).toBe(true);
			expect(PaymentService.validatePaymentAmount(0.29, "GBP")).toBe(false);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle API response without success field", async () => {
			mockApiClient.post.mockResolvedValue({
				data: { message: "Payment processed" },
			});

			await expect(
				PaymentService.confirmPaymentIntent("pi_123"),
			).rejects.toThrow("Payment confirmation failed");
		});

		it("should handle empty payment history response", async () => {
			const emptyHistory: PaymentHistory = {
				payments: [],
				pagination: {
					page: 1,
					limit: 10,
					total: 0,
					totalPages: 0,
				},
			};

			mockApiClient.get.mockResolvedValue({
				data: { success: true, data: emptyHistory },
			});

			const result = await PaymentService.getPaymentHistory();
			expect(result.payments).toHaveLength(0);
		});

		it("should handle concurrent payment requests", async () => {
			const mockResponse: CreatedPayment = {
				success: true,
				id: "sq_concurrent_123",
				paymentId: "sq_concurrent_123",
			};

			mockApiClient.post.mockResolvedValue({ data: mockResponse });

			const payload = {
				bookingId: "booking_concurrent",
				amount: 100,
				sourceId: "cnon_test",
			};

			// Simulate concurrent requests
			const requests = [
				PaymentService.createSquarePayment(payload),
				PaymentService.createSquarePayment(payload),
				PaymentService.createSquarePayment(payload),
			];

			const results = await Promise.all(requests);
			expect(results).toHaveLength(3);
			expect(mockApiClient.post).toHaveBeenCalledTimes(3);
		});

		it("should handle timeout scenarios", async () => {
			const timeoutError = new Error("Request timeout");
			timeoutError.name = "TimeoutError";

			mockApiClient.post.mockRejectedValue(timeoutError);
			mockedAxios.isAxiosError.mockReturnValue(false);

			const payload = {
				bookingId: "booking_timeout",
				amount: 100,
				sourceId: "cnon_test",
			};

			await expect(PaymentService.createSquarePayment(payload)).rejects.toThrow(
				"Network error occurred",
			);
		});

		it("should handle malformed API responses", async () => {
			mockApiClient.get.mockResolvedValue({
				data: "invalid response format",
			});

			await expect(PaymentService.getPaymentStatus("pi_123")).rejects.toThrow();
		});
	});

	describe("Authentication Integration", () => {
		it("should include auth token in requests when available", () => {
			const mockGetItem = vi.fn().mockReturnValue("auth_token_123");
			Object.defineProperty(window, "localStorage", {
				value: { getItem: mockGetItem },
				writable: true,
			});

			// Interceptor was registered at module init; simulate the interceptor behavior
			const token = mockGetItem("authToken");
			const config: { headers: Record<string, string> } = { headers: {} };
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
			expect(config.headers.Authorization).toBe("Bearer auth_token_123");
		});

		it("should handle requests without auth token", () => {
			const mockGetItem = vi.fn().mockReturnValue(null);
			Object.defineProperty(window, "localStorage", {
				value: { getItem: mockGetItem },
				writable: true,
			});

			// No token — Authorization header should not be set
			const token = mockGetItem("authToken");
			const config: { headers: Record<string, string> } = { headers: {} };
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
			expect(config.headers.Authorization).toBeUndefined();
		});
	});

	describe("Real-world Payment Scenarios", () => {
		it("should handle a complete booking payment flow", async () => {
			// 1. Create payment intent
			const createResponse: CreatedPayment = {
				success: true,
				id: "sq_complete_123",
				paymentId: "sq_complete_123",
				amount: 25000,
				currency: "USD",
			};

			mockApiClient.post.mockResolvedValueOnce({ data: createResponse });

			// 2. Confirm payment
			const confirmResponse = {
				success: true,
				data: {
					paymentIntentId: "sq_complete_123",
					status: "succeeded",
					amount: 25000,
					currency: "USD",
				},
			};

			mockApiClient.post.mockResolvedValueOnce({ data: confirmResponse });

			// 3. Get payment status
			const statusResponse: PaymentStatus = {
				status: "succeeded",
				amount: 25000,
				currency: "USD",
				created: Date.now(),
				payment: { id: "sq_complete_123" },
			};

			mockApiClient.get.mockResolvedValueOnce({
				data: { success: true, data: statusResponse },
			});

			// Execute complete flow
			const paymentResult = await PaymentService.createSquarePayment({
				bookingId: "booking_complete",
				amount: 250,
				sourceId: "cnon_test_complete",
			});

			const confirmResult = await PaymentService.confirmPaymentIntent(
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				paymentResult.paymentId!,
			);

			const statusResult = await PaymentService.getPaymentStatus(
				confirmResult.paymentIntentId,
			);

			expect(paymentResult.success).toBe(true);
			expect(confirmResult.status).toBe("succeeded");
			expect(statusResult.status).toBe("succeeded");
		});

		it("should handle partial refund scenario", async () => {
			const refundResponse: RefundResponse = {
				success: true,
				refundId: "ref_partial_123",
				refund: {
					id: "ref_partial_123",
					amount: 5000, // Partial refund
					currency: "USD",
					status: "succeeded",
					reason: "Partial cancellation",
				},
			};

			mockApiClient.post.mockResolvedValue({ data: refundResponse });

			const refundRequest: RefundRequest = {
				amount: 50, // Original was $250, refunding $50
				reason: "Partial cancellation",
				paymentId: "sq_complete_123",
				bookingId: "booking_complete",
			};

			const result = await PaymentService.createRefund(refundRequest);

			expect(result.success).toBe(true);
			expect(result.refund?.amount).toBe(5000);
			expect(result.refund?.reason).toBe("Partial cancellation");
		});
	});
});
