import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database';
import { bookings, payments, users } from '../database/schema';
import { CommissionService } from '../services/commission';

import { stripeService } from '../services/stripe';

import { and, avg, count, desc, eq, gte, lte, sum } from 'drizzle-orm';
import { validateRequest } from '../middleware/validateRequest';
import { logger } from '../utils/logger';

export const adminRouter = Router();

/**
 * Serialise dashboard metrics to CSV format for revenue report exports.
 */
function generateRevenueCSV(data: Record<string, unknown>): string {
	const rows: string[] = [];
	const flatten = (obj: Record<string, unknown>, prefix = ''): void => {
		for (const [key, value] of Object.entries(obj)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
				flatten(value as Record<string, unknown>, fullKey);
			} else {
				rows.push(`${fullKey},${JSON.stringify(value ?? '')}`);
			}
		}
	};
	rows.push('metric,value');
	flatten(data);
	return rows.join('\n');
}

// Middleware to check admin access
const requireAdmin = (req: Request, res: Response, next: any) => {
	if (req.user?.role !== 'admin') {
		return res.status(403).json({
			error: 'Access denied',
			message: 'Admin access required',
		});
	}
	next();
};

// Apply admin middleware to all routes
adminRouter.use(requireAdmin);

// Validation schemas
const dashboardMetricsSchema = z.object({
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	currency: z.string().length(3).default('USD'),
});

const revenueReportSchema = z.object({
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
	reportType: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
	currency: z.string().length(3).default('USD'),
});

const refundApprovalSchema = z.object({
	paymentIntentId: z.string(),
	amount: z.number().positive().optional(),
	reason: z
		.enum(['duplicate', 'fraudulent', 'requested_by_customer'])
		.default('requested_by_customer'),
	notes: z.string().optional(),
});

/**
 * GET /api/admin/dashboard
 * Get dashboard metrics and overview
 */
