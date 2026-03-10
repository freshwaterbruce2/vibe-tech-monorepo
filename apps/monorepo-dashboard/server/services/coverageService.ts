// Coverage service for monorepo dashboard
// Aggregates test coverage from Vitest (v8/istanbul) and pytest across all projects

import SqliteDatabase from "better-sqlite3";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

// Database configuration (from shared config)

// TypeScript interfaces
export interface CoverageMetrics {
	linesCovered: number;
	linesTotal: number;
	statementsCovered: number;
	statementsTotal: number;
	branchesCovered: number;
	branchesTotal: number;
	functionsCovered: number;
	functionsTotal: number;
	coveragePercent: number;
}

export interface ProjectCoverage {
	projectName: string;
	timestamp: string;
	metrics: CoverageMetrics;
}

export interface CoverageTrend {
	projectName: string;
	dataPoints: Array<{
		timestamp: string;
		coveragePercent: number;
	}>;
}

export interface DetailedCoverage extends ProjectCoverage {
	linesPercent: number;
	statementsPercent: number;
	branchesPercent: number;
	functionsPercent: number;
}

// V8 coverage format (Vitest default)
interface V8Coverage {
	total?: {
		lines?: { covered: number; total: number; pct?: number };
		statements?: { covered: number; total: number; pct?: number };
		branches?: { covered: number; total: number; pct?: number };
		functions?: { covered: number; total: number; pct?: number };
	};
}

// Istanbul coverage format (legacy)
interface IstanbulCoverage {
	total?: {
		lines?: { pct: number; covered?: number; total?: number };
		statements?: { pct: number; covered?: number; total?: number };
		branches?: { pct: number; covered?: number; total?: number };
		functions?: { pct: number; covered?: number; total?: number };
	};
}

// Database instance (singleton pattern)
let db: SqliteDatabase.Database | null = null;

/**
 * Initialize database and create table if needed
 */
