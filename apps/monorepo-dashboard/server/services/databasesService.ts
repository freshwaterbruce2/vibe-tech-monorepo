// Filesystem-based database discovery service
// Lists all .db files in D:\databases

import SqliteDatabase from "better-sqlite3";
import fs from "fs/promises";
import path from "path";

interface DatabaseInfo {
	name: string;
	path: string;
	size: number;
	status: "connected" | "disconnected" | "error";
	tableCount: number;
	lastModified: string;
}

const DATABASES_ROOT = "D:\\databases";

function isSafeDatabasePath(dbPath: string): boolean {
	const normalized = path.resolve(dbPath);
	const root = path.resolve(DATABASES_ROOT);
	return (
		normalized.toLowerCase().startsWith(root.toLowerCase()) &&
		normalized.toLowerCase().endsWith(".db")
	);
}

function getWalPath(dbPath: string): string {
	return `${dbPath}-wal`;
}

function tryGetDatabaseSummary(dbPath: string): {
	status: DatabaseInfo["status"];
	tableCount: number;
} {
	try {
		const db = new SqliteDatabase(dbPath, {
			readonly: true,
			fileMustExist: true,
		});
		try {
			const row = db
				.prepare(
					"SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
				)
				.get() as { count?: number };

			return {
				status: "connected",
				tableCount: typeof row?.count === "number" ? row.count : 0,
			};
		} finally {
			db.close();
		}
	} catch {
		return { status: "error", tableCount: 0 };
	}
}

/**
 * Get list of all SQLite databases in D:\databases
 */
export async function getDatabasesList(): Promise<DatabaseInfo[]> {
	try {
		// Check if D:\databases exists
		try {
			await fs.access(DATABASES_ROOT);
		} catch {
			console.warn("[DatabasesService] D:\\databases directory not found");
			return [];
		}

		const databases: DatabaseInfo[] = [];

		// Read top-level directory
		const entries = await fs.readdir(DATABASES_ROOT, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith(".db")) {
				// Top-level .db file
				const filePath = path.join(DATABASES_ROOT, entry.name);
				const stats = await fs.stat(filePath);

				const summary = tryGetDatabaseSummary(filePath);

				databases.push({
					name: entry.name,
					path: filePath,
					size: stats.size,
					status: summary.status,
					tableCount: summary.tableCount,
					lastModified: stats.mtime.toISOString(),
				});
			} else if (entry.isDirectory()) {
				// Check subdirectories for .db files
				const subdirPath = path.join(DATABASES_ROOT, entry.name);

				try {
					const subentries = await fs.readdir(subdirPath, {
						withFileTypes: true,
					});

					for (const subentry of subentries) {
						if (subentry.isFile() && subentry.name.endsWith(".db")) {
							const filePath = path.join(subdirPath, subentry.name);
							const stats = await fs.stat(filePath);

							const summary = tryGetDatabaseSummary(filePath);

							databases.push({
								name: `${entry.name}/${subentry.name}`,
								path: filePath,
								size: stats.size,
								status: summary.status,
								tableCount: summary.tableCount,
								lastModified: stats.mtime.toISOString(),
							});
						}
					}
				} catch (error) {
					console.warn(
						`[DatabasesService] Failed to read subdirectory ${entry.name}:`,
						error,
					);
				}
			}
		}

		console.log(`[DatabasesService] Found ${databases.length} database(s)`);

		return databases;
	} catch (error) {
		console.error("[DatabasesService] Failed to list databases:", error);
		return [];
	}
}

export async function getDatabaseHealth(dbPath: string): Promise<{
	databaseName: string;
	walMode: boolean;
	walFileSize?: number;
	integrityCheck: boolean;
	locked: boolean;
}> {
	if (!isSafeDatabasePath(dbPath)) {
		throw new Error("Invalid database path");
	}

	let walFileSize: number | undefined;
	try {
		const walStats = await fs.stat(getWalPath(dbPath));
		walFileSize = walStats.size;
	} catch {
		// no WAL file
	}

	try {
		const db = new SqliteDatabase(dbPath, {
			readonly: true,
			fileMustExist: true,
		});
		try {
			const journal = db.prepare("PRAGMA journal_mode").get() as {
				journal_mode?: string;
			};
			const walMode = (journal?.journal_mode || "").toLowerCase() === "wal";

			// quick_check is much cheaper than full integrity_check for large DBs
			const quick = db.prepare("PRAGMA quick_check(1)").get() as {
				quick_check?: string;
			};
			const integrityCheck = (quick?.quick_check || "").toLowerCase() === "ok";

			return {
				databaseName: dbPath,
				walMode,
				walFileSize,
				integrityCheck,
				locked: false,
			};
		} finally {
			db.close();
		}
	} catch (error: any) {
		const message = typeof error?.message === "string" ? error.message : "";
		const locked =
			message.toLowerCase().includes("busy") ||
			message.toLowerCase().includes("locked");

		return {
			databaseName: dbPath,
			walMode: false,
			walFileSize,
			integrityCheck: false,
			locked,
		};
	}
}

/**
 * Get information about a specific database by name
 */
export async function getDatabaseInfo(
	dbName: string,
): Promise<DatabaseInfo | null> {
	try {
		const databases = await getDatabasesList();
		return databases.find((db) => db.name === dbName) || null;
	} catch (error) {
		console.error(
			`[DatabasesService] Failed to get database info for ${dbName}:`,
			error,
		);
		return null;
	}
}
