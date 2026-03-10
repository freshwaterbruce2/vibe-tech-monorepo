// Bundle size tracking service
// Monitors Vite bundle outputs and tracks size trends over time

import SqliteDatabase from "better-sqlite3";
import fs from "fs/promises";
import { glob } from "glob";
import path from "path";
import { config } from "../config.js";

interface BundleAsset {
	name: string;
	size: number;
}

interface ViteStatsJson {
	assets: BundleAsset[];
}

interface BundleSnapshot {
	id?: number;
	project_name: string;
	timestamp: string;
	total_size: number;
	gzip_size: number;
	chunk_count: number;
	largest_chunk: string;
	largest_chunk_size: number;
}

interface BundleLatest extends BundleSnapshot {
	regression: boolean;
	size_change_percent?: number;
}

interface BundleTrend {
	project_name: string;
	snapshots: Array<{
		timestamp: string;
		total_size: number;
		gzip_size: number;
	}>;
	average_size: number;
	trend: "increasing" | "decreasing" | "stable";
}

interface ChunkAnalysis {
	name: string;
	size: number;
	gzip_size: number;
	percent_of_total: number;
}

interface BundleAnalysis {
	project_name: string;
	total_size: number;
	gzip_size: number;
	chunk_count: number;
	chunks: ChunkAnalysis[];
	largest_chunks: ChunkAnalysis[];
	compression_ratio: number;
}

// Configuration (from shared config)
const REGRESSION_THRESHOLD = 0.1; // 10% increase = regression

