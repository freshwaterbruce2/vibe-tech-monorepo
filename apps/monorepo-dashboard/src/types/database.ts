// Database type definitions for SQLite monitoring

export type DatabaseStatus = "connected" | "disconnected" | "error";

export interface Database {
	name: string;
	path: string;
	size: number; // in bytes
	tableCount: number;
	status: DatabaseStatus;
	lastModified?: Date;
}

export interface DatabaseTable {
	name: string;
	rowCount: number;
	columns: DatabaseColumn[];
}

export interface DatabaseColumn {
	name: string;
	type: string;
	notNull: boolean;
	primaryKey: boolean;
}

export interface DatabaseHealth {
	databaseName: string;
	walMode: boolean;
	walFileSize?: number;
	integrityCheck: boolean;
	locked: boolean;
	lastVacuum?: Date;
}

export interface DatabaseMetrics {
	totalDatabases: number;
	connectedDatabases: number;
	disconnectedDatabases: number;
	totalSize: number; // in bytes
	totalTables: number;
}

export interface DatabaseQuery {
	database: string;
	query: string;
	executionTime: number;
	rowsAffected: number;
	timestamp: Date;
}

export interface DatabaseConnection {
	database: string;
	connected: boolean;
	error?: string;
}

// Known databases in the monorepo
export const KNOWN_DATABASES: Readonly<Pick<Database, "name" | "path">[]> = [
	{
		name: "trading.db",
		path: "D:\\databases\\crypto-enhanced\\trading.db",
	},
	{
		name: "database.db",
		path: "D:\\databases\\database.db",
	},
	{
		name: "vibe-tutor.db",
		path: "D:\\databases\\vibe-tutor.db",
	},
	{
		name: "nova-agent.db",
		path: "D:\\databases\\nova-agent.db",
	},
	{
		name: "memory-bank.db",
		path: "D:\\databases\\memory-bank.db",
	},
] as const;
