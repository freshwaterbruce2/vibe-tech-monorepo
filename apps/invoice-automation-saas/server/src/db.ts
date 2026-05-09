import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const assertDatabasePathSafe = (dbPath: string) => {
	const normalized = path.resolve(dbPath);
	// Allow D:\ drive (Windows local policy) or /data/ (Docker)
	const isDDrive = /^[dD]:\\/.test(normalized);
	const isDockerData = dbPath.startsWith('/data/') || normalized.startsWith('/data/');
	if (!isDDrive && !isDockerData) {
		throw new Error(
			`DATABASE_PATH must be on D:\\ or /data/ (got: ${normalized}). ` +
			`Use /data/invoiceflow.db for Docker deployments.`,
		);
	}
};

export const getDatabasePath = () => {
	const dbPath = process.env.DATABASE_PATH || "D:\\databases\\invoiceflow.db";
	assertDatabasePathSafe(dbPath);
	return dbPath;
};

export const openDb = (): Database.Database => {
	const dbPath = getDatabasePath();
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	const db = new Database(dbPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	return db;
};
