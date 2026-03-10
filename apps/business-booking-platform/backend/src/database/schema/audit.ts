import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { users } from './users';

/**
 * Comprehensive Audit Logging System
 *
 * Tracks all changes to critical business data for compliance,
 * debugging, and security monitoring.
 */

/**
 * Master audit log table
 * Records all database changes with full before/after data
 */
export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Record identification
		tableName: varchar('table_name', { length: 100 }).notNull(),
		recordId: varchar('record_id', { length: 100 }).notNull(),

		// Operation details
		operation: varchar('operation', { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
		oldData: jsonb('old_data'), // Previous values (for UPDATE/DELETE)
		newData: jsonb('new_data'), // New values (for INSERT/UPDATE)
		changedFields: jsonb('changed_fields'), // List of fields that changed

		// User context
		changedBy: uuid('changed_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		impersonatedBy: uuid('impersonated_by').references(() => users.id, {
			onDelete: 'set null',
		}),

		// Request context
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		sessionId: varchar('session_id', { length: 255 }),
		requestId: varchar('request_id', { length: 100 }),

		// Application context
		apiEndpoint: varchar('api_endpoint', { length: 255 }),
		httpMethod: varchar('http_method', { length: 10 }),
		applicationVersion: varchar('application_version', { length: 50 }),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timing
		changedAt: timestamp('changed_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// Primary lookup indexes
			tableRecordIdx: index('audit_log_table_record_idx').on(
				table.tableName,
				table.recordId,
			),
			tableIdx: index('audit_log_table_idx').on(table.tableName),
			recordIdx: index('audit_log_record_idx').on(table.recordId),

			// User tracking
			changedByIdx: index('audit_log_changed_by_idx').on(table.changedBy),
			impersonatedByIdx: index('audit_log_impersonated_by_idx').on(
				table.impersonatedBy,
			),

			// Time-based queries
			changedAtIdx: index('audit_log_changed_at_idx').on(table.changedAt),

			// Operation filtering
			operationIdx: index('audit_log_operation_idx').on(table.operation),

			// Security monitoring
			ipAddressIdx: index('audit_log_ip_address_idx').on(table.ipAddress),
			sessionIdx: index('audit_log_session_idx').on(table.sessionId),

			// API monitoring
			endpointIdx: index('audit_log_endpoint_idx').on(table.apiEndpoint),

			// Complex queries
			userTimeIdx: index('audit_log_user_time_idx').on(
				table.changedBy,
				table.changedAt,
			),
			tableTimeIdx: index('audit_log_table_time_idx').on(
				table.tableName,
				table.changedAt,
			),
		};
	},
);

/**
 * User activity log
 * High-level tracking of user actions and sessions
 */
export const userActivityLog = pgTable(
	'user_activity_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// User identification
		userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
		sessionId: varchar('session_id', { length: 255 }),

		// Activity details
		action: varchar('action', { length: 100 }).notNull(), // login, logout, search, book, cancel, etc.
		resource: varchar('resource', { length: 100 }), // hotel, booking, payment, etc.
		resourceId: varchar('resource_id', { length: 100 }),
		description: text('description'),

		// Result
		success: boolean('success').notNull().default(true),
		errorMessage: text('error_message'),
		errorCode: varchar('error_code', { length: 50 }),

		// Request context
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent'),
		referer: text('referer'),

		// Location context (if available)
		geoCountry: varchar('geo_country', { length: 2 }),
		geoCity: varchar('geo_city', { length: 100 }),
		geoCoordinates: jsonb('geo_coordinates'),

		// Performance metrics
		responseTimeMs: integer('response_time_ms'),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timing
		occurredAt: timestamp('occurred_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// User tracking
			userIdIdx: index('user_activity_log_user_id_idx').on(table.userId),
			sessionIdx: index('user_activity_log_session_idx').on(table.sessionId),

			// Activity analysis
			actionIdx: index('user_activity_log_action_idx').on(table.action),
			resourceIdx: index('user_activity_log_resource_idx').on(table.resource),
			resourceIdIdx: index('user_activity_log_resource_id_idx').on(
				table.resourceId,
			),

			// Success/error analysis
			successIdx: index('user_activity_log_success_idx').on(table.success),
			errorCodeIdx: index('user_activity_log_error_code_idx').on(
				table.errorCode,
			),

			// Time-based analysis
			occurredAtIdx: index('user_activity_log_occurred_at_idx').on(
				table.occurredAt,
			),

			// Security monitoring
			ipAddressIdx: index('user_activity_log_ip_address_idx').on(
				table.ipAddress,
			),
			geoCountryIdx: index('user_activity_log_geo_country_idx').on(
				table.geoCountry,
			),

			// Performance monitoring
			responseTimeIdx: index('user_activity_log_response_time_idx').on(
				table.responseTimeMs,
			),

			// Complex queries
			userActionIdx: index('user_activity_log_user_action_idx').on(
				table.userId,
				table.action,
			),
			userTimeIdx: index('user_activity_log_user_time_idx').on(
				table.userId,
				table.occurredAt,
			),
			actionTimeIdx: index('user_activity_log_action_time_idx').on(
				table.action,
				table.occurredAt,
			),
		};
	},
);

