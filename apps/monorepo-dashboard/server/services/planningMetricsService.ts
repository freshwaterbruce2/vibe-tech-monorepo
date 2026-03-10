// Planning Metrics Service for monorepo dashboard
// Tracks planning-with-files workflow effectiveness for 1-month trial

import SqliteDatabase from "better-sqlite3";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

// Constants
const PLANNING_FILES_ROOT = "D:\\planning-files";

// TypeScript interfaces
export interface PlanningSession {
	sessionId: string;
	projectName: string;
	startedAt: string;
	completedAt: string | null;
	status: "in_progress" | "completed" | "abandoned";
	objective: string | null;
	complexityScore: number;
	filesPlanned: number;
	filesModified: number;
	phasesTotal: number;
	phasesCompleted: number;
	recoveryCount: number;
	goalDriftCount: number;
}

export interface PlanningMetricsAggregate {
	date: string;
	projectName: string | null;
	sessionsStarted: number;
	sessionsCompleted: number;
	sessionsAbandoned: number;
	avgCompletionRate: number;
	avgPhasesCompleted: number;
	totalFilesPlanned: number;
	totalFilesModified: number;
	avgComplexityScore: number;
	recoveryRate: number;
	goalAdherenceRate: number;
	contextEfficiency: number;
}

export interface TrialComparison {
	metric: string;
	baseline: number;
	current: number;
	change: number;
	changePercent: number;
	improved: boolean;
}

export interface PlanningEvent {
	sessionId: string;
	eventType: string;
	eventData: Record<string, unknown>;
	timestamp: string;
}

// Database instance (singleton pattern)
let db: SqliteDatabase.Database | null = null;

/**
 * Initialize database and create tables if needed
 */
function initDatabase(): SqliteDatabase.Database {
	if (db) return db;

	console.log(
		`[PlanningMetricsService] Initializing database at ${config.DB_PATH}`,
	);

	db = new SqliteDatabase(config.DB_PATH);

	// Enable WAL mode for better concurrency
	db.pragma("journal_mode = WAL");
	db.pragma("busy_timeout = 5000");

	// Create planning_sessions table
	db.exec(`
    CREATE TABLE IF NOT EXISTS planning_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      project_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT DEFAULT 'in_progress',
      objective TEXT,
      complexity_score INTEGER DEFAULT 0,
      files_planned INTEGER DEFAULT 0,
      files_modified INTEGER DEFAULT 0,
      phases_total INTEGER DEFAULT 4,
      phases_completed INTEGER DEFAULT 0,
      recovery_count INTEGER DEFAULT 0,
      goal_drift_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

	// Create planning_metrics table for daily aggregation
	db.exec(`
    CREATE TABLE IF NOT EXISTS planning_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      project_name TEXT,
      sessions_started INTEGER DEFAULT 0,
      sessions_completed INTEGER DEFAULT 0,
      sessions_abandoned INTEGER DEFAULT 0,
      avg_completion_rate REAL,
      avg_phases_completed REAL,
      total_files_planned INTEGER DEFAULT 0,
      total_files_modified INTEGER DEFAULT 0,
      avg_complexity_score REAL,
      recovery_rate REAL,
      goal_adherence_rate REAL,
      context_efficiency REAL,
      UNIQUE(date, project_name)
    );
  `);

	// Create planning_baseline table for pre-trial metrics
	db.exec(`
    CREATE TABLE IF NOT EXISTS planning_baseline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT UNIQUE NOT NULL,
      baseline_value REAL NOT NULL,
      measurement_date TEXT NOT NULL,
      measurement_method TEXT,
      notes TEXT
    );
  `);

	// Create planning_events table for detailed event log
	db.exec(`
    CREATE TABLE IF NOT EXISTS planning_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES planning_sessions(session_id)
    );
  `);

	// Create indexes for faster queries
	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_project
    ON planning_sessions(project_name, started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sessions_status
    ON planning_sessions(status);

    CREATE INDEX IF NOT EXISTS idx_metrics_date
    ON planning_metrics(date DESC);

    CREATE INDEX IF NOT EXISTS idx_events_session
    ON planning_events(session_id, timestamp DESC);
  `);

	console.log("[PlanningMetricsService] Database initialized");

	return db;
}

