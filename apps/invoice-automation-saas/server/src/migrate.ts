import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export const migrate = (db: Database) => {
	const schemaPath = path.resolve(process.cwd(), "server", "src", "schema.sql");
	const sql = fs.readFileSync(schemaPath, "utf-8");
	db.exec(sql);
};
