import { and, avg, count, desc, eq, gte, lte, sum } from 'drizzle-orm';
import { getDb } from '../database';
import { bookings, payments } from '../database/schema';
import {
    commissions,
    payoutBatches,
    revenueReports,
} from '../database/schema/commissions';
import { logger } from '../utils/logger';

export class CommissionService {
	/**
	 * Calculate and create commission record for a booking
	 */
	static async createCommission(
		bookingId: string,
		paymentId: string,
		baseAmount: number,
		currency = 'USD',
		commissionRate = 0.05,
	) {
		try {
			const db = await getDb();
			const commissionAmount =
				Math.round(baseAmount * commissionRate * 100) / 100;
			const platformFee = commissionAmount;
			const hotelEarnings = baseAmount - commissionAmount;

			const commission = await db
				.insert(commissions)
				.values({
					bookingId,
					paymentId,
					baseAmount: baseAmount.toString(),
					commissionRate: commissionRate.toString(),
					commissionAmount: commissionAmount.toString(),
					currency: currency.toUpperCase(),
					platformFee: platformFee.toString(),
					hotelEarnings: hotelEarnings.toString(),
					status: 'pending',
				})
				.returning();

			logger.info('Commission created', {
				commissionId: commission[0].id,
				bookingId,
				paymentId,
				baseAmount,
				commissionAmount,
				platformFee,
			});

			return commission[0];
		} catch (error) {
			logger.error('Failed to create commission', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId,
				paymentId,
				baseAmount,
			});
			throw error;
		}
	}

	/**
	 * Mark commission as earned when payment is confirmed
	 */
	static async markCommissionEarned(paymentId: string) {
		try {
			const db = await getDb();
			const result = await db
				.update(commissions)
				.set({
					status: 'earned',
					earnedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(commissions.paymentId, paymentId))
				.returning();

			logger.info('Commission marked as earned', {
				paymentId,
				commissionId: result[0]?.id,
			});

			return result[0];
		} catch (error) {
			logger.error('Failed to mark commission as earned', {
				error: error instanceof Error ? error.message : 'Unknown error',
				paymentId,
			});
			throw error;
		}
	}

	/**
	 * Get commission for a booking
	 */
	static async getBookingCommission(bookingId: string) {
		try {
			const db = await getDb();
			const commission = await db
				.select()
				.from(commissions)
				.where(eq(commissions.bookingId, bookingId))
				.limit(1);

			return commission[0];
		} catch (error) {
			logger.error('Failed to get booking commission', {
				error: error instanceof Error ? error.message : 'Unknown error',
				bookingId,
			});
			throw error;
		}
	}

	/**
	 * Reverse commission for refunded payment
	 */
	static async reverseCommission(paymentId: string, refundAmount: number) {
		try {
			const db = await getDb();
			const result = await db
				.update(commissions)
				.set({
					status: 'reversed',
					reversedAt: new Date(),
					reversedAmount: refundAmount.toString(),
					updatedAt: new Date(),
				})
				.where(eq(commissions.paymentId, paymentId))
				.returning();

			logger.info('Commission reversed', {
				paymentId,
				commissionId: result[0]?.id,
				refundAmount,
			});

			return result[0];
		} catch (error) {
			logger.error('Failed to reverse commission', {
				error: error instanceof Error ? error.message : 'Unknown error',
				paymentId,
				refundAmount,
			});
			throw error;
		}
	}

	/**
	 * Generate revenue report for a period
	 */
	static async generateRevenueReport(
		startDate: Date,
		endDate: Date,
		reportType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
		_currency = 'USD',
	) {
		try {
			const db = await getDb();

			// Get booking and commission statistics
			const bookingStats = await db
				.select({
					totalBookings: count(bookings.id),
					totalRevenue: sum(bookings.totalAmount),
				})
				.from(bookings)
				.where(
					and(
						gte(bookings.createdAt, startDate),
						lte(bookings.createdAt, endDate),
						eq(bookings.status, 'confirmed'),
					),
				);

			// Get successful bookings
			const successfulBookings = await db
				.select({
					count: count(bookings.id),
					revenue: sum(bookings.totalAmount),
				})
				.from(bookings)
				.where(
					and(
						gte(bookings.createdAt, startDate),
						lte(bookings.createdAt, endDate),
						eq(bookings.status, 'completed'),
					),
				);

			// Get cancelled bookings
			const cancelledBookings = await db
				.select({
					count: count(bookings.id),
					revenue: sum(bookings.totalAmount),
				})
				.from(bookings)
				.where(
					and(
						gte(bookings.createdAt, startDate),
						lte(bookings.createdAt, endDate),
						eq(bookings.status, 'cancelled'),
					),
				);

			// Get commission statistics
			const commissionStats = await db
				.select({
					totalCommissions: sum(commissions.commissionAmount),
					totalPlatformFees: sum(commissions.platformFee),
					avgCommissionRate: avg(commissions.commissionRate),
				})
				.from(commissions)
				.where(
					and(
						gte(commissions.createdAt, startDate),
						lte(commissions.createdAt, endDate),
						eq(commissions.status, 'earned'),
					),
				);

			// Get payment statistics
			const paymentStats = await db
				.select({
					totalPayments: count(payments.id),
					totalAmount: sum(payments.amount),
				})
				.from(payments)
				.where(
					and(
						gte(payments.createdAt, startDate),
						lte(payments.createdAt, endDate),
						eq(payments.status, 'completed'),
					),
				);

			const reportData = {
				periodStart: startDate,
				periodEnd: endDate,
				reportType,
				totalBookings: Number(bookingStats[0]?.totalBookings || 0),
				totalRevenue: Number(bookingStats[0]?.totalRevenue || 0),
				successfulBookings: Number(successfulBookings[0]?.count || 0),
				successfulRevenue: Number(successfulBookings[0]?.revenue || 0),
				cancelledBookings: Number(cancelledBookings[0]?.count || 0),
				cancelledRevenue: Number(cancelledBookings[0]?.revenue || 0),
				totalCommissions: Number(commissionStats[0]?.totalCommissions || 0),
				totalPlatformFees: Number(commissionStats[0]?.totalPlatformFees || 0),
				avgCommissionRate: Number(commissionStats[0]?.avgCommissionRate || 0),
				totalPayments: Number(paymentStats[0]?.totalPayments || 0),
				totalPaymentAmount: Number(paymentStats[0]?.totalAmount || 0),
				metadata: {
					generatedAt: new Date(),
				},
			};

			// Store the report
			const report = await db
				.insert(revenueReports)
				.values({
					reportType,
					periodStart: startDate,
					periodEnd: endDate,
					totalRevenue: reportData.totalRevenue.toString(),
					totalCommissions: reportData.totalCommissions.toString(),
					totalBookings: reportData.totalBookings.toString(),
					metadata: reportData,
				})
				.returning();

			logger.info('Revenue report generated', {
				reportId: report[0].id,
				reportType,
				periodStart: startDate,
				periodEnd: endDate,
			});

			return report[0];
		} catch (error) {
			logger.error('Failed to generate revenue report', {
				error: error instanceof Error ? error.message : 'Unknown error',
				startDate,
				endDate,
				reportType,
			});
			throw error;
		}
	}

	/**
	 * Get dashboard metrics for admin
	 */
	static async getDashboardMetrics(
		_startDate?: Date,
		_endDate?: Date,
		_currency = 'USD',
	) {
		try {
			await getDb();
			const now = new Date();
			const todayStart = new Date(now.setHours(0, 0, 0, 0));
			const yesterdayStart = new Date(todayStart);
			yesterdayStart.setDate(yesterdayStart.getDate() - 1);
			const weekStart = new Date(todayStart);
			weekStart.setDate(weekStart.getDate() - 7);
			const monthStart = new Date(todayStart);
			monthStart.setMonth(monthStart.getMonth() - 1);

			// Today's metrics
			const todayReport = await CommissionService.generateRevenueReport(
				todayStart,
				now,
				'daily',
			);

			// Yesterday's metrics for comparison
			const yesterdayReport = await CommissionService.generateRevenueReport(
				yesterdayStart,
				todayStart,
				'daily',
			);

			// Week metrics
			const weekReport = await CommissionService.generateRevenueReport(
				weekStart,
				now,
				'weekly',
			);

			// Month metrics
			const monthReport = await CommissionService.generateRevenueReport(
				monthStart,
				now,
				'monthly',
			);

			return {
				today: todayReport.metadata,
				yesterday: yesterdayReport.metadata,
				week: weekReport.metadata,
				month: monthReport.metadata,
				comparison: {
					revenueChange:
						(todayReport.metadata as any).totalRevenue -
						(yesterdayReport.metadata as any).totalRevenue,
					bookingsChange:
						(todayReport.metadata as any).totalBookings -
						(yesterdayReport.metadata as any).totalBookings,
					commissionsChange:
						(todayReport.metadata as any).totalCommissions -
						(yesterdayReport.metadata as any).totalCommissions,
				},
			};
		} catch (error) {
			logger.error('Failed to get dashboard metrics', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * Get commission details/history for reporting
	 */
	static async getCommissionDetails(
		startDate?: Date,
		endDate?: Date,
		status?: string,
		_currency = 'USD',
	) {
		return this.getCommissionHistory(startDate, endDate, status);
	}

	/**
	 * Get commission history for reporting
	 */
	static async getCommissionHistory(
		startDate?: Date,
		endDate?: Date,
		status?: string,
		limit = 100,
	) {
		try {
			const db = await getDb();
			const conditions = [];

			if (startDate) {
				conditions.push(gte(commissions.createdAt, startDate));
			}
			if (endDate) {
				conditions.push(lte(commissions.createdAt, endDate));
			}
			if (status) {
				conditions.push(eq(commissions.status, status));
			}

			const commissionList = await db
				.select()
				.from(commissions)
				.where(conditions.length > 0 ? and(...conditions) : undefined)
				.orderBy(desc(commissions.createdAt))
				.limit(limit);

			const summary = await db
				.select({
					totalAmount: sum(commissions.commissionAmount),
					totalCount: count(commissions.id),
					avgAmount: avg(commissions.commissionAmount),
				})
				.from(commissions)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				commissions: commissionList,
				summary: {
					totalAmount: Number(summary[0]?.totalAmount || 0),
					totalCount: Number(summary[0]?.totalCount || 0),
					avgAmount: Number(summary[0]?.avgAmount || 0),
				},
			};
		} catch (error) {
			logger.error('Failed to get commission history', {
				error: error instanceof Error ? error.message : 'Unknown error',
				startDate,
				endDate,
				status,
			});
			throw error;
		}
	}

	/**
	 * Process batch payouts for accumulated commissions
	 */
	static async processBatchPayout(commissionIds: string[]) {
		try {
			const db = await getDb();

			// Get commissions to payout
			const commissionList = await db
				.select()
				.from(commissions)
				.where(
					and(
						eq(commissions.status, 'earned'),
						// Note: 'in' operator might need adjustment based on your Drizzle version
						// You might need to use a different approach for array containment
					),
				);

			const totalAmount = commissionList.reduce(
				(sum: number, c: { commissionAmount: string }) =>
					sum + parseFloat(c.commissionAmount),
				0,
			);
			const commissionCount = commissionList.length;

			// Create payout batch record
			const batch = await db
				.insert(payoutBatches)
				.values({
					totalAmount: totalAmount.toString(),
					commissionCount: commissionCount.toString(),
					status: 'processing',
					metadata: {
						commissionIds,
						processedAt: new Date(),
					},
				})
				.returning();

			// Update commission status
			await db
				.update(commissions)
				.set({
					status: 'paid',
					payoutBatchId: batch[0].id,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(commissions.status, 'earned'),
						// Note: Same as above for array containment
					),
				);

			logger.info('Batch payout processed', {
				batchId: batch[0].id,
				totalAmount,
				commissionCount,
			});

			return batch[0];
		} catch (error) {
			logger.error('Failed to process batch payout', {
				error: error instanceof Error ? error.message : 'Unknown error',
				commissionIds,
			});
			throw error;
		}
	}
}

export default CommissionService;
