import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../database';
import {
	auditLog,
	userActivityLog,
	users,
} from '../database/schema';
import { logger } from './logger';

type DataAccessSummaryRow = {
	access_type: string;
	count: number | string | bigint;
};

type DataAccessDetailRow = Record<string, unknown>;

/**
 * GDPR Compliance Utilities
 * Handles data subject rights and privacy compliance
 */
export class GDPRCompliance {
	/**
	 * Export all personal data for a user (Right to Data Portability - Article 20)
	 */
	static async exportUserData(userId: string): Promise<{
		personalData: any;
		metadata: {
			exportedAt: string;
			format: string;
			legalBasis: string;
		};
	}> {
		try {
			const db = getDb();

			// Log the data access for audit purposes
			await GDPRCompliance.logDataAccess(
				userId,
				'EXPORT',
				'COMPLETE_PROFILE',
				'Data export requested by user',
			);

			// Get user profile data
			const [user] = await db
				.select({
					id: users.id,
					email: users.email,
					firstName: users.firstName,
					lastName: users.lastName,
					phone: users.phone,
					preferences: users.preferences,
					createdAt: users.createdAt,
					lastLoginAt: users.lastLoginAt,
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user) {
				throw new Error('User not found');
			}

			// Get booking data
			const bookings = await db.execute(sql`
        SELECT b.*, h.name as hotel_name, h.address as hotel_address
        FROM bookings b
        LEFT JOIN hotels h ON b.hotel_id = h.id
        WHERE b.user_id = ${userId}
        ORDER BY b.created_at DESC
      `);

			// Get payment data (without sensitive card details)
			const payments = await db.execute(sql`
        SELECT 
          id, booking_id, amount, currency, status, method, provider,
          created_at, updated_at, processed_at
        FROM payments 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);

			// Get user activity logs (last 12 months only)
			const twelveMonthsAgo = new Date();
			twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

			const activities = await db
				.select({
					action: userActivityLog.action,
					resource: userActivityLog.resource,
					description: userActivityLog.description,
					success: userActivityLog.success,
					occurredAt: userActivityLog.occurredAt,
				})
				.from(userActivityLog)
				.where(
					and(
						eq(userActivityLog.userId, userId),
						gte(userActivityLog.occurredAt, twelveMonthsAgo),
					),
				)
				.orderBy(userActivityLog.occurredAt)
				.limit(1000); // Limit to prevent abuse

			const exportData = {
				personalData: {
					profile: user,
					bookings: bookings.rows,
					payments: payments.rows,
					activities,
				},
				metadata: {
					exportedAt: new Date().toISOString(),
					format: 'JSON',
					legalBasis: 'Article 20 - Right to Data Portability',
					dataRetention: 'User data retained according to our retention policy',
					contact:
						'For questions about this export, contact privacy@hotelbooking.com',
				},
			};

			logger.info('User data exported', {
				userId,
				recordCounts: {
					bookings: bookings.rowCount,
					payments: payments.rowCount,
					activities: activities.length,
				},
			});

			return exportData;
		} catch (error) {
			logger.error('Failed to export user data', { error, userId });
			throw new Error('Data export failed');
		}
	}

	/**
	 * Delete all user data (Right to Erasure - Article 17)
	 */
	static async deleteUserData(
		userId: string,
		reason: string,
	): Promise<{
		deleted: boolean;
		summary: Record<string, number>;
	}> {
		try {
			const db = getDb();

			// Log the deletion request
			await GDPRCompliance.logDataAccess(
				userId,
				'DELETE',
				'COMPLETE_PROFILE',
				`Data deletion requested: ${reason}`,
			);

			// Start transaction for atomic deletion
			const deletionSummary: Record<string, number> = {};

			// Delete user activity logs
			const activityResult = await db
				.delete(userActivityLog)
				.where(eq(userActivityLog.userId, userId));
			deletionSummary.activityLogs = activityResult.rowCount || 0;

			// Anonymize bookings (preserve for business records but remove personal data)
			const bookingResult = await db.execute(sql`
        UPDATE bookings 
        SET 
          guest_first_name = 'DELETED',
          guest_last_name = 'USER',
          guest_email = 'deleted@anonymized.com',
          guest_phone = 'DELETED',
          special_requests = NULL,
          user_id = NULL
        WHERE user_id = ${userId}
      `);
			deletionSummary.bookingsAnonymized = bookingResult.rowCount || 0;

			// Anonymize payments (preserve transaction records for compliance)
			const paymentResult = await db.execute(sql`
        UPDATE payments 
        SET user_id = NULL
        WHERE user_id = ${userId}
      `);
			deletionSummary.paymentsAnonymized = paymentResult.rowCount || 0;

			// Delete payment methods
			const paymentMethodResult = await db.execute(sql`
        DELETE FROM payment_methods WHERE user_id = ${userId}
      `);
			deletionSummary.paymentMethodsDeleted = paymentMethodResult.rowCount || 0;

			// Delete user reviews
			const reviewResult = await db.execute(sql`
        DELETE FROM reviews WHERE user_id = ${userId}
      `);
			deletionSummary.reviewsDeleted = reviewResult.rowCount || 0;

			// Delete user preferences and tokens
			const userResult = await db.delete(users).where(eq(users.id, userId));
			deletionSummary.userProfileDeleted = userResult.rowCount || 0;

			// Create final audit log entry before deletion
			await db.insert(auditLog).values({
				tableName: 'users',
				recordId: userId,
				operation: 'DELETE',
				oldData: { userId, reason, deletedAt: new Date() },
				newData: null,
				changedBy: userId, // Self-deletion
				changedFields: ['*'],
				metadata: {
					gdprDeletion: true,
					reason,
					summary: deletionSummary,
				},
			});

			logger.info('User data deleted (GDPR)', {
				userId,
				reason,
				summary: deletionSummary,
			});

			return {
				deleted: true,
				summary: deletionSummary,
			};
		} catch (error) {
			logger.error('Failed to delete user data', { error, userId, reason });
			throw new Error('Data deletion failed');
		}
	}

	/**
	 * Rectify/update user data (Right to Rectification - Article 16)
	 */
	static async rectifyUserData(
		userId: string,
		updates: Partial<{
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
		}>,
		requestedBy: string,
	): Promise<boolean> {
		try {
			const db = getDb();

			// Log the rectification request
			await GDPRCompliance.logDataAccess(
				userId,
				'UPDATE',
				'PROFILE',
				'Data rectification requested by user',
			);

			// Get current data for audit trail
			const [currentData] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!currentData) {
				throw new Error('User not found');
			}

			// Update user data
			const [updatedUser] = await db
				.update(users)
				.set({
					...updates,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId))
				.returning();

			// Create audit log entry
			await db.insert(auditLog).values({
				tableName: 'users',
				recordId: userId,
				operation: 'UPDATE',
				oldData: currentData,
				newData: updatedUser,
				changedBy: requestedBy,
				changedFields: Object.keys(updates),
				metadata: { gdprRectification: true },
			});

			logger.info('User data rectified (GDPR)', {
				userId,
				updatedFields: Object.keys(updates),
				requestedBy,
			});

			return true;
		} catch (error) {
			logger.error('Failed to rectify user data', { error, userId });
			throw new Error('Data rectification failed');
		}
	}

	/**
	 * Check if processing can be restricted (Right to Restrict Processing - Article 18)
	 */
	static async restrictProcessing(
		userId: string,
		reason: string,
	): Promise<boolean> {
		try {
			const db = getDb();

			// Update user to mark processing as restricted
			await db
				.update(users)
				.set({
					metadata: sql`COALESCE(metadata, '{}') || '{"processingRestricted": true, "restrictionReason": "${reason}", "restrictedAt": "${new Date().toISOString()}"}'`,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));

			await GDPRCompliance.logDataAccess(
				userId,
				'RESTRICT',
				'PROFILE',
				`Processing restricted: ${reason}`,
			);

			logger.info('User processing restricted (GDPR)', { userId, reason });
			return true;
		} catch (error) {
			logger.error('Failed to restrict processing', { error, userId });
			throw new Error('Processing restriction failed');
		}
	}

	/**
	 * Log data access for GDPR compliance
	 */
	private static async logDataAccess(
		dataSubjectId: string,
		accessType: 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'RESTRICT',
		dataType: string,
		purpose: string,
		accessedBy?: string,
	): Promise<void> {
		try {
			const db = getDb();

			await db.execute(sql`
				INSERT INTO data_access_logs (
					data_subject_id, accessed_by_user_id, access_type, data_type,
					purpose, ip_address, legal_basis, fields_accessed, metadata
				) VALUES (
					${dataSubjectId}, ${accessedBy || dataSubjectId}, ${accessType},
					${dataType}, ${purpose}, 'system', 'GDPR_COMPLIANCE',
					${JSON.stringify([dataType])}, ${JSON.stringify({ automated: true })}
				)
			`);
		} catch (error) {
			logger.error('Failed to log data access', { error });
		}
	}

	/**
	 * Generate GDPR compliance report
	 */
	static async generateComplianceReport(
		startDate: Date,
		endDate: Date,
	): Promise<{
		summary: Record<string, number>;
		details: any[];
	}> {
		try {
			const db = getDb();

			// Get data access statistics
			const accessStatsResult = await db.execute(sql`
				SELECT access_type, count(*) AS count
				FROM data_access_logs
				WHERE created_at >= ${startDate} AND created_at <= ${endDate}
				GROUP BY access_type
			`);
			const accessStats = (accessStatsResult.rows ?? []) as DataAccessSummaryRow[];

			// Get detailed access logs for the period
			const accessDetailsResult = await db.execute(sql`
				SELECT *
				FROM data_access_logs
				WHERE created_at >= ${startDate} AND created_at <= ${endDate}
				ORDER BY created_at
				LIMIT 1000
			`);
			const accessDetails = (accessDetailsResult.rows ??
				[]) as DataAccessDetailRow[];

			const summary = accessStats.reduce(
				(acc, stat) => {
					acc[stat.access_type] = Number(stat.count);
					return acc;
				},
				{} as Record<string, number>,
			);

			return {
				summary,
				details: accessDetails,
			};
		} catch (error) {
			logger.error('Failed to generate compliance report', { error });
			throw new Error('Compliance report generation failed');
		}
	}

	/**
	 * Validate consent for data processing
	 */
	static async validateConsent(
		userId: string,
		processingPurpose: string,
	): Promise<boolean> {
		try {
			const db = getDb();

			// Check if user has given consent for the specific purpose
			const [user] = await db
				.select({ preferences: users.preferences })
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user) {
				return false;
			}

			const preferences = user.preferences as any;
			const consents = preferences?.consents || {};

			return consents[processingPurpose] === true;
		} catch (error) {
			logger.error('Failed to validate consent', {
				error,
				userId,
				processingPurpose,
			});
			return false;
		}
	}

	/**
	 * Update user consent preferences
	 */
	static async updateConsent(
		userId: string,
		consents: Record<string, boolean>,
	): Promise<boolean> {
		try {
			const db = getDb();

			await db
				.update(users)
				.set({
					preferences: sql`COALESCE(preferences, '{}') || jsonb_build_object('consents', ${JSON.stringify(consents)}, 'consentUpdatedAt', ${new Date().toISOString()})`,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));

			await GDPRCompliance.logDataAccess(
				userId,
				'UPDATE',
				'CONSENT',
				'User consent preferences updated',
			);

			logger.info('User consent updated', { userId, consents });
			return true;
		} catch (error) {
			logger.error('Failed to update consent', { error, userId });
			throw new Error('Consent update failed');
		}
	}
}

export default GDPRCompliance;