/**
 * Start a new planning session
 */
export async function startSession(
	sessionId: string,
	projectName: string,
	objective: string,
	complexity: number = 0,
): Promise<PlanningSession> {
	const database = initDatabase();
	const startedAt = new Date().toISOString();

	const stmt = database.prepare(`
    INSERT INTO planning_sessions (
      session_id, project_name, started_at, status, objective, complexity_score
    ) VALUES (?, ?, ?, 'in_progress', ?, ?)
  `);

	stmt.run(sessionId, projectName, startedAt, objective, complexity);

	console.log(
		`[PlanningMetricsService] Started session ${sessionId} for ${projectName}`,
	);

	// Record start event
	await recordEvent(sessionId, "session_start", {
		objective,
		complexity,
	});

	return {
		sessionId,
		projectName,
		startedAt,
		completedAt: null,
		status: "in_progress",
		objective,
		complexityScore: complexity,
		filesPlanned: 0,
		filesModified: 0,
		phasesTotal: 4,
		phasesCompleted: 0,
		recoveryCount: 0,
		goalDriftCount: 0,
	};
}

/**
 * Complete or abandon a planning session
 */
export async function completeSession(
	sessionId: string,
	status: "completed" | "abandoned",
): Promise<void> {
	const database = initDatabase();
	const completedAt = new Date().toISOString();

	const stmt = database.prepare(`
    UPDATE planning_sessions
    SET completed_at = ?, status = ?
    WHERE session_id = ?
  `);

	stmt.run(completedAt, status, sessionId);

	console.log(
		`[PlanningMetricsService] Session ${sessionId} marked as ${status}`,
	);

	// Record completion event
	await recordEvent(sessionId, `session_${status}`, {
		completedAt,
	});
}

/**
 * Update session metrics
 */
export async function updateSession(
	sessionId: string,
	updates: Partial<{
		filesPlanned: number;
		filesModified: number;
		phasesCompleted: number;
		recoveryCount: number;
		goalDriftCount: number;
		complexityScore: number;
	}>,
): Promise<void> {
	const database = initDatabase();

	const setClauses: string[] = [];
	const values: (number | string)[] = [];

	if (updates.filesPlanned !== undefined) {
		setClauses.push("files_planned = ?");
		values.push(updates.filesPlanned);
	}
	if (updates.filesModified !== undefined) {
		setClauses.push("files_modified = ?");
		values.push(updates.filesModified);
	}
	if (updates.phasesCompleted !== undefined) {
		setClauses.push("phases_completed = ?");
		values.push(updates.phasesCompleted);
	}
	if (updates.recoveryCount !== undefined) {
		setClauses.push("recovery_count = ?");
		values.push(updates.recoveryCount);
	}
	if (updates.goalDriftCount !== undefined) {
		setClauses.push("goal_drift_count = ?");
		values.push(updates.goalDriftCount);
	}
	if (updates.complexityScore !== undefined) {
		setClauses.push("complexity_score = ?");
		values.push(updates.complexityScore);
	}

	if (setClauses.length === 0) return;

	values.push(sessionId);

	const stmt = database.prepare(`
    UPDATE planning_sessions
    SET ${setClauses.join(", ")}
    WHERE session_id = ?
  `);

	stmt.run(...values);

	console.log(`[PlanningMetricsService] Updated session ${sessionId}`);
}

/**
 * Record a planning event
 */
