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

// Mock axios
vi.mock("axios", () => ({
	default: {
		create: vi.fn(),
		post: vi.fn(),
		get: vi.fn(),
	},
}));
const mockedAxios = axios as any;

// Mock environment variables
vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3001/api");
vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_123");

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("PaymentService", () => {
	const mockApiClient = {
		post: vi.fn(),
		get: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: {
			request: {
				use: vi.fn(),
			},
			response: {
				use: vi.fn(),
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockedAxios.create = vi.fn().mockReturnValue(mockApiClient as any);
		mockLocalStorage.getItem.mockReturnValue("mock-auth-token");
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe("API Client Configuration", () => {
		it("should create axios client with correct base URL", () => {
			// Import to trigger axios.create call
			require("@/services/payment");

			expect(mockedAxios.create).toHaveBeenCalledWith({
				baseURL: "http://localhost:3001/api",
				headers: {
					"Content-Type": "application/json",
				},
			});
		});

		it("should configure request interceptor for authentication", () => {
			// Import to trigger interceptor setup
			require("@/services/payment");

			expect(mockApiClient.interceptors.request.use).toHaveBeenCalled();
		});
	});

	describe("createPaymentIntent", () => {
		const mockPaymentIntent: CreatedPayment = {
			success: true,
			id: "pi_test_123",
			clientSecret: "pi_test_123_secret",
			amount: 50000,
			currency: "USD",
		};

		it("should create payment intent successfully", async () => {
			mockApiClient.post.mockResolvedValue({
				data: mockPaymentIntent,
			});

			const result = await PaymentService.createPaymentIntent({
				bookingId: "booking-123",
				amount: 50000,
				currency: "USD",
				metadata: { guestName: "John Doe" },
			});

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/create", {
				provider: "square",
				currency: "USD",
				bookingId: "booking-123",
				amount: 50000,
				metadata: { guestName: "John Doe" },
				sourceId: "mock-source-id",
				billingAddress: undefined,
			});

			expect(result).toEqual({
				clientSecret: "pi_mock_client_secret",
				id: "pi_test_123",
			});
		});

		it("should handle API error response", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: false,
					message: "Invalid booking ID",
				},
			});

			await expect(
				PaymentService.createPaymentIntent({
					bookingId: "invalid-booking",
					amount: 50000,
				}),
			).rejects.toThrow("Invalid booking ID");
		});

		it("should handle network error", async () => {
			const networkError = new Error("Network Error");
			mockApiClient.post.mockRejectedValue(networkError);

			await expect(
				PaymentService.createPaymentIntent({
					bookingId: "booking-123",
					amount: 50000,
				}),
			).rejects.toThrow("Network error occurred");
		});

		it("should handle axios error with response", async () => {
			const axiosError = {
				isAxiosError: true,
				response: {
					data: {
						message: "Payment amount too low",
					},
				},
			};
			mockApiClient.post.mockRejectedValue(axiosError);
			mockedAxios.isAxiosError.mockReturnValue(true);

			await expect(
				PaymentService.createPaymentIntent({
					bookingId: "booking-123",
					amount: 10,
				}),
			).rejects.toThrow("Payment amount too low");
		});

		it("should use default currency when not specified", async () => {
			mockApiClient.post.mockResolvedValue({
				data: mockPaymentIntent,
			});

			await PaymentService.createPaymentIntent({
				bookingId: "booking-123",
				amount: 50000,
			});

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/create", {
				provider: "square",
				currency: "USD",
				bookingId: "booking-123",
				amount: 50000,
				sourceId: "mock-source-id",
				billingAddress: undefined,
			});
		});
	});

	describe("confirmPaymentIntent", () => {
		const mockConfirmationResponse = {
			paymentIntentId: "pi_test_123",
			status: "succeeded",
			amount: 50000,
			currency: "USD",
		};

		it("should confirm payment intent successfully", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: true,
					data: mockConfirmationResponse,
				},
			});

			const result = await PaymentService.confirmPaymentIntent(
				"pi_test_123",
				"pm_test_456",
			);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/confirm", {
				paymentIntentId: "pi_test_123",
				paymentMethodId: "pm_test_456",
			});

			expect(result).toEqual(mockConfirmationResponse);
		});

		it("should confirm payment intent without payment method ID", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: true,
					data: mockConfirmationResponse,
				},
			});

			await PaymentService.confirmPaymentIntent("pi_test_123");

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/confirm", {
				paymentIntentId: "pi_test_123",
				paymentMethodId: undefined,
			});
		});

		it("should handle confirmation failure", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: false,
					message: "Payment method declined",
				},
			});

			await expect(
				PaymentService.confirmPaymentIntent("pi_test_123"),
			).rejects.toThrow("Payment method declined");
		});
	});

	describe("getPaymentStatus", () => {
		const mockPaymentStatus: PaymentStatus = {
			status: "succeeded",
			amount: 50000,
			currency: "USD",
			created: 1703001600,
			payment: { id: "pi_test_123" },
		};

		it("should get payment status successfully", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: true,
					data: mockPaymentStatus,
				},
			});

			const result = await PaymentService.getPaymentStatus("pi_test_123");

			expect(mockApiClient.get).toHaveBeenCalledWith(
				"/payments/status/pi_test_123",
			);
			expect(result).toEqual(mockPaymentStatus);
		});

		it("should handle payment status error", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: false,
					message: "Payment not found",
				},
			});

			await expect(
				PaymentService.getPaymentStatus("invalid_payment"),
			).rejects.toThrow("Payment not found");
		});
	});

	describe("getBookingPayments", () => {
		const mockBookingPayments: BookingPayments = {
			payments: [
				{
					id: "pay_123",
					amount: 50000,
					currency: "USD",
					status: "succeeded",
				},
			],
			refunds: [],
			summary: {
				totalPaid: 50000,
				totalRefunded: 0,
				pendingPayments: 0,
				pendingRefunds: 0,
			},
		};

		it("should get booking payments successfully", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: true,
					data: mockBookingPayments,
				},
			});

			const result = await PaymentService.getBookingPayments("booking-123");

			expect(mockApiClient.get).toHaveBeenCalledWith(
				"/payments/booking/booking-123",
			);
			expect(result).toEqual(mockBookingPayments);
		});

		it("should handle booking payments error", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: false,
					message: "Booking not found",
				},
			});

			await expect(
				PaymentService.getBookingPayments("invalid-booking"),
			).rejects.toThrow("Booking not found");
		});
	});

	describe("createRefund", () => {
		const mockRefundRequest: RefundRequest = {
			paymentIntentId: "pi_test_123",
			amount: 25000,
			reason: "requested_by_customer",
			metadata: { reason: "Changed travel plans" },
		};

		const mockRefundResponse: RefundResponse = {
			success: true,
			refundId: "re_test_123",
			refund: {
				id: "re_test_123",
				amount: 25000,
				currency: "USD",
				status: "succeeded",
				reason: "requested_by_customer",
			},
		};

		it("should create refund successfully", async () => {
			mockApiClient.post.mockResolvedValue({
				data: mockRefundResponse,
			});

			const result = await PaymentService.createRefund(mockRefundRequest);

			expect(mockApiClient.post).toHaveBeenCalledWith("/payments/refund", {
				paymentId: "pi_test_123",
				bookingId: "",
				amount: 25000,
				reason: "requested_by_customer",
			});
			expect(result).toEqual(mockRefundResponse);
		});

		it("should handle refund creation error", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: false,
					message: "Payment cannot be refunded",
				},
			});

			await expect(
				PaymentService.createRefund(mockRefundRequest),
			).rejects.toThrow("Payment cannot be refunded");
		});
	});

	describe("getPaymentHistory", () => {
		const mockPaymentHistory: PaymentHistory = {
			payments: [
				{
					id: "pay_123",
					bookingId: "booking-123",
					amount: "500.00",
					currency: "USD",
					status: "completed",
					method: "card",
					provider: "stripe",
					createdAt: "2023-12-01T10:00:00Z",
					updatedAt: "2023-12-01T10:05:00Z",
				},
			],
			pagination: {
				page: 1,
				limit: 10,
				total: 1,
				totalPages: 1,
			},
		};

		it("should get payment history with default parameters", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: true,
					data: mockPaymentHistory,
				},
			});

			const result = await PaymentService.getPaymentHistory();

			expect(mockApiClient.get).toHaveBeenCalledWith(
				"/payments/history?page=1&limit=10",
			);
			expect(result).toEqual(mockPaymentHistory);
		});

		it("should get payment history with custom parameters", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: true,
					data: mockPaymentHistory,
				},
			});

			const startDate = new Date("2023-12-01");
			const endDate = new Date("2023-12-31");

			await PaymentService.getPaymentHistory(
				2,
				20,
				"completed",
				startDate,
				endDate,
			);

			const expectedUrl =
				"/payments/history?page=2&limit=20&status=completed&startDate=2023-12-01T00:00:00.000Z&endDate=2023-12-31T00:00:00.000Z";
			expect(mockApiClient.get).toHaveBeenCalledWith(expectedUrl);
		});

		it("should handle payment history error", async () => {
			mockApiClient.get.mockResolvedValue({
				data: {
					success: false,
					message: "Unauthorized access",
				},
			});

			await expect(PaymentService.getPaymentHistory()).rejects.toThrow(
				"Unauthorized access",
			);
		});
	});

	describe("createSetupIntent", () => {
		const mockSetupIntent: SetupIntent = {
			clientSecret: "seti_test_123_secret",
			setupIntentId: "seti_test_123",
		};

		it("should create setup intent successfully", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: true,
					data: mockSetupIntent,
				},
			});

			const result = await PaymentService.createSetupIntent({
				userId: "user-123",
			});

			expect(mockApiClient.post).toHaveBeenCalledWith(
				"/payments/setup-intent",
				{
					metadata: { userId: "user-123" },
				},
			);
			expect(result).toEqual(mockSetupIntent);
		});

		it("should create setup intent with default metadata", async () => {
			mockApiClient.post.mockResolvedValue({
				data: {
					success: true,
					data: mockSetupIntent,
				},
			});

			await PaymentService.createSetupIntent();

			expect(mockApiClient.post).toHaveBeenCalledWith(
				"/payments/setup-intent",
				{
					metadata: {},
				},
			);
		});
	});

	describe("Utility Methods", () => {
		describe("formatCurrency", () => {
			it("should format USD currency correctly", () => {
				expect(PaymentService.formatCurrency(500)).toBe("$500.00");
				expect(PaymentService.formatCurrency(1234.56)).toBe("$1,234.56");
			});

			it("should format different currencies correctly", () => {
				expect(PaymentService.formatCurrency(500, "EUR")).toBe("€500.00");
				expect(PaymentService.formatCurrency(500, "GBP")).toBe("£500.00");
			});

			it("should handle decimal amounts", () => {
				expect(PaymentService.formatCurrency(99.99)).toBe("$99.99");
				expect(PaymentService.formatCurrency(0.5)).toBe("$0.50");
			});
		});

		describe("calculateCommission", () => {
			it("should calculate 5% commission correctly", () => {
				expect(PaymentService.calculateCommission(100)).toBe(5);
				expect(PaymentService.calculateCommission(500)).toBe(25);
				expect(PaymentService.calculateCommission(1000)).toBe(50);
			});

			it("should round commission to 2 decimal places", () => {
				expect(PaymentService.calculateCommission(333.33)).toBe(16.67);
				expect(PaymentService.calculateCommission(99.99)).toBe(5);
			});

			it("should handle zero and negative amounts", () => {
				expect(PaymentService.calculateCommission(0)).toBe(0);
				expect(PaymentService.calculateCommission(-100)).toBe(-5);
			});
		});

		describe("getPaymentMethodIcon", () => {
			it("should return correct icons for known brands", () => {
				expect(PaymentService.getPaymentMethodIcon("visa")).toBe("💳");
				expect(PaymentService.getPaymentMethodIcon("mastercard")).toBe("💳");
				expect(PaymentService.getPaymentMethodIcon("amex")).toBe("💳");
			});

			it("should be case insensitive", () => {
				expect(PaymentService.getPaymentMethodIcon("VISA")).toBe("💳");
				expect(PaymentService.getPaymentMethodIcon("MasterCard")).toBe("💳");
			});

			it("should return default icon for unknown brands", () => {
				expect(PaymentService.getPaymentMethodIcon("unknown-brand")).toBe("💳");
				expect(PaymentService.getPaymentMethodIcon("")).toBe("💳");
			});
		});

		describe("getPaymentStatusColor", () => {
			it("should return correct colors for different statuses", () => {
				expect(PaymentService.getPaymentStatusColor("completed")).toBe(
					"text-green-600",
				);
				expect(PaymentService.getPaymentStatusColor("pending")).toBe(
					"text-yellow-600",
				);
				expect(PaymentService.getPaymentStatusColor("failed")).toBe(
					"text-red-600",
				);
				expect(PaymentService.getPaymentStatusColor("canceled")).toBe(
					"text-gray-600",
				);
				expect(PaymentService.getPaymentStatusColor("processing")).toBe(
					"text-blue-600",
				);
			});

			it("should return default color for unknown status", () => {
				expect(PaymentService.getPaymentStatusColor("unknown")).toBe(
					"text-gray-600",
				);
				expect(PaymentService.getPaymentStatusColor("")).toBe("text-gray-600");
			});
		});

		describe("validatePaymentAmount", () => {
			it("should validate USD amounts correctly", () => {
				expect(PaymentService.validatePaymentAmount(0.5, "USD")).toBe(true);
				expect(PaymentService.validatePaymentAmount(100, "USD")).toBe(true);
				expect(PaymentService.validatePaymentAmount(999999, "USD")).toBe(true);
			});

			it("should reject amounts below minimum", () => {
				expect(PaymentService.validatePaymentAmount(0.49, "USD")).toBe(false);
				expect(PaymentService.validatePaymentAmount(0, "USD")).toBe(false);
				expect(PaymentService.validatePaymentAmount(-10, "USD")).toBe(false);
			});

			it("should reject amounts above maximum", () => {
				expect(PaymentService.validatePaymentAmount(1000000, "USD")).toBe(
					false,
				);
			});

			it("should handle different currency minimums", () => {
				expect(PaymentService.validatePaymentAmount(0.3, "GBP")).toBe(true);
				expect(PaymentService.validatePaymentAmount(0.29, "GBP")).toBe(false);
				expect(PaymentService.validatePaymentAmount(0.5, "EUR")).toBe(true);
				expect(PaymentService.validatePaymentAmount(0.49, "EUR")).toBe(false);
			});

			it("should use default minimum for unknown currencies", () => {
				expect(PaymentService.validatePaymentAmount(0.5, "XYZ")).toBe(true);
				expect(PaymentService.validatePaymentAmount(0.49, "XYZ")).toBe(false);
			});

			it("should default to USD when currency not specified", () => {
				expect(PaymentService.validatePaymentAmount(0.5)).toBe(true);
				expect(PaymentService.validatePaymentAmount(0.49)).toBe(false);
			});
		});
	});

	describe("Error Handling Patterns", () => {
		it("should consistently handle API errors across methods", async () => {
			const methods = [
				() =>
					PaymentService.createPaymentIntent({
						bookingId: "booking-123",
						amount: 50000,
					}),
				() => PaymentService.confirmPaymentIntent("pi_test_123"),
				() => PaymentService.getPaymentStatus("pi_test_123"),
				() => PaymentService.getBookingPayments("booking-123"),
				() =>
					PaymentService.createRefund({
						paymentIntentId: "pi_test_123",
						amount: 100,
					}),
				() => PaymentService.getPaymentHistory(),
				() => PaymentService.createSetupIntent(),
			];

			// Test API error response
			mockApiClient.post.mockResolvedValue({
				data: { success: false, message: "API Error" },
			});
			mockApiClient.get.mockResolvedValue({
				data: { success: false, message: "API Error" },
			});

			for (const method of methods) {
				await expect(method()).rejects.toThrow("API Error");
			}

			// Test network error
			const networkError = new Error("Network Error");
			mockApiClient.post.mockRejectedValue(networkError);
			mockApiClient.get.mockRejectedValue(networkError);

			for (const method of methods) {
				await expect(method()).rejects.toThrow("Network error occurred");
			}
		});

		it("should log errors to console", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			mockApiClient.post.mockRejectedValue(new Error("Test error"));

			await expect(
				PaymentService.createPaymentIntent({
					bookingId: "booking-123",
					amount: 50000,
				}),
			).rejects.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to create Square payment:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("Authentication Integration", () => {
		it("should include auth token in requests when available", () => {
			mockLocalStorage.getItem.mockReturnValue("test-auth-token");

			// Re-import to trigger interceptor
			delete require.cache[require.resolve("@/services/payment")];
			require("@/services/payment");

			expect(mockApiClient.interceptors.request.use).toHaveBeenCalled();

			// Test the interceptor function
			const interceptorFn =
				mockApiClient.interceptors.request.use.mock.calls[0][0];
			const config = { headers: {} };
			const result = interceptorFn(config);

			expect(result.headers.Authorization).toBe("Bearer test-auth-token");
		});

		it("should not include auth header when token is not available", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			// Re-import to trigger interceptor
			delete require.cache[require.resolve("@/services/payment")];
			require("@/services/payment");

			const interceptorFn =
				mockApiClient.interceptors.request.use.mock.calls[0][0];
			const config = { headers: {} };
			const result = interceptorFn(config);

			expect(result.headers.Authorization).toBeUndefined();
		});
	});
});
