import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { EventEmitter } from 'events';
import { getDb } from '../database';
import {
    securityEventsLog,
    userActivityLog,
} from '../database/schema';
import { logger } from '../utils/logger';

/**
 * Security Monitoring and Incident Response System
 */
export class SecurityMonitoringService extends EventEmitter {
	private static instance: SecurityMonitoringService;
	private alertThresholds: Record<string, number>;
	private monitoringActive = false;
	private incidentQueue: SecurityIncident[] = [];

	constructor() {
		super();
		this.alertThresholds = {
			failed_login_attempts: 5, // Failed logins per 15 minutes
			suspicious_ip_requests: 100, // Requests per minute from same IP
			admin_access_attempts: 3, // Failed admin access per hour
			payment_failures: 10, // Payment failures per hour
			unusual_user_activity: 50, // Activities per minute per user
			sql_injection_attempts: 1, // Immediate alert
			xss_attempts: 1, // Immediate alert
			rate_limit_exceeded: 20, // Rate limit hits per hour
		};
	}

	static getInstance(): SecurityMonitoringService {
		if (!SecurityMonitoringService.instance) {
			SecurityMonitoringService.instance = new SecurityMonitoringService();
		}
		return SecurityMonitoringService.instance;
	}

	/**
	 * Start security monitoring
	 */
	async startMonitoring(): Promise<void> {
		if (this.monitoringActive) {
			logger.warn('Security monitoring already active');
			return;
		}

		this.monitoringActive = true;
		logger.info('Starting security monitoring service');

		// Set up periodic monitoring tasks
		this.scheduleMonitoringTasks();

		// Set up real-time event handlers
		this.setupEventHandlers();

		logger.info('Security monitoring service started');
	}

	/**
	 * Stop security monitoring
	 */
	async stopMonitoring(): Promise<void> {
		this.monitoringActive = false;
		this.removeAllListeners();
		logger.info('Security monitoring service stopped');
	}

