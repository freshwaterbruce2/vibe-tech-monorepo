import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const assertDatabasePathOnDDrive = (dbPath: string) => {
	const normalized = path.resolve(dbPath);
	if (!/^[dD]:\\/.test(normalized)) {
		throw new Error(`DATABASE_PATH must be on D:\\ (got: ${normalized})`);
	}
};

export const getDatabasePath = () => {
	const dbPath = process.env.DATABASE_PATH || "D:\\databases\\invoiceflow.db";
	assertDatabasePathOnDDrive(dbPath);
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