export async function recordEvent(
	sessionId: string,
	eventType: string,
	eventData: Record<string, unknown>,
): Promise<void> {
	const database = initDatabase();
	const timestamp = new Date().toISOString();

	const stmt = database.prepare(`
    INSERT INTO planning_events (session_id, event_type, event_data, timestamp)
    VALUES (?, ?, ?, ?)
  `);

	stmt.run(sessionId, eventType, JSON.stringify(eventData), timestamp);
}

/**
 * Get session metrics by ID
 */
export async function getSessionMetrics(
	sessionId: string,
): Promise<PlanningSession | null> {
	const database = initDatabase();

	const row = database
		.prepare(
			`
    SELECT *
    FROM planning_sessions
    WHERE session_id = ?
  `,
		)
		.get(sessionId) as
		| {
				session_id: string;
				project_name: string;
				started_at: string;
				completed_at: string | null;
				status: string;
				objective: string | null;
				complexity_score: number;
				files_planned: number;
				files_modified: number;
				phases_total: number;
				phases_completed: number;
				recovery_count: number;
				goal_drift_count: number;
		  }
		| undefined;

	if (!row) return null;

	return {
		sessionId: row.session_id,
		projectName: row.project_name,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		status: row.status as "in_progress" | "completed" | "abandoned",
		objective: row.objective,
		complexityScore: row.complexity_score,
		filesPlanned: row.files_planned,
		filesModified: row.files_modified,
		phasesTotal: row.phases_total,
		phasesCompleted: row.phases_completed,
		recoveryCount: row.recovery_count,
		goalDriftCount: row.goal_drift_count,
	};
}

/**
 * Get daily aggregated metrics
 */
export async function getDailyMetrics(
	days: number = 30,
	projectName?: string,
): Promise<PlanningMetricsAggregate[]> {
	const database = initDatabase();

	console.log(
		`[PlanningMetricsService] Fetching metrics for last ${days} days...`,
	);

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);
	const cutoffISO = cutoffDate.toISOString().split("T")[0] ?? cutoffDate.toISOString();

	let query = `
    SELECT
      DATE(started_at) as date,
      project_name,
      COUNT(*) as sessions_started,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as sessions_completed,
      SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as sessions_abandoned,
      AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as avg_completion_rate,
      AVG(phases_completed) as avg_phases_completed,
      SUM(files_planned) as total_files_planned,
      SUM(files_modified) as total_files_modified,
      AVG(complexity_score) as avg_complexity_score,
      AVG(CASE WHEN recovery_count > 0 THEN 1.0 ELSE 0.0 END) as recovery_rate,
      AVG(CASE WHEN goal_drift_count = 0 THEN 1.0 ELSE 0.0 END) as goal_adherence_rate,
      AVG(files_planned * 500) as context_efficiency
    FROM planning_sessions
    WHERE DATE(started_at) >= ?
  `;

	const params: (string | number)[] = [cutoffISO];

	if (typeof projectName === "string") {
		query += " AND project_name = ?";
		params.push(String(projectName));
	}

	query += " GROUP BY DATE(started_at), project_name ORDER BY date DESC";

	const rows = database.prepare(query).all(...params) as Array<{
		date: string;
		project_name: string | null;
		sessions_started: number;
		sessions_completed: number;
		sessions_abandoned: number;
		avg_completion_rate: number;
		avg_phases_completed: number;
		total_files_planned: number;
		total_files_modified: number;
		avg_complexity_score: number;
		recovery_rate: number;
		goal_adherence_rate: number;
		context_efficiency: number;
	}>;

	return rows.map((row) => ({
		date: row.date,
		projectName: row.project_name,
		sessionsStarted: row.sessions_started,
		sessionsCompleted: row.sessions_completed,
		sessionsAbandoned: row.sessions_abandoned,
		avgCompletionRate: row.avg_completion_rate || 0,
		avgPhasesCompleted: row.avg_phases_completed || 0,
		totalFilesPlanned: typeof row.total_files_planned === 'number' ? row.total_files_planned : 0,
		totalFilesModified: typeof row.total_files_modified === 'number' ? row.total_files_modified : 0,
		avgComplexityScore: row.avg_complexity_score || 0,
		recoveryRate: row.recovery_rate || 0,
		goalAdherenceRate: row.goal_adherence_rate || 0,
		contextEfficiency: row.context_efficiency || 0,
	}));
}

