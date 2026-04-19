import axios from 'axios';
import { logger } from '@/utils/logger';

export interface BookingData {
	hotelId: string;
	hotelName: string;
	hotelImage: string;
	roomType: string;
	roomId?: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	guests: {
		adults: number;
		children: number;
	};
	guestInfo: {
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	};
	specialRequests?: string;
	totalAmount: number;
	currency: string;
	paymentToken?: string;
	userId?: string;
}

export interface Booking {
	id: string;
	confirmationNumber: string;
	userId?: string;
	userEmail: string;
	hotelId: string;
	hotelName: string;
	hotelImage: string;
	hotelCity: string;
	roomType: string;
	roomId?: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	guests: {
		adults: number;
		children: number;
	};
	guestInfo: {
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	};
	specialRequests?: string;
	totalAmount: number;
	currency: string;
	commission?: number;
	status:
		| 'pending'
		| 'confirmed'
		| 'cancelled'
		| 'completed'
		| 'checked_in'
		| 'checked_out';
	paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
	isCancellable?: boolean;
	cancellationDeadline?: string;
	cancellationReason?: string;
	createdAt: string;
	updatedAt: string;
	confirmedAt?: string;
	cancelledAt?: string;
	paymentId?: string;
}

export interface BookingStats {
	totalBookings: number;
	upcomingBookings: number;
	completedBookings: number;
	cancelledBookings: number;
	totalSpent: number;
	currency: string;
}

export interface BookingHistoryFilters {
	startDate?: string;
	endDate?: string;
	status?: string;
}

export interface BookingHistoryResult {
	bookings: Booking[];
	summary: {
		totalBookings: number;
		totalSpent: number;
		averageRating?: number;
		favoriteDestination?: string;
	};
	filters?: {
		dateRange?: { start: string; end: string };
		status?: string;
	};
}

export interface AvailabilityParams {
	hotelId: string;
	checkIn: string;
	checkOut: string;
	guests: { adults: number; children: number };
}

export interface AvailabilityResult {
	available: boolean;
	rooms?: {
		roomId: string;
		available: boolean;
		price: number;
		originalPrice?: number;
		discount?: number;
	}[];
	restrictions?: string[];
	policies?: {
		checkIn: string;
		checkOut: string;
		minimumStay: number;
		maximumStay: number;
	};
	reason?: string;
}

export interface CancellationResult {
	booking: Booking;
	refundAmount: number;
	refundId?: string;
	policy?: {
		refundPercentage: number;
		cancellationFee: number;
		freecancellationHours: number;
	};
}