/**
 * Security events log
 * Tracks security-related events and potential threats
 */
export const securityEventsLog = pgTable(
	'security_events_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Event classification
		eventType: varchar('event_type', { length: 50 }).notNull(), // failed_login, suspicious_activity, etc.
		severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical

		// User context (may be null for anonymous events)
		userId: uuid('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		sessionId: varchar('session_id', { length: 255 }),

		// Request context
		ipAddress: varchar('ip_address', { length: 45 }).notNull(),
		userAgent: text('user_agent'),

		// Event details
		description: text('description').notNull(),
		details: jsonb('details').default({}),

		// Detection
		detectionMethod: varchar('detection_method', { length: 50 }), // automatic, manual, external
		ruleId: varchar('rule_id', { length: 100 }), // ID of security rule that triggered

		// Response
		actionTaken: varchar('action_taken', { length: 100 }), // blocked, flagged, ignored
		resolvedAt: timestamp('resolved_at'),
		resolvedBy: uuid('resolved_by').references(() => users.id, {
			onDelete: 'set null',
		}),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timing
		occurredAt: timestamp('occurred_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// Event classification
			eventTypeIdx: index('security_events_log_event_type_idx').on(
				table.eventType,
			),
			severityIdx: index('security_events_log_severity_idx').on(table.severity),

			// User tracking
			userIdIdx: index('security_events_log_user_id_idx').on(table.userId),
			sessionIdx: index('security_events_log_session_idx').on(table.sessionId),

			// Security monitoring
			ipAddressIdx: index('security_events_log_ip_address_idx').on(
				table.ipAddress,
			),

			// Detection analysis
			detectionMethodIdx: index('security_events_log_detection_method_idx').on(
				table.detectionMethod,
			),
			ruleIdIdx: index('security_events_log_rule_id_idx').on(table.ruleId),

			// Response tracking
			actionTakenIdx: index('security_events_log_action_taken_idx').on(
				table.actionTaken,
			),
			resolvedByIdx: index('security_events_log_resolved_by_idx').on(
				table.resolvedBy,
			),

			// Time-based analysis
			occurredAtIdx: index('security_events_log_occurred_at_idx').on(
				table.occurredAt,
			),
			resolvedAtIdx: index('security_events_log_resolved_at_idx').on(
				table.resolvedAt,
			),

			// Complex queries
			severityTimeIdx: index('security_events_log_severity_time_idx').on(
				table.severity,
				table.occurredAt,
			),
			ipEventIdx: index('security_events_log_ip_event_idx').on(
				table.ipAddress,
				table.eventType,
			),
			unresolvedIdx: index('security_events_log_unresolved_idx')
				.on(table.severity)
				.where(sql`resolved_at IS NULL`),
		};
	},
);

/**
 * System performance log
 * Tracks system performance metrics and potential issues
 */
