// Nx Cloud metrics service - CI/CD build analytics
// Fetches build metrics from Nx Cloud API with local cache fallback

import SqliteDatabase from "better-sqlite3";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface NxCloudBuild {
	id: string;
	timestamp: string;
	branch: string;
	status: "success" | "failure" | "running";
	durationMs: number;
	cacheHitRate: number;
	tasksExecuted: number;
	tasksCached: number;
}

interface NxCloudStatus {
	connected: boolean;
	authenticationRequired: boolean;
	lastSync: string | null;
	buildsInDatabase: number;
	error?: string;
}

interface NxCloudPerformance {
	avgBuildTimeMs: number;
	avgCacheHitRate: number;
	totalBuilds: number;
	successRate: number;
	fastestBuildMs: number;
	slowestBuildMs: number;
}

interface NxCloudApiRun {
	id: string;
	createdAt: string;
	branch?: string;
	status: string;
	runTime?: number;
	cacheMisses?: number;
	cacheHits?: number;
}

interface NxCloudApiResponse {
	runs?: NxCloudApiRun[];
	error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const WORKSPACE_ID = "69628705131c1b679696c8f9";
const NX_CLOUD_API_URL = `https://cloud.nx.app/api/v2/workspaces/${WORKSPACE_ID}/runs`;

// Environment variable for authentication
const NX_CLOUD_ACCESS_TOKEN = process.env.NX_CLOUD_ACCESS_TOKEN;

// ============================================================================
// Database Initialization
// ============================================================================

let db: SqliteDatabase.Database | null = null;

function initializeDatabase(): SqliteDatabase.Database {
	if (db) return db;

	// Ensure db directory exists
	const dbDir = path.dirname(config.DB_PATH);
	try {
		if (!fsSync.existsSync(dbDir)) {
			fsSync.mkdirSync(dbDir, { recursive: true });
		}
	} catch (error) {
		console.error("[NxCloudService] Failed to create db directory:", error);
	}

	db = new SqliteDatabase(config.DB_PATH);

	// Enable WAL mode for better concurrency
	db.pragma("journal_mode = WAL");

	// Create nx_cloud_builds table
	db.exec(`
    CREATE TABLE IF NOT EXISTS nx_cloud_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      build_id TEXT UNIQUE NOT NULL,
      timestamp TEXT NOT NULL,
      branch TEXT,
      status TEXT,
      duration_ms INTEGER,
      cache_hit_rate REAL,
      tasks_executed INTEGER,
      tasks_cached INTEGER
    )
  `);

	// Create index for faster queries
	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON nx_cloud_builds(timestamp DESC)
  `);

	console.log("[NxCloudService] Database initialized:", config.DB_PATH);

	return db;
}

// ============================================================================
// Nx Cloud API Integration
// ============================================================================

async function fetchFromNxCloudApi(days: number = 7): Promise<NxCloudBuild[]> {
	if (!NX_CLOUD_ACCESS_TOKEN) {
		throw new Error("Authentication required: NX_CLOUD_ACCESS_TOKEN not set");
	}

	const since = new Date();
	since.setDate(since.getDate() - days);

	const url = `${NX_CLOUD_API_URL}?since=${since.toISOString()}`;

	console.log("[NxCloudService] Fetching from Nx Cloud API...");

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${NX_CLOUD_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		signal: AbortSignal.timeout(10000), // 10 second timeout
	});

	if (response.status === 401) {
		throw new Error(
			"Authentication required: Invalid or expired NX_CLOUD_ACCESS_TOKEN",
		);
	}

	if (!response.ok) {
		throw new Error(
			`Nx Cloud API error: ${response.status} ${response.statusText}`,
		);
	}

	const data: NxCloudApiResponse = await response.json();

	if (!data.runs || !Array.isArray(data.runs)) {
		console.warn("[NxCloudService] No runs found in API response");
		return [];
	}

	// Transform API response to our format
	const builds: NxCloudBuild[] = data.runs.map((run) => {
		const totalTasks = (run.cacheMisses || 0) + (run.cacheHits || 0);
		const cacheHitRate = totalTasks > 0 ? (run.cacheHits || 0) / totalTasks : 0;

		return {
			id: run.id,
			timestamp: run.createdAt,
			branch: run.branch || "unknown",
			status:
				run.status === "success"
					? "success"
					: run.status === "failure"
						? "failure"
						: "running",
			durationMs: run.runTime || 0,
			cacheHitRate,
			tasksExecuted: run.cacheMisses || 0,
			tasksCached: run.cacheHits || 0,
		};
	});

	console.log(
		`[NxCloudService] Fetched ${builds.length} builds from Nx Cloud API`,
	);

	return builds;
}

// ============================================================================
// Local Cache Fallback
// ============================================================================

async function fetchFromLocalCache(): Promise<NxCloudBuild[]> {
	console.log("[NxCloudService] Falling back to local .nx/cache");

	try {
		// Check if .nx/cache exists
		const cacheStats = await fs.stat(config.NX_CACHE_PATH);
		if (!cacheStats.isDirectory()) {
			console.warn("[NxCloudService] .nx/cache is not a directory");
			return [];
		}

		// Read cache directory
		const cacheFiles = await fs.readdir(config.NX_CACHE_PATH);

		// Filter for terminalOutputs files (these contain build metadata)
		const metadataFiles = cacheFiles.filter((f) => f.endsWith(".commit"));

		// Limit to last 50 builds to avoid performance issues
		const recentFiles = metadataFiles.slice(0, 50);

		const builds: NxCloudBuild[] = [];

		for (const file of recentFiles) {
			try {
				const filePath = path.join(config.NX_CACHE_PATH, file);
				const stats = await fs.stat(filePath);

				// Extract build ID from filename
				const buildId = file.replace(".commit", "");

				builds.push({
					id: buildId,
					timestamp: stats.mtime.toISOString(),
					branch: "unknown",
					status: "success", // Assume success if cached
					durationMs: 0, // Not available from cache
					cacheHitRate: 0, // Not available from cache
					tasksExecuted: 0,
					tasksCached: 0,
				});
			} catch (error) {
				console.warn(
					`[NxCloudService] Failed to read cache file ${file}:`,
					error,
				);
			}
		}

		console.log(
			`[NxCloudService] Fetched ${builds.length} builds from local cache`,
		);

		return builds;
	} catch (error) {
		console.error("[NxCloudService] Failed to read local cache:", error);
		return [];
	}
}

// ============================================================================
// Database Operations
// ============================================================================

function storeBuildInDatabase(build: NxCloudBuild): void {
	const db = initializeDatabase();

	const stmt = db.prepare(`
    INSERT OR REPLACE INTO nx_cloud_builds (
      build_id, timestamp, branch, status, duration_ms,
      cache_hit_rate, tasks_executed, tasks_cached
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

	stmt.run(
		build.id,
		build.timestamp,
		build.branch,
		build.status,
		build.durationMs,
		build.cacheHitRate,
		build.tasksExecuted,
		build.tasksCached,
	);
}

function getBuildsFromDatabase(days: number): NxCloudBuild[] {
	const db = initializeDatabase();

	const since = new Date();
	since.setDate(since.getDate() - days);

	const stmt = db.prepare(`
    SELECT
      build_id as id,
      timestamp,
      branch,
      status,
      duration_ms as durationMs,
      cache_hit_rate as cacheHitRate,
      tasks_executed as tasksExecuted,
      tasks_cached as tasksCached
    FROM nx_cloud_builds
    WHERE timestamp >= ?
    ORDER BY timestamp DESC
  `);

	return stmt.all(since.toISOString()) as NxCloudBuild[];
}

function getDatabaseBuildCount(): number {
	const db = initializeDatabase();
	const result = db
		.prepare("SELECT COUNT(*) as count FROM nx_cloud_builds")
		.get() as { count: number };
	return result.count;
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Get Nx Cloud connection status
 */
export async function getNxCloudStatus(): Promise<NxCloudStatus> {
	try {
		const db = initializeDatabase();

		// Check if we can connect to Nx Cloud API
		let connected = false;
		let authenticationRequired = false;
		let error: string | undefined;

		try {
			// Try to fetch a single build to test connection
			await fetchFromNxCloudApi(1);
			connected = true;
		} catch (err: any) {
			const message = err?.message || String(err);

			if (message.includes("Authentication required")) {
				authenticationRequired = true;
				error = "NX_CLOUD_ACCESS_TOKEN not configured";
			} else {
				error = message;
			}
		}

		// Get last sync time from database
		const lastBuildStmt = db.prepare(
			"SELECT MAX(timestamp) as lastSync FROM nx_cloud_builds",
		);
		const lastBuildResult = lastBuildStmt.get() as { lastSync: string | null };

		return {
			connected,
			authenticationRequired,
			lastSync: lastBuildResult.lastSync,
			buildsInDatabase: getDatabaseBuildCount(),
			error,
		};
	} catch (error: any) {
		console.error("[NxCloudService] Failed to get status:", error);
		return {
			connected: false,
			authenticationRequired: true,
			lastSync: null,
			buildsInDatabase: 0,
			error: error?.message || "Unknown error",
		};
	}
}

/**
 * Get recent builds from Nx Cloud (with fallback to local cache)
 */
export async function getNxCloudBuilds(
	days: number = 7,
): Promise<NxCloudBuild[]> {
	try {
		initializeDatabase();

		let builds: NxCloudBuild[] = [];

		// Try Nx Cloud API first
		try {
			builds = await fetchFromNxCloudApi(days);

			// Store builds in database
			for (const build of builds) {
				storeBuildInDatabase(build);
			}

			console.log(
				`[NxCloudService] Stored ${builds.length} builds in database`,
			);
		} catch (error: any) {
			const message = error?.message || String(error);
			console.warn("[NxCloudService] API fetch failed:", message);

			// If authentication error, try local cache
			if (message.includes("Authentication required")) {
				console.log("[NxCloudService] Attempting local cache fallback...");
				builds = await fetchFromLocalCache();

				// Store local cache builds in database
				for (const build of builds) {
					storeBuildInDatabase(build);
				}
			}

			// If still no builds, return from database
			if (builds.length === 0) {
				console.log("[NxCloudService] Returning builds from database");
				builds = getBuildsFromDatabase(days);
			}
		}

		return builds;
	} catch (error: any) {
		console.error("[NxCloudService] Failed to get builds:", error);

		// Last resort: return from database
		try {
			return getBuildsFromDatabase(days);
		} catch (dbError) {
			console.error(
				"[NxCloudService] Failed to get builds from database:",
				dbError,
			);
			return [];
		}
	}
}

/**
 * Get aggregate performance metrics
 */
export async function getNxCloudPerformance(
	days: number = 7,
): Promise<NxCloudPerformance> {
	try {
		const db = initializeDatabase();

		const since = new Date();
		since.setDate(since.getDate() - days);

		// Calculate aggregate metrics from database
		const metricsStmt = db.prepare(`
      SELECT
        AVG(duration_ms) as avgBuildTimeMs,
        AVG(cache_hit_rate) as avgCacheHitRate,
        COUNT(*) as totalBuilds,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
        MIN(duration_ms) as fastestBuildMs,
        MAX(duration_ms) as slowestBuildMs
      FROM nx_cloud_builds
      WHERE timestamp >= ?
    `);

		const result = metricsStmt.get(since.toISOString()) as {
			avgBuildTimeMs: number | null;
			avgCacheHitRate: number | null;
			totalBuilds: number;
			successCount: number;
			fastestBuildMs: number | null;
			slowestBuildMs: number | null;
		};

		const successRate =
			result.totalBuilds > 0 ? result.successCount / result.totalBuilds : 0;

		return {
			avgBuildTimeMs: result.avgBuildTimeMs || 0,
			avgCacheHitRate: result.avgCacheHitRate || 0,
			totalBuilds: result.totalBuilds,
			successRate,
			fastestBuildMs: result.fastestBuildMs || 0,
			slowestBuildMs: result.slowestBuildMs || 0,
		};
	} catch (error: any) {
		console.error("[NxCloudService] Failed to get performance metrics:", error);

		// Return empty metrics on error
		return {
			avgBuildTimeMs: 0,
			avgCacheHitRate: 0,
			totalBuilds: 0,
			successRate: 0,
			fastestBuildMs: 0,
			slowestBuildMs: 0,
		};
	}
}

// ============================================================================
// Cleanup on Exit
// ============================================================================

process.on("exit", () => {
	if (db) {
		try {
			db.close();
			console.log("[NxCloudService] Database connection closed");
		} catch (error) {
			console.error("[NxCloudService] Failed to close database:", error);
		}
	}
});
