// Trading system type definitions for crypto-enhanced project

export interface TradingBalance {
	balance: number;
	timestamp: Date;
}

export type PositionSide = "long" | "short";
export type PositionStatus = "open" | "closed";

export interface Position {
	id: string;
	pair: string;
	side: PositionSide;
	quantity: number;
	entryPrice: number;
	currentPrice: number;
	pnl: number;
	createdAt: Date;
	status: PositionStatus;
}

export type TradeSide = "buy" | "sell";

export interface Trade {
	id: string;
	pair: string;
	side: TradeSide;
	quantity: number;
	price: number;
	executedAt: Date;
	pnl: number;
	fees?: number;
}

export interface PerformanceMetrics {
	winRate: number; // percentage 0-100
	totalTrades: number;
	dailyPnL: number;
	weeklyPnL?: number;
	monthlyPnL?: number;
	maxDrawdown?: number;
	sharpeRatio?: number;
}

export interface TradingSystemHealth {
	apiConnected: boolean;
	webSocketConnected: boolean;
	errorCount: number;
	lastError?: string;
	lastErrorTime?: Date;
}

export type AlertLevel = "critical" | "warning" | "info";

export interface TradingAlert {
	level: AlertLevel;
	message: string;
	timestamp: Date;
}

export interface TradingMetrics {
	balance: number;
	openPositionsCount: number;
	totalPnL: number;
	todayTrades: number;
	todayPnL: number;
	winRate: number;
}

export interface TradingSystemStatus {
	balance: TradingBalance | null;
	positions: Position[];
	recentTrades: Trade[];
	metrics: PerformanceMetrics | null;
	health: TradingSystemHealth;
	alerts: TradingAlert[];
}