adminRouter.get(
	'/dashboard',
	validateRequest(dashboardMetricsSchema, 'query'),
	async (req: Request, res: Response) => {
		try {
			const { startDate, endDate, currency } = req.query;
			const db = getDb();

			const start = startDate
				? new Date(startDate as string)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			const end = endDate ? new Date(endDate as string) : new Date();

			const metrics = await CommissionService.getDashboardMetrics(
				start,
				end,
				currency as string,
			);

			// Get recent activity
			const recentBookings = await db
				.select({
					id: bookings.id,
					confirmationNumber: bookings.confirmationNumber,
					hotelId: bookings.hotelId,
					totalAmount: bookings.totalAmount,
					status: bookings.status,
					paymentStatus: bookings.paymentStatus,
					guestFirstName: bookings.guestFirstName,
					guestLastName: bookings.guestLastName,
					createdAt: bookings.createdAt,
				})
				.from(bookings)
				.orderBy(desc(bookings.createdAt))
				.limit(10);

			const recentPayments = await db
				.select({
					id: payments.id,
					bookingId: payments.bookingId,
					amount: payments.amount,
					currency: payments.currency,
					status: payments.status,
					method: payments.method,
					createdAt: payments.createdAt,
				})
				.from(payments)
				.orderBy(desc(payments.createdAt))
				.limit(10);

			res.json({
				success: true,
				data: {
					metrics,
					recentActivity: {
						bookings: recentBookings,
						payments: recentPayments,
					},
				},
			});
		} catch (error) {
			logger.error('Failed to get admin dashboard metrics', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: req.user?.id,
				query: req.query,
			});

			res.status(500).json({
				error: 'Failed to retrieve dashboard metrics',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * GET /api/admin/revenue-report
 * Generate and retrieve revenue reports
 */
adminRouter.get(
	'/revenue-report',
	validateRequest(revenueReportSchema, 'query'),
	async (req: Request, res: Response) => {
		try {
			const { startDate, endDate, reportType, currency } = req.query;
			// const db = getDb();

			const start = new Date(startDate as string);
			const end = new Date(endDate as string);

			const report = await CommissionService.generateRevenueReport(
				start,
				end,
				reportType as 'daily' | 'weekly' | 'monthly' | 'yearly',
				currency as string,
			);

			// Get detailed commission breakdown
			const commissionDetails = await CommissionService.getCommissionDetails(
				start,
				end,
				undefined,
				currency as string,
			);

			res.json({
				success: true,
				data: {
					report,
					commissionDetails,
				},
			});
		} catch (error) {
			logger.error('Failed to generate revenue report', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: req.user?.id,
				query: req.query,
			});

			res.status(500).json({
				error: 'Failed to generate revenue report',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * GET /api/admin/bookings
 * Get all bookings with filtering and pagination
 */
adminRouter.get('/bookings', async (req: Request, res: Response) => {
	try {
		const db = getDb();
		const {
			page = '1',
			limit = '20',
			status,
			paymentStatus,
			startDate,
			endDate,
			search: _search,
		} = req.query;

		const pageNum = parseInt(page as string);
		const limitNum = parseInt(limit as string);
		const offset = (pageNum - 1) * limitNum;

		// Build query conditions
		let conditions: any;

		if (status) {
			conditions = and(conditions, eq(bookings.status, status as string));
		}

		if (paymentStatus) {
			conditions = and(
				conditions,
				eq(bookings.paymentStatus, paymentStatus as string),
			);
		}

		if (startDate) {
			conditions = and(
				conditions,
				gte(bookings.createdAt, new Date(startDate as string)),
			);
		}

		if (endDate) {
			conditions = and(
				conditions,
				lte(bookings.createdAt, new Date(endDate as string)),
			);
		}

		// Get bookings
		const bookingList = await db
			.select()
			.from(bookings)
			.where(conditions)
			.orderBy(desc(bookings.createdAt))
			.limit(limitNum)
			.offset(offset);

		// Get total count
		const totalCount = await db
			.select({ count: count() })
			.from(bookings)
			.where(conditions);

		// Get summary statistics
		const summaryStats = await db
			.select({
				totalRevenue: sum(bookings.totalAmount),
				averageOrderValue: avg(bookings.totalAmount),
				totalBookings: count(bookings.id),
			})
			.from(bookings)
			.where(conditions);

		res.json({
			success: true,
			data: {
				bookings: bookingList,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total: totalCount[0]?.count || 0,
					totalPages: Math.ceil((totalCount[0]?.count || 0) / limitNum),
				},
				summary: {
					totalRevenue: parseFloat(
						summaryStats[0]?.totalRevenue?.toString() || '0',
					),
					averageOrderValue: parseFloat(
						summaryStats[0]?.averageOrderValue?.toString() || '0',
					),
					totalBookings: parseInt(
						summaryStats[0]?.totalBookings?.toString() || '0',
					),
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get admin bookings', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?.id,
			query: req.query,
		});

		res.status(500).json({
			error: 'Failed to retrieve bookings',
			message:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		});
	}
});

/**
 * GET /api/admin/payments
 * Get all payments with filtering and pagination
 */
adminRouter.get('/payments', async (req: Request, res: Response) => {
	try {
		const db = getDb();
		const {
			page = '1',
			limit = '20',
			status,
			method,
			startDate,
			endDate,
		} = req.query;

		const pageNum = parseInt(page as string);
		const limitNum = parseInt(limit as string);
		const offset = (pageNum - 1) * limitNum;

		// Build query conditions
		let conditions: any;

		if (status) {
			conditions = and(conditions, eq(payments.status, status as string));
		}

		if (method) {
			conditions = and(conditions, eq(payments.method, method as string));
		}

		if (startDate) {
			conditions = and(
				conditions,
				gte(payments.createdAt, new Date(startDate as string)),
			);
		}

		if (endDate) {
			conditions = and(
				conditions,
				lte(payments.createdAt, new Date(endDate as string)),
			);
		}

		// Get payments
		const paymentList = await db
			.select()
			.from(payments)
			.where(conditions)
			.orderBy(desc(payments.createdAt))
			.limit(limitNum)
			.offset(offset);

		// Get total count
		const totalCount = await db
			.select({ count: count() })
			.from(payments)
			.where(conditions);

		// Get summary statistics
		const summaryStats = await db
			.select({
				totalAmount: sum(payments.amount),
				averageAmount: avg(payments.amount),
				totalPayments: count(payments.id),
			})
			.from(payments)
			.where(conditions);

		res.json({
			success: true,
			data: {
				payments: paymentList,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total: totalCount[0]?.count || 0,
					totalPages: Math.ceil((totalCount[0]?.count || 0) / limitNum),
				},
				summary: {
					totalAmount: parseFloat(
						summaryStats[0]?.totalAmount?.toString() || '0',
					),
					averageAmount: parseFloat(
						summaryStats[0]?.averageAmount?.toString() || '0',
					),
					totalPayments: parseInt(
						summaryStats[0]?.totalPayments?.toString() || '0',
					),
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get admin payments', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?.id,
			query: req.query,
		});

		res.status(500).json({
			error: 'Failed to retrieve payments',
			message:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		});
	}
});

/**
 * POST /api/admin/refund/approve
 * Approve and process a refund
 */
adminRouter.post(
	'/refund/approve',
	validateRequest(refundApprovalSchema),
	async (req: Request, res: Response) => {
		try {
			const { paymentIntentId, amount, reason, notes } = req.body;
			const adminUserId = req.user?.id;
			const db = getDb();

			// Get payment record to find booking
			const payment = await db
				.select()
				.from(payments)
				.where(eq(payments.transactionId, paymentIntentId))
				.limit(1);

			if (!payment.length) {
				return res.status(404).json({
					error: 'Payment not found',
					message: 'The specified payment does not exist',
				});
			}

			const paymentData = payment[0];

			// Create refund through Stripe
			const refund = await stripeService.createRefund({
				paymentIntentId,
				amount,
				reason,
				bookingId: paymentData.bookingId,
				processedBy: adminUserId,
				metadata: {
					adminApproved: 'true',
					adminNotes: notes || '',
					processedBy: adminUserId || '',
				},
			});

			// Log admin action
			logger.info('Admin approved refund', {
				refundId: refund.id,
				paymentIntentId,
				bookingId: paymentData.bookingId,
				amount: refund.amount / 100,
				reason,
				adminUserId,
				notes,
			});

			res.json({
				success: true,
				data: {
					refund: {
						id: refund.id,
						amount: refund.amount / 100,
						currency: refund.currency,
						status: refund.status,
						reason: refund.reason,
					},
					message: 'Refund has been approved and processed',
				},
			});
		} catch (error) {
			logger.error('Failed to approve refund', {
				error: error instanceof Error ? error.message : 'Unknown error',
				paymentIntentId: req.body.paymentIntentId,
				adminUserId: req.user?.id,
			});

			res.status(500).json({
				error: 'Refund approval failed',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * GET /api/admin/users
 * Get all users with filtering and pagination
 */
adminRouter.get('/users', async (req: Request, res: Response) => {
	try {
		const db = getDb();
		const { page = '1', limit = '20', role, isActive, search: _search2 } = req.query;

		const pageNum = parseInt(page as string);
		const limitNum = parseInt(limit as string);
		const offset = (pageNum - 1) * limitNum;

		// Build query conditions
		let conditions: any;

		if (role) {
			conditions = and(conditions, eq(users.role, role as string));
		}

		if (isActive !== undefined) {
			conditions = and(conditions, eq(users.isActive, isActive === 'true'));
		}

		// Get users (exclude password hash)
		const userList = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				phone: users.phone,
				role: users.role,
				isActive: users.isActive,
				emailVerified: users.emailVerified,
				lastLoginAt: users.lastLoginAt,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
			})
			.from(users)
			.where(conditions)
			.orderBy(desc(users.createdAt))
			.limit(limitNum)
			.offset(offset);

		// Get total count
		const totalCount = await db
			.select({ count: count() })
			.from(users)
			.where(conditions);

		res.json({
			success: true,
			data: {
				users: userList,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total: totalCount[0]?.count || 0,
					totalPages: Math.ceil((totalCount[0]?.count || 0) / limitNum),
				},
			},
		});
	} catch (error) {
		logger.error('Failed to get admin users', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?.id,
			query: req.query,
		});

		res.status(500).json({
			error: 'Failed to retrieve users',
			message:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		});
	}
});

/**
 * GET /api/admin/analytics/top-metrics
 * Get top performing metrics
 */
adminRouter.get(
	'/analytics/top-metrics',
	async (req: Request, res: Response) => {
		try {
			const { startDate, endDate, currency: _currency = 'USD' } = req.query;

			const _start = startDate
				? new Date(startDate as string)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			const _end = endDate ? new Date(endDate as string) : new Date();

			// This would typically involve more complex queries
			// For now, returning mock data structure that would be populated with real queries

			const topMetrics = {
				topHotels: [
					{
						hotelId: 'hotel_1',
						name: 'Grand Hotel',
						bookings: 45,
						revenue: 12500,
					},
					{
						hotelId: 'hotel_2',
						name: 'Ocean View Resort',
						bookings: 38,
						revenue: 11200,
					},
					{
						hotelId: 'hotel_3',
						name: 'City Center Hotel',
						bookings: 32,
						revenue: 9800,
					},
				],
				topCountries: [
					{ country: 'US', bookings: 89, revenue: 25600 },
					{ country: 'CA', bookings: 34, revenue: 9800 },
					{ country: 'UK', bookings: 28, revenue: 8400 },
				],
				topPaymentMethods: [
					{ method: 'card', count: 145, percentage: 92.3 },
					{ method: 'bank_transfer', count: 12, percentage: 7.7 },
				],
				performanceMetrics: {
					conversionRate: 78.5,
					averageBookingValue: 285.5,
					customerRetentionRate: 34.2,
					paymentSuccessRate: 96.8,
				},
			};

			res.json({
				success: true,
				data: topMetrics,
			});
		} catch (error) {
			logger.error('Failed to get top metrics', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: req.user?.id,
				query: req.query,
			});

			res.status(500).json({
				error: 'Failed to retrieve top metrics',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);

/**
 * GET /api/admin/export/revenue-report
 * Export revenue report as CSV
 */
adminRouter.get(
	'/export/revenue-report',
	async (req: Request, res: Response) => {
		try {
			const { startDate, endDate, format = 'csv' } = req.query;

			if (!startDate || !endDate) {
				return res.status(400).json({
					error: 'Date range required',
					message: 'Both startDate and endDate are required for export',
				});
			}

			const start = new Date(startDate as string);
			const end = new Date(endDate as string);

			// Generate report data
			const reportData = await CommissionService.getDashboardMetrics(
				start,
				end,
			);

			if (format === 'csv') {
				// Generate CSV content
				const csvContent = generateRevenueCSV(reportData as Record<string, unknown>);

				res.setHeader('Content-Type', 'text/csv');
				res.setHeader(
					'Content-Disposition',
					`attachment; filename="revenue-report-${startDate}-${endDate}.csv"`,
				);
				res.send(csvContent);
			} else {
				// Return JSON
				res.json({
					success: true,
					data: reportData,
				});
			}
		} catch (error) {
			logger.error('Failed to export revenue report', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: req.user?.id,
				query: req.query,
			});

			res.status(500).json({
				error: 'Failed to export revenue report',
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}
	},
);
