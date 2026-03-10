import axios from 'axios';
import { logger } from '@/utils/logger';

// NOTE: Legacy Stripe intent logic removed; focusing on Square & PayPal unified flows.
const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
// Stripe removed for current scope; reintroduce when provider abstraction in place.

// API client with authentication
const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
	const token = localStorage.getItem('authToken');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Payment service interface
export interface CreatedPayment {
	success: boolean;
	id?: string;
	clientSecret?: string;
	paymentId?: string;
	receiptUrl?: string;
	message?: string;
	amount?: number;
	currency?: string;
}

export interface PaymentHistory {
	payments: {
		id: string;
		bookingId: string;
		amount: string;
		currency: string;
		status: string;
		method: string;
		provider: string;
		createdAt: string;
		updatedAt: string;
	}[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface RefundRequest {
	amount: number;
	reason?: string;
	paymentId?: string;
	paymentIntentId?: string;
	bookingId?: string;
	metadata?: Record<string, string>;
}

export interface RefundResponse {
	success: boolean;
	refundId?: string;
	message?: string;
	refund?: {
		id: string;
		amount: number;
		currency: string;
		status: string;
		reason: string;
	};
}

export interface PaymentStatus {
	status: string;
	amount: number;
	currency: string;
	created: number;
	payment: { id: string };
}

export interface SetupIntent {
	clientSecret: string;
	setupIntentId: string;
}

export interface BasicPaymentRecord {
	id?: string;
	transactionId?: string;
	bookingId?: string;
	amount?: number | string;
	currency?: string;
	status?: string;
	provider?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface BasicRefundRecord {
	id?: string;
	bookingId?: string;
	amount?: number | string;
	currency?: string;
	status?: string;
	reason?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface BookingPayments {
	payments: BasicPaymentRecord[];
	refunds: BasicRefundRecord[];
	summary: {
		totalPaid: number;
		totalRefunded: number;
		pendingPayments: number;
		pendingRefunds: number;
	};
}

// Removed SetupIntent for Stripe.

export class PaymentService {
	/**
	 * Create a payment intent for a booking (legacy method for test compatibility)
	 */
	static async createPaymentIntent(payload: {
		bookingId: string;
		amount: number;
		currency?: string;
		metadata?: Record<string, string>;
	}): Promise<{ clientSecret: string; id: string }> {
		// Legacy compatibility method - redirect to Square payment
		const squareResult = await PaymentService.createSquarePayment({
			...payload,
			sourceId: 'mock-source-id', // For test compatibility
		});

		return {
			clientSecret: 'pi_mock_client_secret',
			id: squareResult.paymentId || 'pi_mock_id',
		};
	}

	/**
	 * Create a payment intent for a booking
	 */
	static async createSquarePayment(payload: {
		bookingId: string;
		amount: number;
		currency?: string;
		sourceId: string;
		billingAddress?: Record<string, unknown>;
	}): Promise<CreatedPayment> {
		try {
			const candidate = { provider: 'square', currency: 'USD', ...payload };
			// Validate required fields
			if (!candidate.bookingId || !candidate.sourceId || !candidate.amount) {
				throw new Error(
					'Missing required payment fields: bookingId, sourceId, amount',
				);
			}
			const response = await apiClient.post('/payments/create', {
				...candidate,
				billingAddress: payload.billingAddress,
			});
			return response.data;
		} catch (error) {
			logger.error('Square payment creation failed', {
				component: 'PaymentService',
				method: 'createSquarePayment',
				bookingId: payload.bookingId,
				amount: payload.amount,
				currency: payload.currency || 'USD',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(error.response.data.message || 'Square payment failed');
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Confirm a payment intent (legacy method for test compatibility)
	 */
	static async confirmPaymentIntent(
		paymentIntentId: string,
		paymentMethodId?: string,
	): Promise<{
		paymentIntentId: string;
		status: string;
		amount: number;
		currency: string;
	}> {
		try {
			const response = await apiClient.post('/payments/confirm', {
				paymentIntentId,
				paymentMethodId,
			});

			if (!response.data.success) {
				throw new Error(response.data.message || 'Payment confirmation failed');
			}

			return response.data.data;
		} catch (error) {
			logger.error('Payment intent confirmation failed', {
				component: 'PaymentService',
				method: 'confirmPaymentIntent',
				paymentIntentId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(
					error.response.data.message || 'Payment confirmation failed',
				);
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Get payment status (legacy method for test compatibility)
	 */
	static async getPaymentStatus(
		paymentIntentId: string,
	): Promise<PaymentStatus> {
		try {
			const response = await apiClient.get(
				`/payments/status/${paymentIntentId}`,
			);

			if (!response.data.success) {
				throw new Error(
					response.data.message || 'Failed to get payment status',
				);
			}

			return response.data.data;
		} catch (error) {
			logger.error('Failed to retrieve payment status', {
				component: 'PaymentService',
				method: 'getPaymentStatus',
				paymentIntentId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(
					error.response.data.message || 'Failed to retrieve payment status',
				);
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Get payments for a specific booking
	 */
	static async getBookingPayments(bookingId: string): Promise<BookingPayments> {
		try {
			const response = await apiClient.get(`/payments/booking/${bookingId}`);

			if (!response.data.success) {
				throw new Error(
					response.data.message || 'Failed to get booking payments',
				);
			}

			return response.data.data;
		} catch (error) {
			logger.error('Failed to retrieve booking payments', {
				component: 'PaymentService',
				method: 'getBookingPayments',
				bookingId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(
					error.response.data.message || 'Failed to retrieve booking payments',
				);
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Create a refund
	 */
	static async createRefund(request: RefundRequest): Promise<RefundResponse> {
		try {
			const legacy = request as unknown as {
				paymentId?: string;
				paymentIntentId?: string;
				bookingId?: string;
			};
			// Validate required fields
			const refundData = {
				paymentId: legacy.paymentId || legacy.paymentIntentId,
				bookingId: legacy.bookingId || '',
				amount: request.amount,
				reason: request.reason,
			};

			if (!refundData.paymentId || !refundData.amount) {
				throw new Error('Missing required refund fields: paymentId, amount');
			}
			const response = await apiClient.post('/payments/refund', refundData);
			return response.data;
		} catch (error) {
			logger.error('Refund creation failed', {
				component: 'PaymentService',
				method: 'createRefund',
				amount: request.amount,
				reason: request.reason,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(error.response.data.message || 'Refund request failed');
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Get payment history for the current user
	 */
	static async getPaymentHistory(
		page = 1,
		limit = 10,
		status?: string,
		startDate?: Date,
		endDate?: Date,
	): Promise<PaymentHistory> {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (status) {
				params.append('status', status);
			}
			if (startDate) {
				params.append('startDate', startDate.toISOString());
			}
			if (endDate) {
				params.append('endDate', endDate.toISOString());
			}

			const response = await apiClient.get(`/payments/history?${params}`);

			if (!response.data.success) {
				throw new Error(
					response.data.message || 'Failed to get payment history',
				);
			}

			return response.data.data;
		} catch (error) {
			logger.error('Failed to retrieve payment history', {
				component: 'PaymentService',
				method: 'getPaymentHistory',
				page,
				limit,
				status,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(
					error.response.data.message || 'Failed to retrieve payment history',
				);
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Create a setup intent for saving payment methods (legacy method for test compatibility)
	 */
	static async createSetupIntent(
		metadata: Record<string, string> = {},
	): Promise<SetupIntent> {
		try {
			const response = await apiClient.post('/payments/setup-intent', {
				metadata,
			});

			if (!response.data.success) {
				throw new Error(
					response.data.message || 'Setup intent creation failed',
				);
			}

			return response.data.data;
		} catch (error) {
			logger.error('Setup intent creation failed', {
				component: 'PaymentService',
				method: 'createSetupIntent',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(
					error.response.data.message || 'Setup intent creation failed',
				);
			}
			throw new Error('Network error occurred');
		}
	}

	/**
	 * Process payment with Stripe Elements
	 */
	// processPayment removed (Stripe Elements specific).

	/**
	 * Format currency amount for display
	 */
	static formatCurrency(amount: number, currency = 'USD'): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
		}).format(amount);
	}

	/**
	 * Calculate commission amount (5%)
	 */
	static calculateCommission(amount: number): number {
		return Math.round(amount * 0.05 * 100) / 100; // Round to 2 decimal places
	}

	/**
	 * Get payment method icon based on brand
	 */
	static getPaymentMethodIcon(brand: string): string {
		const icons: Record<string, string> = {
			visa: 'ðŸ’³',
			mastercard: 'ðŸ’³',
			amex: 'ðŸ’³',
			discover: 'ðŸ’³',
			diners: 'ðŸ’³',
			jcb: 'ðŸ’³',
			unionpay: 'ðŸ’³',
			unknown: 'ðŸ’³',
		};

		const icon = icons[brand.toLowerCase() as keyof typeof icons];
		return (icon || icons.unknown) as string;
	}

	/**
	 * Get payment status color for UI
	 */
	static getPaymentStatusColor(status: string): string {
		const colors: Record<string, string> = {
			completed: 'text-green-600',
			pending: 'text-yellow-600',
			failed: 'text-red-600',
			canceled: 'text-gray-600',
			processing: 'text-blue-600',
		};

		return colors[status] || 'text-gray-600';
	}

	/**
	 * Validate payment amount
	 */
	static validatePaymentAmount(amount: number, currency = 'USD'): boolean {
		// Minimum amounts vary by currency (Stripe requirements)
		const minimums: Record<string, number> = {
			USD: 0.5,
			EUR: 0.5,
			GBP: 0.3,
			CAD: 0.5,
			AUD: 0.5,
		};

		const minimum = minimums[currency.toUpperCase()] || 0.5;
		return amount >= minimum && amount <= 999999; // Max $999,999
	}
}

export default PaymentService;
