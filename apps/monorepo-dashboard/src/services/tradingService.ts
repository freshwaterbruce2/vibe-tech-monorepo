// Crypto trading system data fetching service

import type {
	PerformanceMetrics,
	Position,
	Trade,
	TradingAlert,
	TradingBalance,
	TradingSystemHealth,
} from "../types";
import { mcpClient } from "./mcpClient";

const TRADING_DB_PATH = "D:\\databases\\crypto-enhanced\\trading.db";

export const tradingService = {
	/**
	 * Get current account balance
	 */
	async getBalance(): Promise<TradingBalance> {
		try {
			const rows = await mcpClient.callSQLite(
				`SELECT balance, timestamp
         FROM balance_history
         ORDER BY timestamp DESC
         LIMIT 1`,
				TRADING_DB_PATH,
			);

			if (!rows.length) {
				throw new Error("No balance data found");
			}

			return {
				balance: parseFloat(rows[0].balance),
				timestamp: new Date(rows[0].timestamp),
			};
		} catch (error) {
			console.error("[TradingService] getBalance failed:", error);
			throw error;
		}
	},

	/**
	 * Get all open positions
	 */
	async getOpenPositions(): Promise<Position[]> {
		try {
			const rows = await mcpClient.callSQLite(
				`SELECT * FROM positions
         WHERE status = 'open'
         ORDER BY created_at DESC`,
				TRADING_DB_PATH,
			);

			return rows.map((row) => ({
				id: row.id,
				pair: row.pair,
				side: row.side,
				quantity: parseFloat(row.quantity),
				entryPrice: parseFloat(row.entry_price),
				currentPrice: parseFloat(row.current_price),
				pnl: parseFloat(row.pnl ?? 0),
				createdAt: new Date(row.created_at),
				status: row.status,
			}));
		} catch (error) {
			console.error("[TradingService] getOpenPositions failed:", error);
			return [];
		}
	},

	/**
	 * Get recent trades (last N trades)
	 */
	async getRecentTrades(limit: number = 5): Promise<Trade[]> {
		try {
			const rows = await mcpClient.callSQLite(
				`SELECT * FROM trades
         ORDER BY executed_at DESC
         LIMIT ${limit}`,
				TRADING_DB_PATH,
			);

			return rows.map((row) => ({
				id: row.id,
				pair: row.pair,
				side: row.side,
				quantity: parseFloat(row.quantity),
				price: parseFloat(row.price),
				executedAt: new Date(row.executed_at),
				pnl: parseFloat(row.pnl ?? 0),
				fees: row.fees ? parseFloat(row.fees) : undefined,
			}));
		} catch (error) {
			console.error("[TradingService] getRecentTrades failed:", error);
			return [];
		}
	},

	/**
	 * Get performance metrics (win rate, P&L, etc.)
	 */
	async getPerformanceMetrics(): Promise<PerformanceMetrics> {
		try {
			const today = new Date().toISOString().split("T")[0];

			const rows = await mcpClient.callSQLite(
				`SELECT
           COUNT(*) as total_trades,
           SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
           SUM(pnl) as daily_pnl
         FROM trades
         WHERE DATE(executed_at) = '${today}'`,
				TRADING_DB_PATH,
			);

			const data = rows[0];
			const totalTrades = parseInt(data.total_trades);
			const wins = parseInt(data.wins);

			return {
				winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
				totalTrades,
				dailyPnL: parseFloat(data.daily_pnl ?? 0),
			};
		} catch (error) {
			console.error("[TradingService] getPerformanceMetrics failed:", error);
			return {
				winRate: 0,
				totalTrades: 0,
				dailyPnL: 0,
			};
		}
	},

	/**
	 * Get trading system health status
	 */
	async getSystemHealth(): Promise<TradingSystemHealth> {
		try {
			// Check for recent errors in logs (would need log parsing)
			// For now, return placeholder health check
			return {
				apiConnected: true, // Would check via API ping
				webSocketConnected: true, // Would check WebSocket status
				errorCount: 0,
			};
		} catch (error) {
			console.error("[TradingService] getSystemHealth failed:", error);
			return {
				apiConnected: false,
				webSocketConnected: false,
				errorCount: 0,
			};
		}
	},

	/**
	 * Generate critical alerts based on trading data
	 */
	generateAlerts(
		balance: TradingBalance | null,
		positions: Position[],
		metrics: PerformanceMetrics | null,
	): TradingAlert[] {
		const alerts: TradingAlert[] = [];

		// Critical: Low balance
		if (balance && balance.balance < 100) {
			alerts.push({
				level: "critical",
				message: `Account balance below $100: $${balance.balance.toFixed(2)}`,
				timestamp: new Date(),
			});
		}

		// Warning: Negative total P&L
		const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
		if (totalPnL < -10) {
			alerts.push({
				level: "warning",
				message: `Total P&L: -$${Math.abs(totalPnL).toFixed(2)}`,
				timestamp: new Date(),
			});
		}

		// Info: Daily P&L status
		if (metrics && metrics.dailyPnL !== 0) {
			alerts.push({
				level: "info",
				message: `Daily P&L: ${metrics.dailyPnL > 0 ? "+" : ""}$${metrics.dailyPnL.toFixed(2)}`,
				timestamp: new Date(),
			});
		}

		return alerts;
	},
};