	/**
	 * Report a security event
	 */
	async reportSecurityEvent(event: {
		eventType: string;
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
		userId?: string;
		ipAddress: string;
		userAgent?: string;
		description: string;
		details?: Record<string, any>;
		detectionMethod?: string;
		ruleId?: string;
	}): Promise<string> {
		try {
			const db = getDb();

			// Create security event log entry
			const [securityEvent] = await db
				.insert(securityEventsLog)
				.values({
					eventType: event.eventType,
					severity: event.severity,
					description: event.description,
					userId: event.userId,
					ipAddress: event.ipAddress,
					userAgent: event.userAgent,
					details: {
						...event.details,
						detectionMethod: event.detectionMethod,
						ruleId: event.ruleId,
						timestamp: new Date().toISOString(),
					},
					detectionMethod: event.detectionMethod,
					ruleId: event.ruleId,
					metadata: {
						source: 'automated',
						confidence: 85,
					},
				})
				.returning({ id: securityEventsLog.id });

			// Emit event for real-time processing
			this.emit('securityEvent', {
				id: securityEvent.id,
				...event,
			});

			// Handle high-severity events immediately
			if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
				await this.handleHighSeverityIncident(securityEvent.id, event);
			}

			logger.info('Security event reported', {
				eventId: securityEvent.id,
				eventType: event.eventType,
				severity: event.severity,
			});

			return securityEvent.id;
		} catch (error) {
			logger.error('Failed to report security event', { error, event });
			throw new Error('Security event reporting failed');
		}
	}

	/**
	 * Analyze patterns for potential threats
	 */
	private async analyzeSecurityPatterns(): Promise<void> {
		try {
			const _db = getDb();
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
			const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

			// Check for failed login patterns
			await this.checkFailedLoginPatterns(fifteenMinutesAgo);

			// Check for suspicious IP activity
			await this.checkSuspiciousIPActivity(oneHourAgo);

			// Check for unusual user activity
			await this.checkUnusualUserActivity(oneHourAgo);

			// Check for payment anomalies
			await this.checkPaymentAnomalies(oneHourAgo);

			// Check for admin access patterns
			await this.checkAdminAccessPatterns(oneHourAgo);
		} catch (error) {
			logger.error('Failed to analyze security patterns', { error });
		}
	}

	/**
	 * Check for failed login patterns
	 */
	private async checkFailedLoginPatterns(since: Date): Promise<void> {
		const db = getDb();

		// Get failed login attempts by IP
		const failedLogins = await db
			.select({
				ipAddress: userActivityLog.ipAddress,
				count: sql<number>`count(*)`.as('count'),
			})
			.from(userActivityLog)
			.where(
				and(
					eq(userActivityLog.action, 'login'),
					eq(userActivityLog.success, false),
					gte(userActivityLog.occurredAt, since),
				),
			)
			.groupBy(userActivityLog.ipAddress)
			.having(sql`count(*) >= ${this.alertThresholds.failed_login_attempts}`);

		for (const loginPattern of failedLogins) {
			await this.reportSecurityEvent({
				eventType: 'failed_login_pattern',
				severity: 'HIGH',
				ipAddress: loginPattern.ipAddress || 'unknown',
				description: `Multiple failed login attempts detected from IP: ${loginPattern.ipAddress}`,
				details: {
					attemptCount: loginPattern.count,
					timeWindow: '15 minutes',
					threshold: this.alertThresholds.failed_login_attempts,
				},
				detectionMethod: 'pattern_analysis',
				ruleId: 'failed_login_threshold',
			});
		}
	}

	/**
	 * Check for suspicious IP activity
	 */
	private async checkSuspiciousIPActivity(since: Date): Promise<void> {
		const db = getDb();

		// Get high-activity IPs
		const suspiciousIPs = await db
			.select({
				ipAddress: userActivityLog.ipAddress,
				count: sql<number>`count(*)`.as('count'),
				uniqueUsers: sql<number>`count(DISTINCT user_id)`.as('uniqueUsers'),
			})
			.from(userActivityLog)
			.where(gte(userActivityLog.occurredAt, since))
			.groupBy(userActivityLog.ipAddress)
			.having(sql`count(*) >= ${this.alertThresholds.suspicious_ip_requests}`);

		for (const ipPattern of suspiciousIPs) {
			const severity = ipPattern.count > 500 ? 'CRITICAL' : 'HIGH';

			await this.reportSecurityEvent({
				eventType: 'suspicious_ip_activity',
				severity,
				ipAddress: ipPattern.ipAddress || 'unknown',
				description: `Unusually high activity detected from IP: ${ipPattern.ipAddress}`,
				details: {
					requestCount: ipPattern.count,
					uniqueUsers: ipPattern.uniqueUsers,
					timeWindow: '1 hour',
					threshold: this.alertThresholds.suspicious_ip_requests,
				},
				detectionMethod: 'traffic_analysis',
				ruleId: 'suspicious_ip_threshold',
			});
		}
	}

	/**
	 * Check for unusual user activity
	 */
	private async checkUnusualUserActivity(since: Date): Promise<void> {
		const db = getDb();

		// Get users with unusually high activity
		const activeUsers = await db
			.select({
				userId: userActivityLog.userId,
				count: sql<number>`count(*)`.as('count'),
				distinctIPs: sql<number>`count(DISTINCT ip_address)`.as('distinctIPs'),
			})
			.from(userActivityLog)
			.where(
				and(gte(userActivityLog.occurredAt, since), sql`user_id IS NOT NULL`),
			)
			.groupBy(userActivityLog.userId)
			.having(sql`count(*) >= ${this.alertThresholds.unusual_user_activity}`);

		for (const userPattern of activeUsers) {
			const severity =
				userPattern.distinctIPs && userPattern.distinctIPs > 5
					? 'HIGH'
					: 'MEDIUM';

			await this.reportSecurityEvent({
				eventType: 'unusual_user_activity',
				severity,
				userId: userPattern.userId || undefined,
				ipAddress: 'multiple',
				description: `User showing unusually high activity: ${userPattern.userId}`,
				details: {
					activityCount: userPattern.count,
					distinctIPs: userPattern.distinctIPs,
					timeWindow: '1 hour',
					threshold: this.alertThresholds.unusual_user_activity,
				},
				detectionMethod: 'behavior_analysis',
				ruleId: 'unusual_activity_threshold',
			});
		}
	}

	/**
	 * Check for payment anomalies
	 */
	private async checkPaymentAnomalies(since: Date): Promise<void> {
		const db = getDb();

		// Get payment failure patterns
		const paymentFailures = await db.execute(sql`
      SELECT
        COUNT(*) as failure_count,
        COUNT(DISTINCT user_id) as affected_users,
        array_agg(DISTINCT error_code) as error_codes
      FROM payments
      WHERE status = 'failed'
      AND updated_at >= ${since.toISOString()}
    `);

		const failures = paymentFailures.rows[0] as any;
		if (
			failures &&
			failures.failure_count >= this.alertThresholds.payment_failures
		) {
			await this.reportSecurityEvent({
				eventType: 'payment_failure_pattern',
				severity: 'HIGH',
				ipAddress: 'system',
				description: 'High number of payment failures detected',
				details: {
					failureCount: failures.failure_count,
					affectedUsers: failures.affected_users,
					errorCodes: failures.error_codes,
					timeWindow: '1 hour',
					threshold: this.alertThresholds.payment_failures,
				},
				detectionMethod: 'transaction_analysis',
				ruleId: 'payment_failure_threshold',
			});
		}
	}

	/**
	 * Check for admin access patterns
	 */
	private async checkAdminAccessPatterns(since: Date): Promise<void> {
		const db = getDb();

		// Get failed admin access attempts
		const adminAttempts = await db
			.select({
				ipAddress: userActivityLog.ipAddress,
				count: sql<number>`count(*)`.as('count'),
			})
			.from(userActivityLog)
			.where(
				and(
					eq(userActivityLog.resource, 'admin'),
					eq(userActivityLog.success, false),
					gte(userActivityLog.occurredAt, since),
				),
			)
			.groupBy(userActivityLog.ipAddress)
			.having(sql`count(*) >= ${this.alertThresholds.admin_access_attempts}`);

		for (const adminPattern of adminAttempts) {
			await this.reportSecurityEvent({
				eventType: 'admin_access_attempts',
				severity: 'CRITICAL',
				ipAddress: adminPattern.ipAddress || 'unknown',
				description: `Multiple failed admin access attempts from IP: ${adminPattern.ipAddress}`,
				details: {
					attemptCount: adminPattern.count,
					timeWindow: '1 hour',
					threshold: this.alertThresholds.admin_access_attempts,
				},
				detectionMethod: 'access_analysis',
				ruleId: 'admin_access_threshold',
			});
		}
	}

	/**
	 * Handle high-severity incidents
	 */
	private async handleHighSeverityIncident(
		incidentId: string,
		event: any,
	): Promise<void> {
		try {
			// Add to incident queue for immediate processing
			this.incidentQueue.push({ id: incidentId, ...event });

			// Send immediate alerts
			await this.sendSecurityAlert({
				level: event.severity,
				title: `Security Incident: ${event.eventType}`,
				description: event.description,
				incidentId,
				details: event.details,
			});

			// Consider automatic response actions
			if (event.severity === 'CRITICAL') {
				await this.triggerAutomaticResponse(event);
			}

			logger.warn('High-severity security incident handled', {
				incidentId,
				eventType: event.eventType,
				severity: event.severity,
			});
		} catch (error) {
			logger.error('Failed to handle high-severity incident', {
				error,
				incidentId,
			});
		}
	}

	/**
	 * Send security alerts
	 */
	private async sendSecurityAlert(alert: {
		level: string;
		title: string;
		description: string;
		incidentId: string;
		details?: any;
	}): Promise<void> {
		// Log the alert
		logger.error('SECURITY ALERT', {
			level: alert.level,
			title: alert.title,
			description: alert.description,
			incidentId: alert.incidentId,
			details: alert.details,
			timestamp: new Date().toISOString(),
		});

		// In a production environment, this would:
		// - Send email alerts to security team
		// - Post to Slack security channel
		// - Create tickets in incident management system
		// - Send SMS for critical alerts
		// - Integrate with SIEM systems

		// For now, we'll emit an event that can be handled by external systems
		this.emit('securityAlert', alert);
	}

	/**
	 * Trigger automatic response actions
	 */
	private async triggerAutomaticResponse(event: any): Promise<void> {
		try {
			// Based on event type, trigger appropriate responses
			switch (event.eventType) {
				case 'failed_login_pattern':
				case 'suspicious_ip_activity':
					// Could implement IP blocking here
					logger.info('Automatic IP blocking would be triggered', {
						ipAddress: event.ipAddress,
						eventType: event.eventType,
					});
					break;

				case 'admin_access_attempts':
					// Could implement admin account lockout
					logger.info('Admin account security measures would be triggered', {
						eventType: event.eventType,
					});
					break;

				case 'payment_failure_pattern':
					// Could implement payment method verification
					logger.info('Payment security measures would be triggered', {
						eventType: event.eventType,
					});
					break;

				default:
					logger.info('No automatic response configured for event type', {
						eventType: event.eventType,
					});
			}
		} catch (error) {
			logger.error('Failed to trigger automatic response', { error, event });
		}
	}

	/**
	 * Schedule periodic monitoring tasks
	 */
	private scheduleMonitoringTasks(): void {
		// Analyze security patterns every 5 minutes
		setInterval(
			async () => {
				if (this.monitoringActive) {
					await this.analyzeSecurityPatterns();
				}
			},
			5 * 60 * 1000,
		);

		// Process incident queue every minute
		setInterval(async () => {
			if (this.monitoringActive) {
				await this.processIncidentQueue();
			}
		}, 60 * 1000);

		// Generate security reports daily
		setInterval(
			async () => {
				if (this.monitoringActive) {
					await this.generateDailySecurityReport();
				}
			},
			24 * 60 * 60 * 1000,
		);
	}

	/**
	 * Set up event handlers
	 */
	private setupEventHandlers(): void {
		this.on('securityEvent', (event) => {
			logger.info('Security event received', {
				eventId: event.id,
				eventType: event.eventType,
				severity: event.severity,
			});
		});

		this.on('securityAlert', (alert) => {
			// Handle security alerts (could integrate with external systems)
			logger.warn('Security alert processed', {
				level: alert.level,
				incidentId: alert.incidentId,
			});
		});
	}

	/**
	 * Process incident queue
	 */
	private async processIncidentQueue(): Promise<void> {
		while (this.incidentQueue.length > 0) {
			const incident = this.incidentQueue.shift();
			if (incident) {
				// Process incident (could include correlation, enrichment, etc.)
				logger.debug('Processing queued incident', { incidentId: incident.id });
			}
		}
	}

	/**
	 * Generate daily security report
	 */
	private async generateDailySecurityReport(): Promise<void> {
		try {
			const db = getDb();
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			yesterday.setHours(0, 0, 0, 0);

			const today = new Date(yesterday);
			today.setDate(today.getDate() + 1);

			// Get incident summary for yesterday
			const incidentSummary = await db
				.select({
					severity: securityEventsLog.severity,
					count: sql<number>`count(*)`.as('count'),
				})
				.from(securityEventsLog)
				.where(
					and(
						gte(securityEventsLog.occurredAt, yesterday),
						lte(securityEventsLog.occurredAt, today),
					),
				)
				.groupBy(securityEventsLog.severity);

			const report = {
				date: yesterday.toISOString().split('T')[0],
				summary: incidentSummary,
				totalIncidents: incidentSummary.reduce(
					(sum, item) => sum + item.count,
					0,
				),
				generatedAt: new Date().toISOString(),
			};

			logger.info('Daily security report generated', report);

			// In production, this would be sent to security team
			this.emit('dailyReport', report);
		} catch (error) {
			logger.error('Failed to generate daily security report', { error });
		}
	}

	/**
	 * Get security metrics
	 */
	async getSecurityMetrics(
		timeframe: 'hour' | 'day' | 'week' = 'day',
	): Promise<any> {
		try {
			const db = getDb();
			const now = new Date();
			let since: Date;

			switch (timeframe) {
				case 'hour':
					since = new Date(now.getTime() - 60 * 60 * 1000);
					break;
				case 'week':
					since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				default:
					since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			}

			const incidents = await db
				.select({
					severity: securityEventsLog.severity,
					incidentType: securityEventsLog.eventType,
					count: sql<number>`count(*)`.as('count'),
				})
				.from(securityEventsLog)
				.where(gte(securityEventsLog.occurredAt, since))
				.groupBy(securityEventsLog.severity, securityEventsLog.eventType);

			return {
				timeframe,
				since: since.toISOString(),
				incidents,
				isMonitoringActive: this.monitoringActive,
			};
		} catch (error) {
			logger.error('Failed to get security metrics', { error });
			throw new Error('Security metrics retrieval failed');
		}
	}
}

// Types
interface SecurityIncident {
	id: string;
	eventType: string;
	severity: string;
	userId?: string;
	ipAddress: string;
	description: string;
	details?: any;
}

export default SecurityMonitoringService;