export interface PaginatedBookings {
	bookings: Booking[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

/** Immutable fields that cannot be updated after booking creation */
const IMMUTABLE_BOOKING_FIELDS: ReadonlyArray<string> = ['id', 'confirmationNumber', 'totalAmount', 'userId'];

class BookingService {
	/**
	 * Validate booking data. Throws descriptive Error on invalid data.
	 */
	validateBookingData(data: BookingData): void {
		if (!data.hotelId || !data.guestInfo?.firstName || !data.guestInfo?.lastName) {
			throw new Error('Missing required booking information');
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(data.guestInfo.email)) {
			throw new Error('Invalid email format');
		}

		const checkIn = new Date(data.checkIn);
		const checkOut = new Date(data.checkOut);
		if (checkOut <= checkIn) {
			throw new Error('Check-out date must be after check-in date');
		}

		if (!data.guests || data.guests.adults < 1) {
			throw new Error('At least one adult guest is required');
		}

		const phoneDigits = data.guestInfo.phone.replace(/[\s\-()+]/g, '');
		if (phoneDigits.length < 7) {
			throw new Error('Invalid phone number format');
		}

		if (data.specialRequests && data.specialRequests.length > 500) {
			throw new Error('Special requests too long');
		}
	}

	async createBooking(data: BookingData): Promise<Booking> {
		try {
			this.validateBookingData(data);
		} catch (error) {
			throw new Error(`Invalid booking data: ${(error as Error).message}`);
		}

		// Check for network/HTTP-level errors first
		const wrapNetworkError = (error: unknown): never => {
			if (error instanceof Error) {
				if (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout')) {
					throw new Error('Request timed out. Please try again.');
				}
				if (error.message.includes('ECONNREFUSED')) {
					throw new Error('Network error. Please check your connection.');
				}
			}
			const errObj = error as { response?: { status?: number } };
			if (errObj.response?.status === 429) {
				throw new Error('Too many requests. Please wait a moment and try again.');
			}
			if (errObj.response?.status && errObj.response.status >= 500) {
				throw new Error('Server error. Please try again later.');
			}
			logger.error('Booking creation failed', {
				component: 'BookingService',
				method: 'createBooking',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to create booking. Please try again.');
		};

		let response;
		try {
			response = await axios.post('/api/bookings', {
				...data,
				metadata: {
					userAgent: navigator.userAgent,
					timestamp: new Date().toISOString(),
				},
			});
		} catch (error) {
			wrapNetworkError(error);
		}

		if (response!.data.success) {
			logger.info('Booking created successfully', {
				component: 'BookingService',
				confirmationNumber: response!.data.booking.confirmationNumber,
			});
			return response!.data.booking;
		}

		throw new Error(response!.data.error || 'Failed to create booking');
	}

	async getBooking(id: string): Promise<Booking> {
		try {
			const response = await axios.get(`/api/bookings/${id}`);

			if (response.data.success) {
				return response.data.booking || response.data.data;
			}

			throw new Error(response.data.error || 'Booking not found');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to retrieve booking') {
				throw error;
			}
			logger.error('Failed to fetch booking', {
				component: 'BookingService',
				method: 'getBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to retrieve booking');
		}
	}

	async getBookingByConfirmation(confirmationNumber: string): Promise<Booking> {
		try {
			const response = await axios.get(
				`/api/bookings/confirmation/${confirmationNumber}`,
			);

			if (response.data.success) {
				return response.data.booking || response.data.data;
			}

			throw new Error(response.data.error || 'Booking not found');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to retrieve booking') {
				throw error;
			}
			throw new Error('Failed to retrieve booking');
		}
	}

	async getUserBookings(
		userId: string,
		page = 1,
		limit = 10,
		status?: string,
	): Promise<PaginatedBookings> {
		try {
			let url = `/api/bookings/user/${userId}?page=${page}&limit=${limit}`;
			if (status) {
url += `&status=${status}`;
}

			const response = await axios.get(url);

			if (response.data.success) {
				return {
					bookings: response.data.bookings || response.data.data || [],
					pagination: response.data.pagination,
				};
			}

			return {
				bookings: [],
				pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
			};
		} catch (error) {
			logger.error('Failed to fetch user bookings', {
				component: 'BookingService',
				method: 'getUserBookings',
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return {
				bookings: [],
				pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
			};
		}
	}

	async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
		const immutableFields = IMMUTABLE_BOOKING_FIELDS.filter(
			(field) => field in data,
		);
		if (immutableFields.length > 0) {
			throw new Error('Cannot update immutable booking fields');
		}

		try {
			const response = await axios.put(`/api/bookings/${id}`, data);

			if (response.data.success) {
				return response.data.booking;
			}

			throw new Error(response.data.error || 'Failed to update booking');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to update booking') {
				throw error;
			}
			logger.error('Booking update failed', {
				component: 'BookingService',
				method: 'updateBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to update booking');
		}
	}

	async cancelBooking(id: string, reason?: string): Promise<CancellationResult> {
		try {
			const response = await axios.put(`/api/bookings/${id}/cancel`, { reason });

			if (response.data.success) {
				logger.info('Booking cancelled successfully', { bookingId: id });
				return {
					booking: response.data.booking,
					refundAmount: response.data.refundAmount,
					refundId: response.data.refundId,
					policy: response.data.policy,
				};
			}

			throw new Error(response.data.error || 'Failed to cancel booking');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to cancel booking') {
				throw error;
			}
			logger.error('Booking cancellation failed', {
				component: 'BookingService',
				method: 'cancelBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to cancel booking');
		}
	}

	async getBookingHistory(
		userId: string,
		filters: BookingHistoryFilters = {},
	): Promise<BookingHistoryResult> {
		try {
			const params = new URLSearchParams();
			if (filters.startDate) {
params.append('startDate', filters.startDate);
}
			if (filters.endDate) {
params.append('endDate', filters.endDate);
}
			if (filters.status) {
params.append('status', filters.status);
}

			const url = `/api/bookings/user/${userId}/history?${params.toString()}`;
			const response = await axios.get(url);

			if (response.data.success) {
				return {
					bookings: response.data.bookings || [],
					summary: response.data.summary || { totalBookings: 0, totalSpent: 0 },
					filters: response.data.filters,
				};
			}

			throw new Error(response.data.error || 'Failed to get booking history');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to get booking history') {
				throw error;
			}
			logger.error('Failed to fetch booking history', {
				component: 'BookingService',
				method: 'getBookingHistory',
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to get booking history');
		}
	}

	async checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
		try {
			const response = await axios.post('/api/bookings/availability', params);

			if (response.data.success) {
				return {
					available: response.data.available,
					rooms: response.data.rooms,
					restrictions: response.data.restrictions,
					policies: response.data.policies,
					reason: response.data.reason,
				};
			}

			throw new Error(response.data.error || 'Failed to check availability');
		} catch (error) {
			if (error instanceof Error && error.message !== 'Failed to check availability') {
				throw error;
			}
			logger.error('Availability check failed', {
				component: 'BookingService',
				method: 'checkAvailability',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error('Failed to check availability');
		}
	}

	async getBookingStats(userId: string): Promise<BookingStats> {
		try {
			const response = await axios.get(`/api/bookings/user/${userId}/stats`);

			if (response.data.success) {
				return response.data.stats;
			}

			return {
				totalBookings: 0,
				upcomingBookings: 0,
				completedBookings: 0,
				cancelledBookings: 0,
				totalSpent: 0,
				currency: 'USD',
			};
		} catch (error) {
			logger.error('Failed to fetch booking stats', {
				component: 'BookingService',
				method: 'getBookingStats',
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return {
				totalBookings: 0,
				upcomingBookings: 0,
				completedBookings: 0,
				cancelledBookings: 0,
				totalSpent: 0,
				currency: 'USD',
			};
		}
	}

	calculateNights(checkIn: string, checkOut: string): number {
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	calculateTotalAmount(
		pricePerNight: number,
		nights: number,
		guests: number,
	): number {
		const baseAmount = pricePerNight * nights;
		const guestFee = guests > 2 ? (guests - 2) * 20 * nights : 0;
		const serviceFee = baseAmount * 0.1;
		return baseAmount + guestFee + serviceFee;
	}

	calculateCommission(totalAmount: number): number {
		return totalAmount * 0.05;
	}
}

export const bookingService = new BookingService();
