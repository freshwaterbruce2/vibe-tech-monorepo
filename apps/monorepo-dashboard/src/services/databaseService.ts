// Database monitoring service for SQLite databases
import type {
	Database,
	DatabaseHealth,
	DatabaseMetrics,
	DatabaseStatus,
} from "../types";
import { KNOWN_DATABASES as DATABASES } from "../types";

const API_BASE_URL = "http://localhost:5177/api";

interface BackendDatabaseRow {
	name: string;
	path: string;
	size: number;
	status: DatabaseStatus;
	tableCount: number;
	lastModified: string;
}

export const databaseService = {
	/**
	 * Get status of all known databases
	 */
	async getAllDatabases(): Promise<Database[]> {
		const response = await fetch(`${API_BASE_URL}/databases`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const rows = (await response.json()) as BackendDatabaseRow[];
		const byPath = new Map(rows.map((r) => [r.path.toLowerCase(), r]));

		return DATABASES.map((known) => {
			const row = byPath.get(known.path.toLowerCase());
			if (!row) {
				return {
					name: known.name,
					path: known.path,
					size: 0,
					tableCount: 0,
					status: "disconnected",
				};
			}

			return {
				name: known.name,
				path: known.path,
				size: row.size,
				tableCount: row.tableCount,
				status: row.status,
				lastModified: row.lastModified ? new Date(row.lastModified) : undefined,
			};
		});
	},

	/**
	 * Get status of a single database
	 */
	async getDatabaseStatus(
		dbConfig: (typeof DATABASES)[number],
	): Promise<Database> {
		const all = await this.getAllDatabases();
		return (
			all.find((d) => d.path.toLowerCase() === dbConfig.path.toLowerCase()) ?? {
				name: dbConfig.name,
				path: dbConfig.path,
				size: 0,
				tableCount: 0,
				status: "disconnected",
			}
		);
	},

	/**
	 * Get database health metrics
	 */
	async getDatabaseHealth(dbPath: string): Promise<DatabaseHealth> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/databases/health?path=${encodeURIComponent(dbPath)}`,
			);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as {
				databaseName: string;
				walMode: boolean;
				walFileSize?: number;
				integrityCheck: boolean;
				locked: boolean;
			};

			return {
				databaseName: data.databaseName,
				walMode: data.walMode,
				walFileSize: data.walFileSize,
				integrityCheck: data.integrityCheck,
				locked: data.locked,
			};
		} catch (error) {
			console.error(
				`[DatabaseService] getDatabaseHealth ${dbPath} failed:`,
				error,
			);
			return {
				databaseName: dbPath,
				walMode: false,
				integrityCheck: false,
				locked: false,
			};
		}
	},

	/**
	 * Get aggregated database metrics
	 */
	async getDatabaseMetrics(databases: Database[]): Promise<DatabaseMetrics> {
		const connected = databases.filter(
			(db) => db.status === "connected",
		).length;
		const disconnected = databases.filter(
			(db) => db.status === "disconnected",
		).length;
		const totalSize = databases.reduce((sum, db) => sum + db.size, 0);
		const totalTables = databases.reduce((sum, db) => sum + db.tableCount, 0);

		return {
			totalDatabases: databases.length,
			connectedDatabases: connected,
			disconnectedDatabases: disconnected,
			totalSize,
			totalTables,
		};
	},

	/**
	 * Run VACUUM on a database to optimize
	 */
	async vacuumDatabase(dbPath: string): Promise<boolean> {
		console.warn(
			`[DatabaseService] vacuumDatabase ${dbPath} not enabled via backend API`,
		);
		return false;
	},

	/**
	 * Run ANALYZE on a database to update statistics
	 */
	async analyzeDatabase(dbPath: string): Promise<boolean> {
		console.warn(
			`[DatabaseService] analyzeDatabase ${dbPath} not enabled via backend API`,
		);
		return false;
	},
};
