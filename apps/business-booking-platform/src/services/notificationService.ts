import { toast } from 'sonner';

export interface NotificationOptions {
	title?: string;
	description?: string;
	type?: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

class NotificationService {
	success(message: string, options?: NotificationOptions) {
		toast.success(message, {
			description: options?.description,
			duration: options?.duration || 5000,
		});
	}

	error(message: string, options?: NotificationOptions) {
		toast.error(message, {
			description: options?.description,
			duration: options?.duration || 5000,
		});
	}

	info(message: string, options?: NotificationOptions) {
		toast.info(message, {
			description: options?.description,
			duration: options?.duration || 5000,
		});
	}

	warning(message: string, options?: NotificationOptions) {
		toast.warning(message, {
			description: options?.description,
			duration: options?.duration || 5000,
		});
	}

	custom(message: string, options?: NotificationOptions) {
		toast(message, {
			description: options?.description,
			duration: options?.duration || 5000,
		});
	}

	async sendBookingConfirmation(
		_userId: string,
		_bookingId: string,
		confirmationNumber: string,
		hotelName: string,
	) {
		this.success('Booking Confirmed!', {
			description: `Your booking at ${hotelName} has been confirmed. Confirmation #${confirmationNumber}`,
		});
	}

	async sendBookingCancellation(
		_bookingId: string,
		hotelName: string,
		_totalAmount: number,
		reason?: string,
	) {
		this.info('Booking Cancelled', {
			description: `Your booking at ${hotelName} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
		});
	}
}

export const notificationService = new NotificationService();
