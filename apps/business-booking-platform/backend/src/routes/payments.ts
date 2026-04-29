import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database';
import { bookings, payments, refunds } from '../database/schema';
import { validateRequest } from '../middleware/validateRequest';
import { logger } from '../utils/logger';

export const paymentsRouter = Router();

type PaymentRecord = typeof payments.$inferSelect;
type RefundRecord = typeof refunds.$inferSelect;

import { paypalService } from '../services/paypalService';
import { pdfService } from '../services/pdfService.js';
// Square payment service (primary provider)
import { squarePaymentService } from '../services/squarePaymentService';

// Validation schemas (Square)
const createPaymentSchema = z.object({
	sourceId: z.string(),
	amount: z.number().positive(),
	bookingId: z.string().uuid(),
	provider: z.string().optional().default('square'),
	currency: z.string().optional().default('USD'),
	metadata: z.record(z.string(), z.string()).optional(),
	billingAddress: z
		.object({
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			addressLine1: z.string().optional(),
			addressLine2: z.string().optional(),
			locality: z.string().optional(),
			administrativeDistrictLevel1: z.string().optional(),
			postalCode: z.string().optional(),
			country: z.string().optional(),
		})
		.optional(),
});

const createRefundSchema = z.object({
	paymentId: z.string(), // Square payment ID
	amount: z.number().positive().optional(),
	reason: z.string().default('Hotel booking cancellation'),
	bookingId: z.string().uuid(),
});

// PayPal minimal schemas
const createPayPalOrderSchema = z.object({
	bookingId: z.string().uuid(),
	amount: z.number().positive(),
	currency: z.string().length(3).default('USD'),
});
const capturePayPalOrderSchema = z.object({
	orderId: z.string(),
});

const isSimulatedPayPalEnabled = (): boolean =>
	process.env.NODE_ENV !== 'production' &&
	process.env.PAYPAL_ENABLE_SIMULATED === 'true';

// Removed Stripe-specific schemas (confirm intent, stats, setup intents)

/**
 * POST /api/payments/create
 * Create & capture a Square payment for a booking
 */