function initDatabase(): SqliteDatabase.Database {
	if (db) return db;

	console.log(`[CoverageService] Initializing database at ${config.DB_PATH}`);

	db = new SqliteDatabase(config.DB_PATH);

	// Enable WAL mode for better concurrency
	db.pragma("journal_mode = WAL");
	db.pragma("busy_timeout = 5000");

	// Create coverage_snapshots table
	db.exec(`
    CREATE TABLE IF NOT EXISTS coverage_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      lines_covered INTEGER,
      lines_total INTEGER,
      statements_covered INTEGER,
      statements_total INTEGER,
      branches_covered INTEGER,
      branches_total INTEGER,
      functions_covered INTEGER,
      functions_total INTEGER,
      coverage_percent REAL,
      UNIQUE(project_name, timestamp)
    );
  `);

	// Create index for faster queries
	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_timestamp
    ON coverage_snapshots(project_name, timestamp DESC);
  `);

	console.log("[CoverageService] Database initialized");

	return db;
}

/**
 * Parse v8 coverage format (Vitest default)
 */
function parseV8Coverage(data: V8Coverage): CoverageMetrics | null {
	const total = data.total;
	if (!total) return null;

	const lines = total.lines || { covered: 0, total: 0 };
	const statements = total.statements || { covered: 0, total: 0 };
	const branches = total.branches || { covered: 0, total: 0 };
	const functions = total.functions || { covered: 0, total: 0 };

	const coveragePercent =
		lines.total > 0
			? Math.round((lines.covered / lines.total) * 10000) / 100
			: 0;

	return {
		linesCovered: lines.covered,
		linesTotal: lines.total,
		statementsCovered: statements.covered,
		statementsTotal: statements.total,
		branchesCovered: branches.covered,
		branchesTotal: branches.total,
		functionsCovered: functions.covered,
		functionsTotal: functions.total,
		coveragePercent,
	};
}

/**
 * Parse istanbul coverage format
 */
function parseIstanbulCoverage(data: IstanbulCoverage): CoverageMetrics | null {
	const total = data.total;
	if (!total) return null;

	const lines = total.lines || { pct: 0, covered: 0, total: 0 };
	const statements = total.statements || { pct: 0, covered: 0, total: 0 };
	const branches = total.branches || { pct: 0, covered: 0, total: 0 };
	const functions = total.functions || { pct: 0, covered: 0, total: 0 };

	// Safely access properties with defaults
	const linesTotal = lines.total ?? 0;
	const linesCovered = lines.covered ?? 0;
	const statementsTotal = statements.total ?? 0;
	const statementsCovered = statements.covered ?? 0;
	const branchesTotal = branches.total ?? 0;
	const branchesCovered = branches.covered ?? 0;
	const functionsTotal = functions.total ?? 0;
	const functionsCovered = functions.covered ?? 0;

	// Prefer pct if available, otherwise calculate from covered/total
	const coveragePercent =
		lines.pct !== undefined
			? Math.round(lines.pct * 100) / 100
			: linesTotal > 0
				? Math.round((linesCovered / linesTotal) * 10000) / 100
				: 0;

	return {
		linesCovered,
		linesTotal,
		statementsCovered,
		statementsTotal,
		branchesCovered,
		branchesTotal,
		functionsCovered,
		functionsTotal,
		coveragePercent,
	};
}

/**
 * Scan workspace for coverage files
 */
async function scanCoverageFiles(): Promise<Map<string, string>> {
	const coverageFiles = new Map<string, string>();

	try {
		// Scan apps/
		const appsDir = path.join(config.WORKSPACE_ROOT, "apps");
		try {
			const apps = await fs.readdir(appsDir, { withFileTypes: true });

			for (const app of apps) {
				if (!app.isDirectory()) continue;

				const projectName = app.name;

				// Check for Vitest coverage (coverage/coverage-summary.json or coverage.json)
				const vitestPaths = [
					path.join(appsDir, projectName, "coverage", "coverage-summary.json"),
					path.join(appsDir, projectName, "coverage", "coverage.json"),
				];

				for (const vitestPath of vitestPaths) {
					try {
						await fs.access(vitestPath);
						coverageFiles.set(projectName, vitestPath);
						break; // Use first found
					} catch {
						// File doesn't exist, try next
					}
				}

				// Check for pytest coverage (crypto-enhanced specific)
				if (projectName === "crypto-enhanced") {
					const pytestPath = path.join(appsDir, projectName, "coverage.json");
					try {
						await fs.access(pytestPath);
						coverageFiles.set(projectName, pytestPath);
					} catch {
						// File doesn't exist
					}
				}
			}
		} catch (error) {
			console.warn("[CoverageService] Failed to scan apps directory:", error);
		}

		// Scan packages/
		const packagesDir = path.join(config.WORKSPACE_ROOT, "packages");
		try {
			const packages = await fs.readdir(packagesDir, { withFileTypes: true });

			for (const pkg of packages) {
				if (!pkg.isDirectory()) continue;

				const projectName = `packages/${pkg.name}`;

				// Check for Vitest coverage
				const vitestPaths = [
					path.join(packagesDir, pkg.name, "coverage", "coverage-summary.json"),
					path.join(packagesDir, pkg.name, "coverage", "coverage.json"),
				];

				for (const vitestPath of vitestPaths) {
					try {
						await fs.access(vitestPath);
						coverageFiles.set(projectName, vitestPath);
						break;
					} catch {
						// File doesn't exist, try next
					}
				}
			}
		} catch (error) {
			console.warn(
				"[CoverageService] Failed to scan packages directory:",
				error,
			);
		}

		console.log(
			`[CoverageService] Found ${coverageFiles.size} coverage file(s)`,
		);

		return coverageFiles;
	} catch (error) {
		console.error("[CoverageService] Failed to scan coverage files:", error);
		return new Map();
	}
}

/**
 * Parse coverage file and extract metrics
 */
async function parseCoverageFile(
	filePath: string,
): Promise<CoverageMetrics | null> {
	try {
		const content = await fs.readFile(filePath, "utf-8");
		const data = JSON.parse(content);

		// Try v8 format first (Vitest default)
		let metrics = parseV8Coverage(data);
		if (metrics) return metrics;

		// Try istanbul format
		metrics = parseIstanbulCoverage(data);
		if (metrics) return metrics;

		console.warn(`[CoverageService] Unknown coverage format in ${filePath}`);
		return null;
	} catch (error) {
		console.error(`[CoverageService] Failed to parse ${filePath}:`, error);
		return null;
	}
}

/**
 * Store coverage snapshot in database
 */
function storeCoverageSnapshot(
	projectName: string,
	metrics: CoverageMetrics,
): void {
	const database = initDatabase();

	const timestamp = new Date().toISOString();

	const stmt = database.prepare(`
    INSERT OR REPLACE INTO coverage_snapshots (
      project_name, timestamp,
      lines_covered, lines_total,
      statements_covered, statements_total,
      branches_covered, branches_total,
      functions_covered, functions_total,
      coverage_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

	stmt.run(
		projectName,
		timestamp,
		metrics.linesCovered,
		metrics.linesTotal,
		metrics.statementsCovered,
		metrics.statementsTotal,
		metrics.branchesCovered,
		metrics.branchesTotal,
		metrics.functionsCovered,
		metrics.functionsTotal,
		metrics.coveragePercent,
	);

	console.log(
		`[CoverageService] Stored snapshot for ${projectName} (${metrics.coveragePercent}%)`,
	);
}

/**
 * GET /api/coverage/latest - Get current coverage for all projects
 */
export async function getLatestCoverage(): Promise<ProjectCoverage[]> {
	try {
		console.log("[CoverageService] Fetching latest coverage...");

		const coverageFiles = await scanCoverageFiles();
		const results: ProjectCoverage[] = [];

		for (const [projectName, filePath] of coverageFiles) {
			const metrics = await parseCoverageFile(filePath);

			if (metrics) {
				// Store snapshot
				storeCoverageSnapshot(projectName, metrics);

				results.push({
					projectName,
					timestamp: new Date().toISOString(),
					metrics,
				});
			}
		}

		console.log(
			`[CoverageService] Returned ${results.length} coverage snapshots`,
		);

		return results;
	} catch (error) {
		console.error("[CoverageService] Failed to get latest coverage:", error);
		return [];
	}
}

/**
 * GET /api/coverage/trends?days=30 - Get historical coverage trends
 */
export async function getCoverageTrends(
	days: number = 30,
): Promise<CoverageTrend[]> {
	try {
		const database = initDatabase();

		console.log(`[CoverageService] Fetching trends for last ${days} days...`);

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);
		const cutoffISO = cutoffDate.toISOString();

		const rows = database
			.prepare(
				`
      SELECT project_name, timestamp, coverage_percent
      FROM coverage_snapshots
      WHERE timestamp >= ?
      ORDER BY project_name, timestamp ASC
    `,
			)
			.all(cutoffISO) as Array<{
			project_name: string;
			timestamp: string;
			coverage_percent: number;
		}>;

		// Group by project
		const projectMap = new Map<
			string,
			Array<{ timestamp: string; coveragePercent: number }>
		>();

		for (const row of rows) {
			if (!projectMap.has(row.project_name)) {
				projectMap.set(row.project_name, []);
			}

			projectMap.get(row.project_name)!.push({
				timestamp: row.timestamp,
				coveragePercent: row.coverage_percent,
			});
		}

		const trends: CoverageTrend[] = Array.from(projectMap.entries()).map(
			([projectName, dataPoints]) => ({
				projectName,
				dataPoints,
			}),
		);

		console.log(
			`[CoverageService] Returned trends for ${trends.length} project(s)`,
		);

		return trends;
	} catch (error) {
		console.error("[CoverageService] Failed to get coverage trends:", error);
		return [];
	}
}

