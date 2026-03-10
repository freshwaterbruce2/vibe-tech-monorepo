// Legacy Stripe import (optional)
let stripeService: any;
try {
	// Dynamically require so absence doesn't break build when stripe not configured

	stripeService = require('./stripe').stripeService;
} catch {
	stripeService = null;
}

import { and, eq } from 'drizzle-orm';
import { getDb } from '../database';
import {
    bookings,
    payments,
    refundRequests,
    refunds,
} from '../database/schema';
import { logger } from '../utils/logger';
import { CommissionService } from './commission';
import { emailService } from './emailService.js';

export interface RefundRequest {
	bookingId: string;
	reason: string;
	requestedAmount?: number;
	requestedBy: string;
	notes?: string;
	automaticProcessing: boolean;
}

export interface RefundCalculation {
	originalAmount: number;
	refundableAmount: number;
	cancellationFee: number;
	processingFee: number;
	finalRefundAmount: number;
	isEligible: boolean;
	reason: string;
}

export class RefundService {
	/**
	 * Calculate refund amount based on cancellation policy
	 */
	static calculateRefund(
		booking: any,
		cancellationDate: Date = new Date(),
	): RefundCalculation {
		const originalAmount = parseFloat(booking.totalAmount);
		const checkInDate = new Date(booking.checkIn);
		const cancellationDeadline = booking.cancellationDeadline
			? new Date(booking.cancellationDeadline)
			: new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before check-in

		const hoursUntilCheckIn = Math.floor(
			(checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60),
		);
		const isWithinCancellationWindow = cancellationDate <= cancellationDeadline;

		let refundableAmount = 0;
		let cancellationFee = 0;
		let reason = '';
		let isEligible = booking.isCancellable && booking.status === 'confirmed';

		if (!isEligible) {
			reason = 'Booking is not eligible for cancellation';
		} else if (!isWithinCancellationWindow) {
			reason = 'Cancellation deadline has passed';
			isEligible = false;
		} else {
			// Apply cancellation policy
			if (hoursUntilCheckIn >= 24) {
				// Free cancellation
				refundableAmount = originalAmount;
				reason = 'Free cancellation period';
			} else if (hoursUntilCheckIn >= 12) {
				// 50% refund
				refundableAmount = originalAmount * 0.5;
				cancellationFee = originalAmount * 0.5;
				reason = 'Partial refund - within 24 hours';
			} else if (hoursUntilCheckIn >= 0) {
				// No refund for same-day cancellations
				refundableAmount = 0;
				cancellationFee = originalAmount;
				reason = 'Same-day cancellation - no refund';
				isEligible = false;
			} else {
				// Check-in date has passed
				refundableAmount = 0;
				cancellationFee = originalAmount;
				reason = 'Check-in date has passed';
				isEligible = false;
			}
		}

		// Processing fee (usually a small fixed amount or percentage)
		const processingFee = Math.min(refundableAmount * 0.03, 25); // 3% or $25 max
		const finalRefundAmount = Math.max(0, refundableAmount - processingFee);

		return {
			originalAmount,
			refundableAmount,
			cancellationFee,
			processingFee,
			finalRefundAmount,
			isEligible,
			reason,
		};
	}

	/**
	 * Process automatic refund for eligible cancellations
	 */
	static async processAutomaticRefund(refundRequest: RefundRequest) {
		try {
			const db = getDb();
			logger.info('Processing automatic refund', {
				bookingId: refundRequest.bookingId,
				requestedBy: refundRequest.requestedBy,
				reason: refundRequest.reason,
			});

			// Get booking details
			const booking = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, refundRequest.bookingId))
				.limit(1);

			if (!booking.length) {
				throw new Error('Booking not found');
			}

			const bookingData = booking[0];

			// Calculate refund amount
			const refundCalculation = RefundService.calculateRefund(bookingData);

			if (!refundCalculation.isEligible) {
				throw new Error(`Refund not eligible: ${refundCalculation.reason}`);
			}

			// Use requested amount if specified and valid
			const refundAmount =
				refundRequest.requestedAmount &&
				refundRequest.requestedAmount <= refundCalculation.finalRefundAmount
					? refundRequest.requestedAmount
					: refundCalculation.finalRefundAmount;

			if (refundAmount <= 0) {
				throw new Error('No refund amount available');
			}

