// Trading dashboard tab with live crypto system monitoring
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useTradingSystem } from "../../hooks/useTradingSystem";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { StatusBadge } from "../shared/StatusBadge";
import { TradesTable } from "./TradesTable";
import { TradingAlerts } from "./TradingAlerts";
import { TradingMetrics } from "./TradingMetrics";

export function TradingTab() {
	const { status, totalPnL, isLoading, error, refetch } = useTradingSystem();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading trading system data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Trading Data
				</h2>
				<p className="text-red-300 mb-4">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
				<button
					onClick={() => refetch()}
					className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	const isPositive = totalPnL >= 0;

	return (
		<div className="space-y-6">
			{/* Header with System Status */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2">Crypto Trading System</h1>
					<p className="text-muted-foreground">
						Real-time monitoring of crypto-enhanced trading bot
					</p>
				</div>
				<div className="flex items-center gap-4">
					<StatusBadge
						status={status.health.apiConnected ? "running" : "stopped"}
					/>
					<StatusBadge
						status={
							status.health.webSocketConnected ? "connected" : "disconnected"
						}
					/>
					<button
						onClick={() => refetch()}
						className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>

			{/* Alerts Banner */}
			{status.alerts && status.alerts.length > 0 && (
				<TradingAlerts alerts={status.alerts} />
			)}

			{/* Total P&L Card */}
			<div
				className={`p-6 rounded-lg border-2 ${
					isPositive
						? "bg-emerald-500/10 border-emerald-500/30"
						: "bg-red-500/10 border-red-500/30"
				}`}
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground mb-1">
							Total P&L
						</p>
						<p
							className={`text-3xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}
						>
							{isPositive ? "+" : ""}
							{totalPnL.toFixed(2)} USD
						</p>
					</div>
					<div
						className={`p-4 rounded-full ${isPositive ? "bg-emerald-500/20" : "bg-red-500/20"}`}
					>
						{isPositive ? (
							<TrendingUp className="w-8 h-8 text-emerald-400" />
						) : (
							<TrendingDown className="w-8 h-8 text-red-400" />
						)}
					</div>
				</div>
			</div>

			{/* Trading Metrics Grid */}
			<TradingMetrics
				balance={status.balance ?? undefined}
				positions={status.positions}
				metrics={status.metrics ?? undefined}
			/>

			{/* Recent Trades Table */}
			<div className="bg-secondary/20 rounded-lg p-6">
				<h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
				<TradesTable trades={status.recentTrades} />
			</div>

			{/* System Health Panel */}
			<div className="bg-secondary/20 rounded-lg p-6">
				<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
					<Activity className="w-5 h-5" />
					System Health
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
						<span className="text-sm text-muted-foreground">
							API Connection
						</span>
						<StatusBadge
							status={status.health.apiConnected ? "healthy" : "critical"}
							size="sm"
						/>
					</div>
					<div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
						<span className="text-sm text-muted-foreground">WebSocket</span>
						<StatusBadge
							status={
								status.health.webSocketConnected ? "connected" : "disconnected"
							}
							size="sm"
						/>
					</div>
					<div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
						<span className="text-sm text-muted-foreground">
							Error Count (1h)
						</span>
						<span
							className={`font-bold ${status.health.errorCount > 5 ? "text-red-400" : "text-emerald-400"}`}
						>
							{status.health.errorCount}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
