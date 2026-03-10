import axios from 'axios';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { notificationService } from './notificationService';

// Use proxy in development, direct URL in production
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment
	? ''
	: import.meta.env.VITE_API_URL || 'http://localhost:4002';

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
	commission: number;
	status:
		| 'pending'
		| 'confirmed'
		| 'cancelled'
		| 'completed'
		| 'checked_in'
		| 'checked_out';
	paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
	isCancellable: boolean;
	cancellationDeadline?: string;
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

class BookingService {
	private getAuthHeaders() {
		const authToken = localStorage.getItem('authToken');
		return authToken ? { Authorization: `Bearer ${authToken}` } : {};
	}

	async createBooking(data: BookingData): Promise<Booking> {
		try {
			logger.info('Creating booking:', {
				hotelName: data.hotelName,
				checkIn: data.checkIn,
				userId: data.userId || 'guest',
			});

			const response = await axios.post(`${API_URL}/api/bookings`, data, {
				headers: {
					...this.getAuthHeaders(),
					'Content-Type': 'application/json',
				},
			});

			if (response.data.success) {
				const {booking} = response.data;
				logger.info('Booking created successfully:', {
					confirmationNumber: booking.confirmationNumber,
				});

				// Send booking confirmation notification
				if (data.userId) {
					await notificationService.sendBookingConfirmation(
						data.userId,
						booking.id,
						booking.confirmationNumber,
						data.hotelName,
					);
				} else {
					// Show toast for guest bookings
					toast.success(
						`Booking confirmed! Confirmation #${booking.confirmationNumber}`,
						{
							duration: 5000,
						},
					);
				}

				return booking;
			}
			throw new Error('Failed to create booking');
		} catch (error: any) {
			logger.error('Booking creation failed:', error);
			const errorMessage = error.response?.data?.error || 'Booking failed';
			toast.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	async getUserBookings(userId: string, status?: string): Promise<Booking[]> {
		try {
			const params: any = {};
			if (status) {
params.status = status;
}

			const response = await axios.get(
				`${API_URL}/api/bookings/user/${userId}`,
				{
					params,
					headers: this.getAuthHeaders(),
				},
			);

			if (response.data.success) {
				const bookings = response.data.bookings || response.data.data || [];
				logger.info('Retrieved user bookings:', {
					userId,
					count: bookings.length,
				});
				return bookings;
			}
			return [];
		} catch (error) {
			logger.error('Failed to fetch user bookings', {
				component: 'BookingService',
				method: 'getUserBookings',
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			toast.error('Failed to load booking history');
			return [];
		}
	}

	async getBookings(): Promise<Booking[]> {
		try {
			const response = await axios.get(`${API_URL}/api/bookings`, {
				headers: this.getAuthHeaders(),
			});
			if (response.data.success) {
				return response.data.data || response.data.bookings || [];
			}
			return [];
		} catch (error) {
			logger.error('Failed to fetch bookings', {
				component: 'BookingService',
				method: 'getBookings',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return [];
		}
	}

	async getBooking(id: string): Promise<Booking | null> {
		try {
			const response = await axios.get(`${API_URL}/api/bookings/${id}`, {
				headers: this.getAuthHeaders(),
			});
			if (response.data.success) {
				return response.data.booking || response.data.data;
			}
			return null;
		} catch (error) {
			logger.error('Failed to fetch individual booking', {
				component: 'BookingService',
				method: 'getBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return null;
		}
	}

	async getBookingByConfirmation(
		confirmationNumber: string,
	): Promise<Booking | null> {
		try {
			const response = await axios.get(
				`${API_URL}/api/bookings/confirmation/${confirmationNumber}`,
			);

			if (response.data.success) {
				const booking = response.data.booking || response.data.data;
				logger.info('Retrieved booking by confirmation:', {
					confirmationNumber,
				});
				return booking;
			}
			return null;
		} catch (error) {
			logger.error('Failed to retrieve booking by confirmation:', error);
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				toast.error('Booking not found');
			} else {
				toast.error('Failed to retrieve booking');
			}
			return null;
		}
	}

	async cancelBooking(id: string, reason?: string): Promise<boolean> {
		try {
			const response = await axios.put(
				`${API_URL}/api/bookings/${id}/cancel`,
				{ reason },
				{ headers: this.getAuthHeaders() },
			);

			if (response.data.success) {
				logger.info('Booking cancelled successfully:', { bookingId: id });

				// Send cancellation notification if user is authenticated
				const authToken = localStorage.getItem('authToken');
				if (authToken) {
					// Get booking details for notification
					const booking = await this.getBooking(id);
					if (booking && booking.userId) {
						await notificationService.sendBookingCancellation(
							booking.id,
							booking.hotelName,
							booking.totalAmount, // Assume full refund for demo
						);
					}
				} else {
					toast.success('Booking cancelled successfully');
				}

				return true;
			}
			return false;
		} catch (error: any) {
			logger.error('Booking cancellation failed', {
				component: 'BookingService',
				method: 'cancelBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			const errorMessage =
				error.response?.data?.message || 'Failed to cancel booking';
			toast.error(errorMessage);
			return false;
		}
	}

	async confirmBooking(id: string): Promise<Booking | null> {
		try {
			const response = await axios.put(
				`${API_URL}/api/bookings/${id}/confirm`,
				{},
				{
					headers: this.getAuthHeaders(),
				},
			);
			if (response.data.success) {
				toast.success('Booking confirmed successfully');
				return response.data.booking;
			}
			return null;
		} catch (error) {
			logger.error('Booking confirmation failed', {
				component: 'BookingService',
				method: 'confirmBooking',
				bookingId: id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			toast.error('Failed to confirm booking');
			return null;
		}
	}

	async getBookingStats(userId: string): Promise<BookingStats> {
		try {
			const response = await axios.get(
				`${API_URL}/api/bookings/user/${userId}/stats`,
				{
					headers: this.getAuthHeaders(),
				},
			);

			if (response.data.success) {
				const {stats} = response.data;
				logger.info('Retrieved booking stats:', { userId, stats });
				return stats;
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
			logger.error('Failed to fetch booking stats:', error);
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

	async searchBookings(query: {
		userId?: string;
		startDate?: string;
		endDate?: string;
		status?: string;
		hotelName?: string;
		confirmationNumber?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ bookings: Booking[]; total: number }> {
		try {
			const response = await axios.get(`${API_URL}/api/bookings/search`, {
				params: query,
				headers: this.getAuthHeaders(),
			});

			if (response.data.success) {
				const {result} = response.data;
				logger.info('Booking search completed:', {
					query: query.hotelName || query.confirmationNumber || 'general',
					count: result.bookings.length,
				});

				return result;
			}

			return { bookings: [], total: 0 };
		} catch (error) {
			logger.error('Failed to search bookings:', error);
			toast.error('Failed to search bookings');
			return { bookings: [], total: 0 };
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
		const serviceFee = baseAmount * 0.1; // 10% service fee
		return baseAmount + guestFee + serviceFee;
	}

	calculateCommission(totalAmount: number): number {
		return totalAmount * 0.05; // 5% commission
	}
}

export const bookingService = new BookingService();
