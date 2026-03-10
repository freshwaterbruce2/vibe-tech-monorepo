import { sql } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../database';
import { logger } from '../utils/logger';

// Define audit event types
export enum AuditEventType {
	USER_LOGIN = 'user_login',
	USER_LOGOUT = 'user_logout',
	USER_REGISTER = 'user_register',
	PASSWORD_CHANGE = 'password_change',
	PASSWORD_RESET = 'password_reset',
	PAYMENT_CREATED = 'payment_created',
	PAYMENT_COMPLETED = 'payment_completed',
	PAYMENT_FAILED = 'payment_failed',
	REFUND_CREATED = 'refund_created',
	BOOKING_CREATED = 'booking_created',
	BOOKING_CANCELLED = 'booking_cancelled',
	ADMIN_ACCESS = 'admin_access',
	SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
	FAILED_AUTH_ATTEMPT = 'failed_auth_attempt',
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	SQL_QUERY_EXECUTED = 'sql_query_executed',
}

interface AuditLogEntry {
	eventType: AuditEventType;
	userId?: string;
	sessionId?: string;
	ipAddress: string;
	userAgent?: string;
	resource?: string;
	action?: string;
	details?: Record<string, any>;
	risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	timestamp: Date;
}

/**
 * Enhanced audit logging middleware for security compliance
 */
export class AuditLogger {
	/**
	 * Log a security-relevant event
	 */
	static async logEvent(entry: AuditLogEntry): Promise<void> {
		try {
			// Log to application logger
			logger.info('Security Audit Event', {
				eventType: entry.eventType,
				userId: entry.userId,
				sessionId: entry.sessionId,
				ipAddress: entry.ipAddress,
				userAgent: entry.userAgent,
				resource: entry.resource,
				action: entry.action,
				details: entry.details,
				riskLevel: entry.risk_level,
				timestamp: entry.timestamp,
			});

			// Store in database for compliance
			const db = getDb();
			await db.execute(sql`
        INSERT INTO audit_logs (
          event_type, user_id, session_id, ip_address, user_agent,
          resource, action, details, risk_level, created_at
        ) VALUES (
          ${entry.eventType}, ${entry.userId || null}, ${entry.sessionId || null},
          ${entry.ipAddress}, ${entry.userAgent || null}, ${entry.resource || null},
          ${entry.action || null}, ${JSON.stringify(entry.details || {})},
          ${entry.risk_level}, ${entry.timestamp.toISOString()}
        )
      `);

			// Alert on high-risk events
			if (entry.risk_level === 'HIGH' || entry.risk_level === 'CRITICAL') {
				await AuditLogger.sendSecurityAlert(entry);
			}
		} catch (error) {
			logger.error('Failed to log audit event', { error, entry });
		}
	}

	/**
	 * Middleware to automatically log HTTP requests
	 */
	static httpAuditMiddleware() {
		return (req: Request, res: Response, next: NextFunction) => {
			const startTime = Date.now();

			// Extract session info
			const sessionId =
				(req.headers['x-session-id'] as string) ||
				req.headers['authorization']?.split(' ')[1]?.substring(0, 8);

			// Store original res.json to capture response details
			const originalJson = res.json;
			let responseData: any = null;

			res.json = function (data: any) {
				responseData = data;
				return originalJson.call(this, data);
			};

			// Log after response is sent
			res.on('finish', async () => {
				const duration = Date.now() - startTime;
				const riskLevel = AuditLogger.assessRequestRisk(req, res, duration);

				// Only log significant events, not all requests
				if (AuditLogger.shouldLogRequest(req, res)) {
					await AuditLogger.logEvent({
						eventType: AuditLogger.getEventTypeFromRequest(req),
						userId: req.user?.id,
						sessionId,
						ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
						userAgent: req.get('User-Agent'),
						resource: req.path,
						action: req.method,
						details: {
							statusCode: res.statusCode,
							duration,
							requestSize: req.get('Content-Length') || 0,
							responseSize: JSON.stringify(responseData || {}).length,
							query: req.query,
							// Don't log sensitive data
							body: AuditLogger.sanitizeRequestBody(req.body, req.path),
						},
						risk_level: riskLevel,
						timestamp: new Date(startTime),
					});
				}
			});

			next();
		};
	}

	/**
	 * Log SQL query execution for audit trail
	 */
	static async logSqlQuery(
		query: string,
		params: any[],
		userId?: string,
		duration?: number,
	): Promise<void> {
		await AuditLogger.logEvent({
			eventType: AuditEventType.SQL_QUERY_EXECUTED,
			userId,
			ipAddress: 'server',
			resource: 'database',
			action: 'QUERY',
			details: {
				query: query.substring(0, 500), // Truncate long queries
				paramCount: params.length,
				duration,
				queryType: AuditLogger.getQueryType(query),
			},
			risk_level: AuditLogger.assessQueryRisk(query),
			timestamp: new Date(),
		});
	}