/**
 * Record baseline metric
 */
export async function recordBaseline(
	metricName: string,
	value: number,
	method: string,
	notes?: string,
): Promise<void> {
	const database = initDatabase();
	const measurementDate = new Date().toISOString();

	const stmt = database.prepare(`
    INSERT OR REPLACE INTO planning_baseline (
      metric_name, baseline_value, measurement_date, measurement_method, notes
    ) VALUES (?, ?, ?, ?, ?)
  `);

	stmt.run(metricName, value, measurementDate, method, notes || null);

	console.log(
		`[PlanningMetricsService] Recorded baseline: ${metricName} = ${value}`,
	);
}

/**
 * Get trial comparison (current vs baseline)
 */
export async function getTrialComparison(): Promise<TrialComparison[]> {
	const database = initDatabase();

	// Get baseline values
	const baselines = database
		.prepare("SELECT metric_name, baseline_value FROM planning_baseline")
		.all() as Array<{ metric_name: string; baseline_value: number }>;

	if (baselines.length === 0) {
		console.log(
			"[PlanningMetricsService] No baseline data available for comparison",
		);
		return [];
	}

	// Get current aggregated metrics
	const currentMetrics = database
		.prepare(
			`
    SELECT
      AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as task_completion_rate,
      AVG(CASE WHEN goal_drift_count = 0 THEN 1.0 ELSE 0.0 END) as goal_adherence_rate,
      AVG(CASE WHEN recovery_count > 0 THEN 1.0 ELSE 0.0 END) as recovery_rate,
      AVG(files_modified) as avg_files_per_task
    FROM planning_sessions
    WHERE started_at >= datetime('now', '-30 days')
  `,
		)
		.get() as {
		task_completion_rate: number | null;
		goal_adherence_rate: number | null;
		recovery_rate: number | null;
		avg_files_per_task: number | null;
	};

	const comparisons: TrialComparison[] = [];

	const metricMapping: Record<string, number | null> = {
		task_completion_rate: currentMetrics.task_completion_rate,
		goal_adherence_rate: currentMetrics.goal_adherence_rate,
		recovery_rate: currentMetrics.recovery_rate,
		avg_files_per_task: currentMetrics.avg_files_per_task,
	};

	for (const baseline of baselines) {
		const current = metricMapping[baseline.metric_name];
		if (current === null || current === undefined) continue;

		const change = current - baseline.baseline_value;
		const changePercent =
			baseline.baseline_value !== 0
				? (change / baseline.baseline_value) * 100
				: 0;

		// Determine if improvement (higher is better for most, lower for recovery_rate)
		const improved =
			baseline.metric_name === "recovery_rate" ? change < 0 : change > 0;

		comparisons.push({
			metric: baseline.metric_name,
			baseline: baseline.baseline_value,
			current,
			change,
			changePercent,
			improved,
		});
	}

	return comparisons;
}

/**
 * Get all active (in_progress) sessions
 */
export async function getActiveSessions(): Promise<PlanningSession[]> {
	const database = initDatabase();

	const rows = database
		.prepare(
			`
    SELECT *
    FROM planning_sessions
    WHERE status = 'in_progress'
    ORDER BY started_at DESC
  `,
		)
		.all() as Array<{
		session_id: string;
		project_name: string;
		started_at: string;
		completed_at: string | null;
		status: string;
		objective: string | null;
		complexity_score: number;
		files_planned: number;
		files_modified: number;
		phases_total: number;
		phases_completed: number;
		recovery_count: number;
		goal_drift_count: number;
	}>;

	return rows.map((row) => ({
		sessionId: row.session_id,
		projectName: row.project_name,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		status: row.status as "in_progress" | "completed" | "abandoned",
		objective: row.objective,
		complexityScore: row.complexity_score,
		filesPlanned: row.files_planned,
		filesModified: row.files_modified,
		phasesTotal: row.phases_total,
		phasesCompleted: row.phases_completed,
		recoveryCount: row.recovery_count,
		goalDriftCount: row.goal_drift_count,
	}));
}