export const performanceLog = pgTable(
	'performance_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),

		// Metric identification
		metricType: varchar('metric_type', { length: 50 }).notNull(), // api_response_time, db_query_time, etc.
		operation: varchar('operation', { length: 100 }).notNull(), // search_hotels, create_booking, etc.

		// Performance metrics
		responseTimeMs: integer('response_time_ms').notNull(),
		memoryUsageMb: integer('memory_usage_mb'),
		cpuUsagePercent: numeric('cpu_usage_percent', { precision: 5, scale: 2 }),

		// Database metrics
		dbQueryCount: integer('db_query_count'),
		dbQueryTimeMs: integer('db_query_time_ms'),
		cacheHit: boolean('cache_hit'),

		// Request context
		userId: uuid('user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		sessionId: varchar('session_id', { length: 255 }),
		requestId: varchar('request_id', { length: 100 }),

		// Error information
		errorOccurred: boolean('error_occurred').notNull().default(false),
		errorMessage: text('error_message'),

		// Metadata
		metadata: jsonb('metadata').default({}),

		// Timing
		recordedAt: timestamp('recorded_at').notNull().defaultNow(),
	},
	(table) => {
		return {
			// Metric tracking
			metricTypeIdx: index('performance_log_metric_type_idx').on(
				table.metricType,
			),
			operationIdx: index('performance_log_operation_idx').on(table.operation),

			// Performance analysis
			responseTimeIdx: index('performance_log_response_time_idx').on(
				table.responseTimeMs,
			),
			memoryUsageIdx: index('performance_log_memory_usage_idx').on(
				table.memoryUsageMb,
			),
			cpuUsageIdx: index('performance_log_cpu_usage_idx').on(
				table.cpuUsagePercent,
			),

			// Database performance
			dbQueryCountIdx: index('performance_log_db_query_count_idx').on(
				table.dbQueryCount,
			),
			dbQueryTimeIdx: index('performance_log_db_query_time_idx').on(
				table.dbQueryTimeMs,
			),
			cacheHitIdx: index('performance_log_cache_hit_idx').on(table.cacheHit),

			// Error tracking
			errorOccurredIdx: index('performance_log_error_occurred_idx').on(
				table.errorOccurred,
			),

			// Time-based analysis
			recordedAtIdx: index('performance_log_recorded_at_idx').on(
				table.recordedAt,
			),

			// Complex queries
			operationTimeIdx: index('performance_log_operation_time_idx').on(
				table.operation,
				table.recordedAt,
			),
			performanceIdx: index('performance_log_performance_idx').on(
				table.metricType,
				table.responseTimeMs,
			),
			slowQueriesIdx: index('performance_log_slow_queries_idx')
				.on(table.responseTimeMs)
				.where(sql`response_time_ms > 1000`),
		};
	},
);

// Zod schemas
export const insertAuditLogSchema = createInsertSchema(auditLog);
export const selectAuditLogSchema = createSelectSchema(auditLog);
export const insertUserActivityLogSchema = createInsertSchema(userActivityLog);
export const selectUserActivityLogSchema = createSelectSchema(userActivityLog);
export const insertSecurityEventsLogSchema =
	createInsertSchema(securityEventsLog);
export const selectSecurityEventsLogSchema =
	createSelectSchema(securityEventsLog);
export const insertPerformanceLogSchema = createInsertSchema(performanceLog);
export const selectPerformanceLogSchema = createSelectSchema(performanceLog);

// Type exports
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type NewAuditLog = z.infer<typeof insertAuditLogSchema>;
export type UserActivityLog = z.infer<typeof selectUserActivityLogSchema>;
export type NewUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type SecurityEventsLog = z.infer<typeof selectSecurityEventsLogSchema>;
export type NewSecurityEventsLog = z.infer<
	typeof insertSecurityEventsLogSchema
>;
export type PerformanceLog = z.infer<typeof selectPerformanceLogSchema>;
export type NewPerformanceLog = z.infer<typeof insertPerformanceLogSchema>;