// Initialize database and create schema
function initializeDatabase(): SqliteDatabase.Database {
	const dbDir = path.dirname(config.DB_PATH);

	// Ensure db directory exists
	try {
		fs.access(dbDir);
	} catch {
		fs.mkdir(dbDir, { recursive: true });
	}

	const db = new SqliteDatabase(config.DB_PATH);

	// Enable WAL mode for better concurrency
	db.pragma("journal_mode = WAL");

	// Create table if not exists
	db.exec(`
    CREATE TABLE IF NOT EXISTS bundle_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      total_size INTEGER NOT NULL,
      gzip_size INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      largest_chunk TEXT NOT NULL,
      largest_chunk_size INTEGER NOT NULL,
      UNIQUE(project_name, timestamp)
    )
  `);

	// Create index for faster queries
	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_timestamp
    ON bundle_snapshots(project_name, timestamp DESC)
  `);

	return db;
}

// Get database instance (singleton pattern)
let dbInstance: SqliteDatabase.Database | null = null;
function getDatabase(): SqliteDatabase.Database {
	if (!dbInstance) {
		dbInstance = initializeDatabase();
	}
	return dbInstance;
}

// Find all web apps with bundle outputs
async function findWebAppsWithBundles(): Promise<string[]> {
	try {
		// Look for stats.json or report.json in dist directories
		const statsFiles = await glob("apps/*/dist/{stats,report}.json", {
			cwd: config.WORKSPACE_ROOT,
			ignore: ["**/node_modules/**"],
			absolute: false,
		});

		// Extract unique project names
		const projects = new Set<string>();
		for (const file of statsFiles) {
			if (typeof file !== "string") continue;
			const match = (file as string).match(new RegExp("apps/([^/]+)/"));
			if (match?.[1]) {
				projects.add(match[1]);
			}
		}

		return Array.from(projects);
	} catch (error) {
		console.error("[BundleSizeService] Failed to find web apps:", error);
		return [];
	}
}

// Read bundle stats from project
async function readBundleStats(
	projectName: string,
): Promise<ViteStatsJson | null> {
	try {
		const projectRoot = path.join(config.WORKSPACE_ROOT, "apps", projectName);

		// Try stats.json first, then report.json
		const possiblePaths = [
			path.join(projectRoot, "dist", "stats.json"),
			path.join(projectRoot, "dist", "report.json"),
		];

		for (const statsPath of possiblePaths) {
			try {
				const content = await fs.readFile(statsPath, "utf-8");
				return JSON.parse(content) as ViteStatsJson;
			} catch {}
		}

		return null;
	} catch (error) {
		console.error(
			`[BundleSizeService] Failed to read bundle stats for ${projectName}:`,
			error,
		);
		return null;
	}
}

// Calculate bundle metrics from stats
async function calculateBundleMetrics(
	projectName: string,
	stats: ViteStatsJson,
): Promise<Omit<BundleSnapshot, "id" | "timestamp"> | null> {
	try {
		if (!stats.assets || stats.assets.length === 0) {
			return null;
		}

		const totalSize = stats.assets.reduce((sum, asset) => sum + asset.size, 0);

		// Find largest chunk
		const sortedAssets = [...stats.assets].sort((a, b) => b.size - a.size);
		const largestChunk = sortedAssets[0];

		if (!largestChunk) {
			return null;
		}

		// Calculate approximate gzip size (average 70% compression ratio)
		// In production, you'd read actual files and gzip them
		const estimatedGzipSize = Math.floor(totalSize * 0.3);

		return {
			project_name: projectName,
			total_size: totalSize,
			gzip_size: estimatedGzipSize,
			chunk_count: stats.assets.length,
			largest_chunk: largestChunk.name,
			largest_chunk_size: largestChunk.size,
		};
	} catch (error) {
		console.error(
			`[BundleSizeService] Failed to calculate metrics for ${projectName}:`,
			error,
		);
		return null;
	}
}

// Save bundle snapshot to database
function saveBundleSnapshot(snapshot: Omit<BundleSnapshot, "id">): void {
	const db = getDatabase();

	const stmt = db.prepare(`
    INSERT OR REPLACE INTO bundle_snapshots
    (project_name, timestamp, total_size, gzip_size, chunk_count, largest_chunk, largest_chunk_size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

	stmt.run(
		snapshot.project_name,
		snapshot.timestamp,
		snapshot.total_size,
		snapshot.gzip_size,
		snapshot.chunk_count,
		snapshot.largest_chunk,
		snapshot.largest_chunk_size,
	);
}

// Scan all projects and update snapshots
export async function scanAndUpdateBundles(): Promise<void> {
	try {
		const projects = await findWebAppsWithBundles();
		console.log(
			`[BundleSizeService] Scanning ${projects.length} projects for bundle stats`,
		);

		for (const project of projects) {
			const stats = await readBundleStats(project);
			if (!stats) {
				continue;
			}

			const metrics = await calculateBundleMetrics(project, stats);
			if (!metrics) {
				continue;
			}

			const snapshot: Omit<BundleSnapshot, "id"> = {
				...metrics,
				timestamp: new Date().toISOString(),
			};

			saveBundleSnapshot(snapshot);
			console.log(
				`[BundleSizeService] Saved snapshot for ${project}: ${snapshot.total_size} bytes`,
			);
		}
	} catch (error) {
		console.error(
			"[BundleSizeService] Failed to scan and update bundles:",
			error,
		);
	}
}

/**
 * GET /api/bundles/latest - Current bundle sizes by project
 */
export function getLatestBundleSizes(): BundleLatest[] {
	const db = getDatabase();

	// Get latest snapshot for each project
	const stmt = db.prepare(`
    SELECT
      bs.*,
      prev.total_size as prev_total_size
    FROM bundle_snapshots bs
    LEFT JOIN bundle_snapshots prev ON
      prev.project_name = bs.project_name AND
      prev.timestamp = (
        SELECT timestamp
        FROM bundle_snapshots
        WHERE project_name = bs.project_name AND timestamp < bs.timestamp
        ORDER BY timestamp DESC
        LIMIT 1
      )
    WHERE bs.timestamp = (
      SELECT MAX(timestamp)
      FROM bundle_snapshots
      WHERE project_name = bs.project_name
    )
    ORDER BY bs.total_size DESC
  `);

	const rows = stmt.all() as Array<
		BundleSnapshot & { prev_total_size?: number }
	>;

	return rows.map((row) => {
		const { prev_total_size, ...snapshot } = row;

		// Calculate regression
		let regression = false;
		let size_change_percent: number | undefined;

		if (prev_total_size && prev_total_size > 0) {
			const change = (snapshot.total_size - prev_total_size) / prev_total_size;
			size_change_percent = Math.round(change * 100);
			regression = change > REGRESSION_THRESHOLD;
		}

		return {
			...snapshot,
			regression,
			size_change_percent,
		};
	});
}

/**
 * GET /api/bundles/trends?days=30 - Size history
 */
export function getBundleTrends(days: number = 30): BundleTrend[] {
	const db = getDatabase();

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);
	const cutoffISO = cutoffDate.toISOString();

	// Get all snapshots within date range
	const stmt = db.prepare(`
    SELECT
      project_name,
      timestamp,
      total_size,
      gzip_size
    FROM bundle_snapshots
    WHERE timestamp >= ?
    ORDER BY project_name, timestamp ASC
  `);

	const rows = stmt.all(cutoffISO) as Array<{
		project_name: string;
		timestamp: string;
		total_size: number;
		gzip_size: number;
	}>;

	// Group by project
	const projectMap = new Map<
		string,
		Array<{ timestamp: string; total_size: number; gzip_size: number }>
	>();

	for (const row of rows) {
		if (!projectMap.has(row.project_name)) {
			projectMap.set(row.project_name, []);
		}
		projectMap.get(row.project_name)!.push({
			timestamp: row.timestamp,
			total_size: row.total_size,
			gzip_size: row.gzip_size,
		});
	}

	// Calculate trends
	const trends: BundleTrend[] = [];

	for (const [project_name, snapshots] of projectMap.entries()) {
		if (snapshots.length === 0) continue;

		const totalSizes = snapshots.map((s) => s.total_size);
		const average_size = Math.floor(
			totalSizes.reduce((sum, s) => sum + s, 0) / totalSizes.length,
		);

		// Determine trend (compare first half to second half)
		let trend: "increasing" | "decreasing" | "stable" = "stable";

		if (snapshots.length >= 4) {
			const midpoint = Math.floor(snapshots.length / 2);
			const firstHalf = snapshots.slice(0, midpoint);
			const secondHalf = snapshots.slice(midpoint);

			const avgFirst =
				firstHalf.reduce((sum, s) => sum + s.total_size, 0) / firstHalf.length;
			const avgSecond =
				secondHalf.reduce((sum, s) => sum + s.total_size, 0) /
				secondHalf.length;

			const change = (avgSecond - avgFirst) / avgFirst;

			if (change > 0.05) {
				trend = "increasing";
			} else if (change < -0.05) {
				trend = "decreasing";
			}
		}

		trends.push({
			project_name,
			snapshots,
			average_size,
			trend,
		});
	}

	return trends;
}

