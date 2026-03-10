import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = "D:\\databases\\invoiceflow_debug.db";
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const schemaPath = path.resolve(process.cwd(), "server", "src", "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf-8");

console.log("Executing SQL...");
try {
	db.exec(sql);
	console.log("Success!");
} catch (err) {
	console.error("Error executing SQL:");
	console.error(err);
}