/**
 * GET /api/coverage/details/:project - Get detailed coverage metrics for a project
 */
export async function getCoverageDetails(
	projectName: string,
): Promise<DetailedCoverage | null> {
	try {
		const database = initDatabase();

		console.log(`[CoverageService] Fetching details for ${projectName}...`);

		const row = database
			.prepare(
				`
      SELECT *
      FROM coverage_snapshots
      WHERE project_name = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `,
			)
			.get(projectName) as
			| {
					project_name: string;
					timestamp: string;
					lines_covered: number;
					lines_total: number;
					statements_covered: number;
					statements_total: number;
					branches_covered: number;
					branches_total: number;
					functions_covered: number;
					functions_total: number;
					coverage_percent: number;
			  }
			| undefined;

		if (!row) {
			console.warn(
				`[CoverageService] No coverage data found for ${projectName}`,
			);
			return null;
		}

		const linesPercent =
			row.lines_total > 0 ? (row.lines_covered / row.lines_total) * 100 : 0;
		const statementsPercent =
			row.statements_total > 0
				? (row.statements_covered / row.statements_total) * 100
				: 0;
		const branchesPercent =
			row.branches_total > 0
				? (row.branches_covered / row.branches_total) * 100
				: 0;
		const functionsPercent =
			row.functions_total > 0
				? (row.functions_covered / row.functions_total) * 100
				: 0;

		return {
			projectName: row.project_name,
			timestamp: row.timestamp,
			metrics: {
				linesCovered: row.lines_covered,
				linesTotal: row.lines_total,
				statementsCovered: row.statements_covered,
				statementsTotal: row.statements_total,
				branchesCovered: row.branches_covered,
				branchesTotal: row.branches_total,
				functionsCovered: row.functions_covered,
				functionsTotal: row.functions_total,
				coveragePercent: row.coverage_percent,
			},
			linesPercent: Math.round(linesPercent * 100) / 100,
			statementsPercent: Math.round(statementsPercent * 100) / 100,
			branchesPercent: Math.round(branchesPercent * 100) / 100,
			functionsPercent: Math.round(functionsPercent * 100) / 100,
		};
	} catch (error) {
		console.error(
			`[CoverageService] Failed to get details for ${projectName}:`,
			error,
		);
		return null;
	}
}

/**
 * Cleanup: Close database connection on process exit
 */
process.on("exit", () => {
	if (db) {
		console.log("[CoverageService] Closing database connection");
		db.close();
	}
});

process.on("SIGINT", () => {
	if (db) {
		db.close();
	}
	process.exit(0);
});