/**
 * GET /api/bundles/analysis/:project - Detailed breakdown
 */
export async function getBundleAnalysis(
	projectName: string,
): Promise<BundleAnalysis | null> {
	try {
		// Read current bundle stats
		const stats = await readBundleStats(projectName);
		if (!stats?.assets || stats.assets.length === 0) {
			return null;
		}

		const totalSize = stats.assets.reduce((sum, asset) => sum + asset.size, 0);
		const estimatedGzipSize = Math.floor(totalSize * 0.3);

		// Analyze each chunk
		const chunks: ChunkAnalysis[] = stats.assets.map((asset) => ({
			name: asset.name,
			size: asset.size,
			gzip_size: Math.floor(asset.size * 0.3),
			percent_of_total: Math.round((asset.size / totalSize) * 100 * 10) / 10,
		}));

		// Sort by size descending
		chunks.sort((a, b) => b.size - a.size);

		return {
			project_name: projectName,
			total_size: totalSize,
			gzip_size: estimatedGzipSize,
			chunk_count: stats.assets.length,
			chunks,
			largest_chunks: chunks.slice(0, 10),
			compression_ratio:
				Math.round((estimatedGzipSize / totalSize) * 100 * 10) / 10,
		};
	} catch (error) {
		console.error(
			`[BundleSizeService] Failed to analyze bundle for ${projectName}:`,
			error,
		);
		return null;
	}
}

console.log("[BundleSizeService] Initialized");

// Cleanup handlers to prevent database connection leaks
process.on("exit", () => {
	if (dbInstance) {
		console.log("[BundleSizeService] Closing database connection");
		dbInstance.close();
	}
});

process.on("SIGINT", () => {
	if (dbInstance) {
		dbInstance.close();
	}
	process.exit(0);
});

process.on("SIGTERM", () => {
	if (dbInstance) {
		dbInstance.close();
	}
	process.exit(0);
});
