// Direct SQLite trading database access service
// Uses better-sqlite3 for D:\databases\crypto-enhanced\trading.db

import Database from "better-sqlite3";
import fs from "fs";


const DB_PATH = "D:\\databases\\crypto-enhanced\\trading.db";

// Check if database exists
const dbExists = fs.existsSync(DB_PATH);

if (!dbExists) {
	console.warn(`[TradingService] Database not found at ${DB_PATH}`);
}

// Initialize database connection (readonly mode for safety)
let db: Database.Database | null = null;

try {
	if (dbExists) {
		db = new Database(DB_PATH, { readonly: true });
		db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better concurrency
		console.log("[TradingService] Connected to trading database");
	}
} catch (error) {
	console.error("[TradingService] Failed to connect to database:", error);
}

interface BalanceRecord {
	balance: number;
	timestamp: string;
}

interface Position {
	id: number;
	symbol: string;
	side: string;
	quantity: number;
	entry_price: number;
	current_price?: number;
	pnl?: number;
	status: string;
	created_at: string;
	updated_at?: string;
}

interface Trade {
	id: number;
	symbol: string;
	side: string;
	quantity: number;
	price: number;
	pnl?: number;
	executed_at: string;
	order_id?: string;
}

interface Metrics {
	total_trades: number;
	wins: number;
	daily_pnl: number;
}

export const tradingService = {
	/**
	 * Get latest balance from balance_history table
	 */
	getBalance(): BalanceRecord | null {
		if (!db) {
			console.warn("[TradingService] Database not available");
			return null;
		}

		try {
			const row = db
				.prepare(
					`
        SELECT balance, timestamp
        FROM balance_history
        ORDER BY timestamp DESC
        LIMIT 1
      `,
				)
				.get() as BalanceRecord | undefined;

			return row || null;
		} catch (error) {
			console.error("[TradingService] Failed to get balance:", error);
			return null;
		}
	},

	/**
	 * Get all open positions
	 */
	getPositions(): Position[] {
		if (!db) {
			console.warn("[TradingService] Database not available");
			return [];
		}

		try {
			const rows = db
				.prepare(
					`
        SELECT * FROM positions
        WHERE status='open'
        ORDER BY created_at DESC
      `,
				)
				.all() as Position[];

			return rows;
		} catch (error) {
			console.error("[TradingService] Failed to get positions:", error);
			return [];
		}
	},

	/**
	 * Get recent trades with optional limit
	 */
	getTrades(limit: number = 10): Trade[] {
		if (!db) {
			console.warn("[TradingService] Database not available");
			return [];
		}

		try {
			const rows = db
				.prepare(
					`
        SELECT * FROM trades
        ORDER BY executed_at DESC
        LIMIT ?
      `,
				)
				.all(limit) as Trade[];

			return rows;
		} catch (error) {
			console.error("[TradingService] Failed to get trades:", error);
			return [];
		}
	},

	/**
	 * Get trading metrics for today
	 */
	getMetrics(): Metrics {
		if (!db) {
			console.warn("[TradingService] Database not available");
			return {
				total_trades: 0,
				wins: 0,
				daily_pnl: 0,
			};
		}

		try {
			const today = new Date().toISOString().split("T")[0];
			const row = db
				.prepare(
					`
        SELECT
          COUNT(*) as total_trades,
          SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
          SUM(pnl) as daily_pnl
        FROM trades
        WHERE DATE(executed_at) = ?
      `,
				)
				.get(today) as Metrics | undefined;

			return (
				row || {
					total_trades: 0,
					wins: 0,
					daily_pnl: 0,
				}
			);
		} catch (error) {
			console.error("[TradingService] Failed to get metrics:", error);
			return {
				total_trades: 0,
				wins: 0,
				daily_pnl: 0,
			};
		}
	},

	/**
	 * Close database connection (call on server shutdown)
	 */
	close(): void {
		if (db) {
			db.close();
			console.log("[TradingService] Database connection closed");
		}
	},
};

// Cleanup on process termination
process.on("exit", () => tradingService.close());
process.on("SIGINT", () => {
	tradingService.close();
	process.exit(0);
});