			// Get the payment record
			const payment = await db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.bookingId, refundRequest.bookingId),
						eq(payments.status, 'completed'),
					),
				)
				.limit(1);

			if (!payment.length) {
				throw new Error('No completed payment found for booking');
			}

			const paymentData = payment[0];

			// Process refund through Stripe
			if (!stripeService) {
				throw new Error('Stripe not configured');
			}
			const stripeRefund = await stripeService.createRefund({
				paymentIntentId: paymentData.transactionId,
				amount: refundAmount,
				reason: 'requested_by_customer',
				bookingId: refundRequest.bookingId,
				processedBy: refundRequest.requestedBy,
				metadata: {
					automaticProcessing: 'true',
					cancellationReason: refundRequest.reason,
					originalAmount: refundCalculation.originalAmount.toString(),
					cancellationFee: refundCalculation.cancellationFee.toString(),
					processingFee: refundCalculation.processingFee.toString(),
					notes: refundRequest.notes || '',
				},
			});

			// Update booking status
			await db
				.update(bookings)
				.set({
					status: 'cancelled',
					cancelledAt: new Date(),
					cancellationReason: refundRequest.reason,
					updatedAt: new Date(),
				})
				.where(eq(bookings.id, refundRequest.bookingId));

			// Reverse commission
			await CommissionService.reverseCommission(paymentData.id, refundAmount);

			// Send notification emails
			await RefundService.sendRefundNotifications(
				bookingData,
				stripeRefund,
				refundCalculation,
			);

			logger.info('Automatic refund processed successfully', {
				bookingId: refundRequest.bookingId,
				refundId: stripeRefund.id,
				refundAmount,
				originalAmount: refundCalculation.originalAmount,
			});

			return {
				success: true,
				refund: stripeRefund,
				calculation: refundCalculation,
				refundAmount,
			};
		} catch (error) {
			logger.error('Automatic refund processing failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId: refundRequest.bookingId,
				requestedBy: refundRequest.requestedBy,
			});
			throw error;
		}
	}

	/**
	 * Create manual refund request for admin review
	 */
	static async createManualRefundRequest(refundRequest: RefundRequest) {
		try {
			const db = getDb();
			// Get booking details
			const [bookingData] = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, refundRequest.bookingId))
				.limit(1);

			if (!bookingData) {
				throw new Error('Booking not found');
			}

			const refundCalculation = RefundService.calculateRefund(bookingData);

			// Create refund request record (you would need to create this table)
			// For now, we'll just log it and return the calculation

			logger.info('Manual refund request created', {
				bookingId: refundRequest.bookingId,
				requestedBy: refundRequest.requestedBy,
				reason: refundRequest.reason,
				calculation: refundCalculation,
			});

			// Create refund request record in database
			// const db = await getDb();
			const _refundRequestRecord = await db
				.insert(refundRequests)
				.values({
					bookingId: refundRequest.bookingId,
					// @ts-ignore - payments might not be on bookingData
					paymentId: (bookingData as any).payments?.[0]?.id || '', // Assuming first payment
					requestedBy: refundRequest.requestedBy,
					// @ts-ignore - refundAmount might not be on refundCalculation
					amount: (refundCalculation as any).refundAmount?.toString() || '0',
					reason: refundRequest.reason,
					status: 'pending',
				})
				.returning();

			// Send notification to admin team
			await emailService.sendEmail({
				to: process.env.ADMIN_EMAIL || 'admin@vibebooking.com',
				template: {
					subject: `New Refund Request - ${refundRequest.bookingId}`,
					html: `
            <h2>New Refund Request</h2>
            <p><strong>Booking ID:</strong> ${refundRequest.bookingId}</p>
            <p><strong>Amount:</strong> ${((refundCalculation as any).refundAmount || 0).toFixed(2)}</p>
            <p><strong>Reason:</strong> ${refundRequest.reason}</p>
            <p><strong>Requested by:</strong> ${refundRequest.requestedBy}</p>
            <p>Please review this refund request in the admin panel.</p>
          `,
					text: `New Refund Request\n\nBooking ID: ${refundRequest.bookingId}\nAmount: ${((refundCalculation as any).refundAmount || 0).toFixed(2)}\nReason: ${refundRequest.reason}\nRequested by: ${refundRequest.requestedBy}\n\nPlease review this refund request in the admin panel.`,
				},
			});

			return {
				success: true,
				requestId: `req_${Date.now()}`,
				calculation: refundCalculation,
				status: 'pending_review',
			};
		} catch (error) {
			logger.error('Manual refund request creation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId: refundRequest.bookingId,
				requestedBy: refundRequest.requestedBy,
			});
			throw error;
		}
	}

	/**
	 * Cancel booking and process refund
	 */
	static async cancelBookingWithRefund(
		bookingId: string,
		cancellationReason: string,
		requestedBy: string,
		notes?: string,
	) {
		try {
			const db = getDb();
			// Get booking details
			const booking = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, bookingId))
				.limit(1);

			if (!booking.length) {
				throw new Error('Booking not found');
			}

			const bookingData = booking[0];

			// Check current status
			if (bookingData.status === 'cancelled') {
				throw new Error('Booking is already cancelled');
			}

			if (bookingData.status !== 'confirmed') {
				throw new Error('Only confirmed bookings can be cancelled');
			}

			// Calculate refund
			const refundCalculation = RefundService.calculateRefund(bookingData);

			// Determine if automatic processing is appropriate
			const shouldProcessAutomatically =
				refundCalculation.isEligible &&
				refundCalculation.finalRefundAmount > 0 &&
				refundCalculation.finalRefundAmount ===
					refundCalculation.refundableAmount; // Full or standard refund

			if (shouldProcessAutomatically) {
				// Process automatic refund
				return await RefundService.processAutomaticRefund({
					bookingId,
					reason: cancellationReason,
					requestedBy,
					notes,
					automaticProcessing: true,
				});
			} else {
				// Create manual refund request for admin review
				return await RefundService.createManualRefundRequest({
					bookingId,
					reason: cancellationReason,
					requestedBy,
					notes,
					automaticProcessing: false,
				});
			}
		} catch (error) {
			logger.error('Booking cancellation with refund failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId,
				cancellationReason,
				requestedBy,
			});
			throw error;
		}
	}

	/**
	 * Get refund history for a booking
	 */
	static async getRefundHistory(bookingId: string) {
		try {
			const db = getDb();
			const refundList = await db
				.select()
				.from(refunds)
				.where(eq(refunds.bookingId, bookingId))
				.orderBy(refunds.createdAt);

			return refundList;
		} catch (error) {
			logger.error('Failed to get refund history', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId,
			});
			throw error;
		}
	}

	/**
	 * Send refund notification emails
	 */
	private static async sendRefundNotifications(
		booking: any,
		refund: any,
		calculation: RefundCalculation,
	) {
		try {
			// Send refund notification email to guest
			await emailService.sendRefundNotification(booking.guestEmail, {
				bookingId: booking.confirmationNumber,
				refundAmount: refund.amount / 100,
				reason: refund.reason || 'Refund processed',
				processingTime: '3-5 business days',
				guestName: booking.guestName,
			});
			logger.info('Sending refund notifications', {
				bookingId: booking.id,
				guestEmail: booking.guestEmail,
				refundAmount: refund.amount / 100,
			});

			// Send to guest
			const guestEmailData = {
				to: booking.guestEmail,
				subject: `Refund Processed - Booking ${booking.confirmationNumber}`,
				template: 'refund-confirmation',
				data: {
					guestName: `${booking.guestFirstName} ${booking.guestLastName}`,
					confirmationNumber: booking.confirmationNumber,
					hotelName: booking.hotelName,
					originalAmount: calculation.originalAmount,
					refundAmount: refund.amount / 100,
					processingTime: '5-10 business days',
					refundId: refund.id,
				},
			};

			// Send to admin team
			const adminEmailData = {
				to: 'admin@hotelbooking.com',
				subject: `Refund Processed - ${booking.confirmationNumber}`,
				template: 'refund-admin-notification',
				data: {
					bookingId: booking.id,
					confirmationNumber: booking.confirmationNumber,
					guestName: `${booking.guestFirstName} ${booking.guestLastName}`,
					hotelName: booking.hotelName,
					refundAmount: refund.amount / 100,
					cancellationReason: booking.cancellationReason,
					refundId: refund.id,
				},
			};

			// Send admin notification email
			await emailService.sendEmail({
				to: adminEmailData.to,
				template: {
					subject: adminEmailData.subject,
					html: `
            <h2>Refund Processed</h2>
            <p><strong>Booking:</strong> ${adminEmailData.data.confirmationNumber}</p>
            <p><strong>Guest:</strong> ${adminEmailData.data.guestName}</p>
            <p><strong>Hotel:</strong> ${adminEmailData.data.hotelName}</p>
            <p><strong>Refund Amount:</strong> $${adminEmailData.data.refundAmount.toFixed(2)}</p>
            <p><strong>Refund ID:</strong> ${adminEmailData.data.refundId}</p>
          `,
					text: `Refund Processed\n\nBooking: ${adminEmailData.data.confirmationNumber}\nGuest: ${adminEmailData.data.guestName}\nHotel: ${adminEmailData.data.hotelName}\nRefund Amount: $${adminEmailData.data.refundAmount.toFixed(2)}\nRefund ID: ${adminEmailData.data.refundId}`,
				},
			});
			logger.info('Refund notification emails queued', {
				guestEmail: guestEmailData.to,
				adminEmail: adminEmailData.to,
			});
		} catch (error) {
			logger.error('Failed to send refund notifications', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId: booking.id,
			});
			// Don't throw error as refund was successful
		}
	}

	/**
	 * Get refund statistics for admin dashboard
	 */
	static async getRefundStatistics(
		startDate: Date,
		endDate: Date,
		currency = 'USD',
	) {
		try {
			// This would involve complex queries in a real implementation
			// For now, returning mock data structure

			return {
				totalRefunds: 0,
				totalRefundAmount: 0,
				automaticRefunds: 0,
				manualRefunds: 0,
				averageRefundAmount: 0,
				refundRate: 0, // Percentage of bookings that get refunded
				processingTime: {
					average: 3.2, // days
					fastest: 1,
					slowest: 10,
				},
				refundReasons: [
					{ reason: 'change_of_plans', count: 45, percentage: 35 },
					{ reason: 'emergency', count: 32, percentage: 25 },
					{ reason: 'weather', count: 20, percentage: 15 },
					{ reason: 'illness', count: 18, percentage: 14 },
					{ reason: 'other', count: 14, percentage: 11 },
				],
				period: {
					startDate,
					endDate,
					currency,
				},
			};
		} catch (error) {
			logger.error('Failed to get refund statistics', {
				error: error instanceof Error ? error.message : 'Unknown error',
				startDate,
				endDate,
				currency,
			});
			throw error;
		}
	}
}

export default RefundService;