/**
 * Scan planning files directory for active sessions
 */
export async function scanPlanningFiles(): Promise<
	Array<{ project: string; sessionId: string; path: string; status: string }>
> {
	const results: Array<{
		project: string;
		sessionId: string;
		path: string;
		status: string;
	}> = [];

	try {
		const projects = await fs.readdir(PLANNING_FILES_ROOT, {
			withFileTypes: true,
		});

		for (const project of projects) {
			if (!project.isDirectory() || project.name.startsWith("_")) continue;

			const projectPath = path.join(PLANNING_FILES_ROOT, project.name);
			const sessions = await fs.readdir(projectPath, { withFileTypes: true });

			for (const session of sessions) {
				if (!session.isDirectory()) continue;

				const sessionPath = path.join(projectPath, session.name);
				const taskPlanPath = path.join(sessionPath, "task_plan.md");

				try {
					const content = await fs.readFile(taskPlanPath, "utf-8");
					const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/);
					const status = statusMatch?.[1] ? statusMatch[1] : "unknown";

					results.push({
						project: project.name,
						sessionId: session.name,
						path: sessionPath,
						status,
					});
				} catch {
					// task_plan.md doesn't exist or can't be read
				}
			}
		}
	} catch (error) {
		console.error("[PlanningMetricsService] Failed to scan planning files:", error);
	}

	return results;
}

/**
 * Get summary metrics for dashboard
 */
export async function getSummaryMetrics(): Promise<{
	totalSessions: number;
	activeSessions: number;
	completedSessions: number;
	abandonedSessions: number;
	avgCompletionRate: number;
	avgGoalAdherence: number;
	trialDaysRemaining: number;
}> {
	const database = initDatabase();

	const stats = database
		.prepare(
			`
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
      SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_sessions,
      AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as avg_completion_rate,
      AVG(CASE WHEN goal_drift_count = 0 THEN 1.0 ELSE 0.0 END) as avg_goal_adherence
    FROM planning_sessions
  `,
		)
		.get() as {
		total_sessions: number;
		active_sessions: number;
		completed_sessions: number;
		abandoned_sessions: number;
		avg_completion_rate: number;
		avg_goal_adherence: number;
	};

	// Calculate trial days remaining (30-day trial)
	const trialStartRow = database
		.prepare("SELECT MIN(started_at) as start FROM planning_sessions")
		.get() as { start: string | null };

	let trialDaysRemaining = 30;
	if (trialStartRow?.start) {
		const trialStart = new Date(trialStartRow.start);
		const daysPassed = Math.floor(
			(Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24),
		);
		trialDaysRemaining = Math.max(0, 30 - daysPassed);
	}

	return {
		totalSessions: stats.total_sessions || 0,
		activeSessions: stats.active_sessions || 0,
		completedSessions: stats.completed_sessions || 0,
		abandonedSessions: stats.abandoned_sessions || 0,
		avgCompletionRate: stats.avg_completion_rate || 0,
		avgGoalAdherence: stats.avg_goal_adherence || 0,
		trialDaysRemaining,
	};
}

/**
 * Cleanup: Close database connection on process exit
 */
process.on("exit", () => {
	if (db) {
		console.log("[PlanningMetricsService] Closing database connection");
		db.close();
	}
});

process.on("SIGINT", () => {
	if (db) {
		db.close();
	}
	process.exit(0);
});