paymentsRouter.post(
	'/create',
	validateRequest(createPaymentSchema),
	async (req: Request, res: Response) => {
		try {
			const {
				bookingId,
				sourceId,
				amount,
				currency,
				metadata = {},
				billingAddress,
			} = req.body;
			const userId = req.user?.id;

			// Verify booking exists and belongs to user (or is accessible)
			const db = await getDb();
			const booking = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, bookingId))
				.limit(1);

			if (!booking.length) {
				return res.status(404).json({
					error: 'Booking not found',
					message: 'The specified booking does not exist',
				});
			}

			const bookingData = booking[0];

			// Check if user has access to this booking
			if (userId && bookingData.userId && bookingData.userId !== userId) {
				return res.status(403).json({
					error: 'Access denied',
					message:
						'You do not have permission to make payment for this booking',
				});
			}

			// Idempotency: if there's already a succeeded payment for this booking, return it
			const existingSucceeded = await db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.bookingId, bookingId),
						eq(payments.status, 'succeeded'),
					),
				)
				.limit(1);
			if (existingSucceeded.length) {
				return res.json({
					success: true,
					paymentId: existingSucceeded[0].transactionId,
					message: 'Payment already completed for this booking',
				});
			}

			// Check if booking is in a payable state now
			if (
				!['pending', 'payment_failed', 'reserved'].includes(bookingData.status)
			) {
				return res.status(400).json({
					error: 'Invalid booking status',
					message: `Cannot make payment for booking with status: ${bookingData.status}`,
				});
			}

			// Process Square payment
			const result = await squarePaymentService.createPayment({
				sourceId,
				amount,
				currency,
				bookingId,
				userId,
				billingAddress,
				metadata: {
					...metadata,
					email: bookingData.guestEmail,
					confirmationNumber: bookingData.confirmationNumber,
					guestName: `${bookingData.guestFirstName} ${bookingData.guestLastName}`,
				},
			});

			if (result.success) {
				// Only confirm booking if payment succeeded immediately
				if (result.paymentId) {
					const newlyCreated = await db
						.select()
						.from(payments)
						.where(
							and(
								eq(payments.bookingId, bookingId),
								eq(payments.transactionId, result.paymentId),
							),
						)
						.limit(1);
					const paymentStatus = newlyCreated[0]?.status;
					if (paymentStatus === 'succeeded') {
						await db
							.update(bookings)
							.set({
								status: 'confirmed',
								updatedAt: new Date(),
							})
							.where(eq(bookings.id, bookingId));
					}
				}
				return res.json({
					success: true,
					paymentId: result.paymentId,
					receiptUrl: result.receiptUrl,
					message: 'Payment processed',
				});
			} else {
				return res.status(400).json({
					success: false,
					error: result.errorMessage || 'Payment processing failed',
				});
			}
		} catch (error) {
			logger.error('Failed to process Square payment', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: req.user?.id,
				body: req.body,
			});

			return res.status(500).json({
				success: false,
				error: 'Payment processing failed',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

// Removed Stripe-specific confirm/status endpoints

/**
 * POST /api/payments/paypal/order
 * Create a simulated PayPal order when explicitly enabled for local testing.
 */
paymentsRouter.post(
	'/paypal/order',
	validateRequest(createPayPalOrderSchema),
	async (req: Request, res: Response) => {
		try {
			if (!isSimulatedPayPalEnabled()) {
				return res.status(501).json({
					success: false,
					error: 'PayPal provider is not configured',
					message:
						'Simulated PayPal is disabled. Set PAYPAL_ENABLE_SIMULATED=true outside production only for local testing.',
				});
			}

			const { bookingId, amount, currency } = req.body;
			const userId = req.user?.id;
			const result = await paypalService.createOrder({
				bookingId,
				amount,
				currency,
				userId,
			});
			return res.json(result);
		} catch (e) {
			return res
				.status(500)
				.json({ success: false, error: 'Failed to create PayPal order' });
		}
	},
);

/**
 * POST /api/payments/paypal/capture
 * Capture a simulated PayPal order when explicitly enabled for local testing.
 */
paymentsRouter.post(
	'/paypal/capture',
	validateRequest(capturePayPalOrderSchema),
	async (req: Request, res: Response) => {
		try {
			if (!isSimulatedPayPalEnabled()) {
				return res.status(501).json({
					success: false,
					error: 'PayPal provider is not configured',
					message:
						'Simulated PayPal is disabled. Set PAYPAL_ENABLE_SIMULATED=true outside production only for local testing.',
				});
			}

			const { orderId } = req.body;
			const result = await paypalService.captureOrder(orderId);
			if (!result.success) {
				return res.status(400).json(result);
			}
			return res.json(result);
		} catch (e) {
			return res
				.status(500)
				.json({ success: false, error: 'Failed to capture PayPal order' });
		}
	},
);

/**
 * GET /api/payments/booking/:bookingId
 * Get payments for a specific booking
 */
paymentsRouter.get(
	'/booking/:bookingId',
	async (req: Request, res: Response) => {
		try {
			const bookingId = req.params.bookingId as string;
			const userId = req.user?.id;

			// Verify booking access
			const db = await getDb();
			const booking = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, bookingId))
				.limit(1);

			if (!booking.length) {
				return res.status(404).json({
					error: 'Booking not found',
					message: 'The specified booking does not exist',
				});
			}

			const bookingData = booking[0];

			// Check user access
			if (userId && bookingData.userId && bookingData.userId !== userId) {
				return res.status(403).json({
					error: 'Access denied',
					message:
						'You do not have permission to view payments for this booking',
				});
			}

			// Get payments for booking
			const bookingPayments: PaymentRecord[] = await db
				.select()
				.from(payments)
				.where(eq(payments.bookingId, bookingId))
				.orderBy(desc(payments.createdAt));

			// Get refunds for booking
			const bookingRefunds: RefundRecord[] = await db
				.select()
				.from(refunds)
				.where(eq(refunds.bookingId, bookingId))
				.orderBy(desc(refunds.createdAt));

			return res.json({
				success: true,
				data: {
					payments: bookingPayments,
					refunds: bookingRefunds,
					summary: {
						totalPaid: bookingPayments
							.filter((p) => p.status === 'succeeded')
							.reduce((sum, p) => sum + parseFloat(p.amount), 0),
						totalRefunded: bookingRefunds
							.filter((r) => r.status === 'succeeded')
							.reduce((sum, r) => sum + parseFloat(r.amount), 0),
						pendingPayments: bookingPayments.filter(
							(p) => p.status === 'pending',
						).length,
						pendingRefunds: bookingRefunds.filter((r) => r.status === 'pending')
							.length,
					},
				},
			});
		} catch (error) {
			logger.error('Failed to get booking payments', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId: req.params.bookingId,
				userId: req.user?.id,
			});

			return res.status(500).json({
				error: 'Failed to retrieve booking payments',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * POST /api/payments/refund
 * Create a Square refund for a payment
 */
paymentsRouter.post(
	'/refund',
	validateRequest(createRefundSchema),
	async (req: Request, res: Response) => {
		try {
			const { paymentId, amount, reason, bookingId } = req.body;

			const db = await getDb();

			// Verify payment belongs to booking
			const paymentRecord = await db
				.select()
				.from(payments)
				.where(eq(payments.transactionId, paymentId))
				.limit(1);

			if (!paymentRecord.length) {
				return res.status(404).json({
					error: 'Payment not found',
					message: 'The specified payment does not exist',
				});
			}

			if (paymentRecord[0].bookingId !== bookingId) {
				return res.status(400).json({
					error: 'Booking mismatch',
					message: 'Payment does not belong to provided booking',
				});
			}

			// Check if user has permission to create refunds for this payment
			// Either the user owns the booking or is an admin
			const booking = await db
				.select()
				.from(bookings)
				.where(eq(bookings.id, bookingId))
				.limit(1);

			if (booking.length === 0) {
				return res.status(404).json({
					error: 'Booking not found',
					message: 'The specified booking does not exist',
				});
			}

			const userOwnsBooking = booking[0].userId === req.user?.id;
			const isAdmin = req.user?.role === 'admin';

			if (!userOwnsBooking && !isAdmin) {
				return res.status(403).json({
					error: 'Access denied',
					message: 'You can only request refunds for your own bookings',
				});
			}

			const result = await squarePaymentService.createRefund({
				paymentId,
				amount,
				reason,
				bookingId,
			});

			if (result.success) {
				return res.json({ success: true, refundId: result.refundId });
			}
			return res
				.status(400)
				.json({ success: false, error: result.errorMessage });
		} catch (error) {
			logger.error('Failed to create Square refund', {
				error: error instanceof Error ? error.message : 'Unknown error',
				paymentId: req.body.paymentId,
				userId: req.user?.id,
			});
			return res.status(500).json({
				error: 'Refund creation failed',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * GET /api/payments/history
 * Get user's payment history
 */
paymentsRouter.get('/history', async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		const { page = '1', limit = '10', status, startDate, endDate } = req.query;

		const pageNum = parseInt(page as string);
		const limitNum = parseInt(limit as string);
		const offset = (pageNum - 1) * limitNum;

		// Build query conditions
		let conditions = eq(payments.userId, userId!);

		if (status) {
			conditions = and(conditions, eq(payments.status, status as string))!;
		}

		if (startDate) {
			conditions = and(
				conditions,
				gte(payments.createdAt, new Date(startDate as string)),
			)!;
		}

		if (endDate) {
			conditions = and(
				conditions,
				lte(payments.createdAt, new Date(endDate as string)),
			)!;
		}

		const db = await getDb();
		const userPayments = await db
			.select()
			.from(payments)
			.where(conditions)
			.orderBy(desc(payments.createdAt))
			.limit(limitNum)
			.offset(offset);

		// Get total count for pagination
		const totalCount = await db
			.select({ count: payments.id })
			.from(payments)
			.where(conditions);

		res.json({
			success: true,
			data: {
				payments: userPayments,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total: totalCount.length,
					totalPages: Math.ceil(totalCount.length / limitNum),
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get payment history', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?.id,
			query: req.query,
		});

		res.status(500).json({
			error: 'Failed to retrieve payment history',
			message:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		});
	}
});

// Get PDF receipt for a payment
paymentsRouter.get(
	'/:paymentId/receipt',
	async (req: Request, res: Response) => {
		try {
			const paymentId = req.params.paymentId as string;
			const userId = req.user?.id;
			const db = await getDb();

			// Get payment details with booking information
			const payment = await db
				.select({
					payment: payments,
					booking: bookings,
				})
				.from(payments)
				.leftJoin(bookings, eq(payments.bookingId, bookings.id))
				.where(eq(payments.id, paymentId))
				.limit(1);

			if (payment.length === 0) {
				return res.status(404).json({
					error: 'Payment not found',
					message: 'The specified payment does not exist',
				});
			}

			const { payment: paymentRecord, booking } = payment[0];

			// Check if user owns this payment or is admin
			const userOwnsPayment = booking?.userId === userId;
			const isAdmin = req.user?.role === 'admin';

			if (!userOwnsPayment && !isAdmin) {
				return res.status(403).json({
					error: 'Access denied',
					message: 'You can only access receipts for your own payments',
				});
			}

			// Generate PDF receipt
			const pdfBuffer = await pdfService.generateBookingReceipt({
				bookingId: booking?.confirmationNumber || paymentRecord.bookingId,
				guestName: booking?.guestName || 'Guest',
				guestEmail: booking?.guestEmail || '',
				hotelName: booking?.hotelName || '',
				hotelAddress: booking?.hotelAddress || '',
				roomType: booking?.roomType || '',
				checkIn: booking?.checkIn?.toISOString().split('T')[0] || '',
				checkOut: booking?.checkOut?.toISOString().split('T')[0] || '',
				nights: booking?.nights || 1,
				pricePerNight: parseFloat(paymentRecord.amount) || 0,
				taxes: 0, // Calculate from booking if available
				totalAmount: parseFloat(paymentRecord.amount),
				paymentMethod: paymentRecord.provider,
				transactionId: paymentRecord.transactionId,
				bookingDate: paymentRecord.createdAt.toISOString().split('T')[0],
			});

			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="receipt-${booking?.confirmationNumber || paymentId}.pdf"`,
			);
			return res.send(pdfBuffer);
		} catch (error) {
			logger.error('Failed to generate PDF receipt:', error);
			return res.status(500).json({
				error: 'Internal Server Error',
				message: 'Failed to generate receipt',
			});
		}
	},
);

// Stripe webhook removed; Square webhook is defined at top-level router (index.ts)

// Removed admin stats & setup-intent endpoints (Stripe-specific). Add later for Square if needed.

/**
 * GET /api/payments/stats
 * Basic revenue stats for dashboard (authenticated user scope if not admin)
 */
paymentsRouter.get('/stats', async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		const db = await getDb();

		const now = new Date();
		const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Total succeeded revenue
		const allPayments: PaymentRecord[] = await db
			.select()
			.from(payments)
			.where(eq(payments.status, 'succeeded'));
		const userFiltered: PaymentRecord[] = userId
			? allPayments.filter((p) => p.userId === userId)
			: allPayments;
		const totalRevenue = userFiltered.reduce(
			(s, p) => s + parseFloat(p.amount),
			0,
		);

		const last30Revenue = userFiltered
			.filter((p) => p.createdAt && p.createdAt >= last30)
			.reduce((s, p) => s + parseFloat(p.amount), 0);

		const orderCount = userFiltered.length;
		const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;

		res.json({
			success: true,
			data: {
				totalRevenue,
				last30Revenue,
				avgOrderValue,
				orderCount,
			},
		});
	} catch (error) {
		logger.error('Failed to get payment stats', {
			error: error instanceof Error ? error.message : 'Unknown',
		});
		res.status(500).json({ success: false, error: 'Failed to retrieve stats' });
	}
});

// Cleanup of Stripe setup-intent logic complete.