	private static shouldLogRequest(req: Request, res: Response): boolean {
		// Log security-relevant endpoints
		const sensitiveEndpoints = ['/auth', '/payment', '/admin', '/user'];
		const hasSensitiveEndpoint = sensitiveEndpoints.some((endpoint) =>
			req.path.includes(endpoint),
		);

		// Log failed requests
		const isFailedRequest = res.statusCode >= 400;

		// Log unusual requests
		const isUnusualRequest = req.method !== 'GET' && req.method !== 'POST';

		return hasSensitiveEndpoint || isFailedRequest || isUnusualRequest;
	}

	private static getEventTypeFromRequest(req: Request): AuditEventType {
		if (req.path.includes('/auth/login')) {
return AuditEventType.USER_LOGIN;
}
		if (req.path.includes('/auth/logout')) {
return AuditEventType.USER_LOGOUT;
}
		if (req.path.includes('/auth/register')) {
return AuditEventType.USER_REGISTER;
}
		if (req.path.includes('/payment')) {
return AuditEventType.PAYMENT_CREATED;
}
		if (req.path.includes('/admin')) {
return AuditEventType.ADMIN_ACCESS;
}
		return AuditEventType.SENSITIVE_DATA_ACCESS;
	}

	private static assessRequestRisk(
		req: Request,
		res: Response,
		duration: number,
	): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
		// Critical: Authentication failures, payment failures
		if (res.statusCode === 401 || res.statusCode === 403) {
return 'CRITICAL';
}
		if (req.path.includes('/payment') && res.statusCode >= 400) {
return 'CRITICAL';
}

		// High: Admin access, long response times, server errors
		if (req.path.includes('/admin')) {
return 'HIGH';
}
		if (res.statusCode >= 500) {
return 'HIGH';
}
		if (duration > 10000) {
return 'HIGH';
} // > 10 seconds

		// Medium: User operations, client errors
		if (req.path.includes('/auth') || req.path.includes('/user')) {
return 'MEDIUM';
}
		if (res.statusCode >= 400) {
return 'MEDIUM';
}

		return 'LOW';
	}

	private static assessQueryRisk(
		query: string,
	): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
		const upperQuery = query.toUpperCase();

		// Critical: Direct SQL modifications without proper params
		if (upperQuery.includes('DROP ') || upperQuery.includes('TRUNCATE ')) {
return 'CRITICAL';
}
		if (upperQuery.includes('ALTER ') && upperQuery.includes('SCHEMA')) {
return 'CRITICAL';
}

		// High: Data modifications
		if (upperQuery.includes('DELETE ') || upperQuery.includes('UPDATE ')) {
return 'HIGH';
}
		if (upperQuery.includes('INSERT ') && upperQuery.includes('users')) {
return 'HIGH';
}

		// Medium: Sensitive data access
		if (
			upperQuery.includes('SELECT ') &&
			(upperQuery.includes('password') ||
				upperQuery.includes('token') ||
				upperQuery.includes('payment'))
		) {
return 'MEDIUM';
}

		return 'LOW';
	}

	private static getQueryType(query: string): string {
		const upperQuery = query.toUpperCase().trim();
		if (upperQuery.startsWith('SELECT')) {
return 'SELECT';
}
		if (upperQuery.startsWith('INSERT')) {
return 'INSERT';
}
		if (upperQuery.startsWith('UPDATE')) {
return 'UPDATE';
}
		if (upperQuery.startsWith('DELETE')) {
return 'DELETE';
}
		if (upperQuery.startsWith('CREATE')) {
return 'CREATE';
}
		if (upperQuery.startsWith('ALTER')) {
return 'ALTER';
}
		if (upperQuery.startsWith('DROP')) {
return 'DROP';
}
		return 'OTHER';
	}

	private static sanitizeRequestBody(body: any, path: string): any {
		if (!body || typeof body !== 'object') {
return body;
}

		// Remove sensitive fields
		const sensitiveFields = [
			'password',
			'token',
			'secret',
			'key',
			'cvv',
			'cardNumber',
		];
		const sanitized = { ...body };

		sensitiveFields.forEach((field) => {
			if (field in sanitized) {
				sanitized[field] = '[REDACTED]';
			}
		});

		// For payment endpoints, be extra cautious
		if (path.includes('/payment')) {
			return { [Object.keys(sanitized)[0]]: '[PAYMENT_DATA_REDACTED]' };
		}

		return sanitized;
	}

	private static async sendSecurityAlert(entry: AuditLogEntry): Promise<void> {
		// In production, this would send alerts via email, Slack, or security monitoring system
		logger.warn('SECURITY ALERT', {
			level: entry.risk_level,
			event: entry.eventType,
			details: entry,
			alert: true,
		});

		// Could implement:
		// - Email alerts to security team
		// - Slack notifications
		// - Integration with SIEM systems
		// - Automated response triggers
	}
}

/**
 * Middleware for logging authentication events
 */
export const auditAuthEvent = (
	eventType: AuditEventType,
	riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Log before processing
		await AuditLogger.logEvent({
			eventType,
			userId: req.user?.id,
			ipAddress: req.ip || 'unknown',
			userAgent: req.get('User-Agent'),
			resource: req.path,
			action: req.method,
			details: {
				requestBody:
					AuditLogger.prototype.constructor.prototype.sanitizeRequestBody(
						req.body,
						req.path,
					),
			},
			risk_level: riskLevel,
			timestamp: new Date(),
		});

		next();
	};
};

export default AuditLogger;
