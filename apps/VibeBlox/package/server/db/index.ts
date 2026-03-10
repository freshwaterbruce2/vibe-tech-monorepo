import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path (D:\ drive as per path policy)
// NOTE: We intentionally do NOT default to the generic DATABASE_PATH because other
// apps in this monorepo may set it globally (e.g. D:\databases\database.db).
const DEFAULT_DB_PATH = "D:\\data\\vibeblox\\vibeblox.db";

const envVibeBloxDbPath = process.env.VIBEBLOX_DATABASE_PATH;
const envGlobalDbPath = process.env.DATABASE_PATH;

const DB_PATH =
	envVibeBloxDbPath ||
	(envGlobalDbPath && envGlobalDbPath.toLowerCase().includes("vibeblox")
		? envGlobalDbPath
		: DEFAULT_DB_PATH);

export const dbPath = DB_PATH;

// Ensure directory exists (SQLite file is created on open, but directories are not)
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH, { verbose: console.log });

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

// Initialize database schema
export function initializeDatabase() {
	const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");

	// Execute schema
	db.exec(schema);

	console.log("✅ Database initialized successfully");
	console.log(`📁 Database location: ${DB_PATH}`);
}

// Run initialization if this file is executed directly
// (tsx/node/Windows path formats vary, so we use a resilient heuristic)
const invoked = (process.argv[1] || "").replace(/\\/g, "/");
if (
	invoked.endsWith("/server/db/index.ts") ||
	invoked.endsWith("/server/db/index.js")
) {
	try {
		initializeDatabase();
		console.log("🎉 Database setup complete!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Database initialization failed:", error);
		process.exit(1);
	}
}
