// Trading metrics display component
import { BarChart3, DollarSign, Target, TrendingUp } from "lucide-react";
import type { PerformanceMetrics, Position, TradingBalance } from "../../types";
import { AnimatedCounter } from "../shared/AnimatedCounter";

interface TradingMetricsProps {
	balance: TradingBalance | undefined;
	positions: Position[];
	metrics: PerformanceMetrics | undefined;
}

export function TradingMetrics({
	balance,
	positions,
	metrics,
}: TradingMetricsProps) {
	const openPositionsCount = positions.length;
	const totalPositionValue = positions.reduce(
		(sum, pos) => sum + pos.quantity * pos.currentPrice,
		0,
	);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* Account Balance Card */}
			<MetricCard
				title="Account Balance"
				icon={DollarSign}
				value={balance?.balance ?? 0}
				prefix="$"
				decimals={2}
				color="blue"
				subtitle={
					balance ? `Updated ${formatTimeAgo(balance.timestamp)}` : undefined
				}
			/>

			{/* Open Positions Card */}
			<MetricCard
				title="Open Positions"
				icon={TrendingUp}
				value={openPositionsCount}
				color="purple"
				subtitle={`Total value: $${totalPositionValue.toFixed(2)}`}
			/>

			{/* Win Rate Card */}
			<MetricCard
				title="Win Rate"
				icon={Target}
				value={metrics?.winRate ?? 0}
				suffix="%"
				decimals={1}
				color={metrics && metrics.winRate >= 52 ? "emerald" : "amber"}
				subtitle={`${metrics?.totalTrades ?? 0} trades today`}
			/>

			{/* Daily P&L Card */}
			<MetricCard
				title="Daily P&L"
				icon={BarChart3}
				value={metrics?.dailyPnL ?? 0}
				prefix={metrics && metrics.dailyPnL >= 0 ? "+$" : "$"}
				decimals={2}
				color={metrics && metrics.dailyPnL >= 0 ? "emerald" : "red"}
			/>
		</div>
	);
}

// Metric Card Component
interface MetricCardProps {
	title: string;
	icon: any;
	value: number;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	color: "emerald" | "blue" | "purple" | "amber" | "red";
	subtitle?: string;
}

function MetricCard({
	title,
	icon: Icon,
	value,
	prefix = "",
	suffix = "",
	decimals = 0,
	color,
	subtitle,
}: MetricCardProps) {
	const colorClasses = {
		emerald:
			"from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30",
		blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30",
		purple:
			"from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30",
		amber:
			"from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30",
		red: "from-red-500/20 to-red-600/5 text-red-400 border-red-500/30",
	};

	return (
		<div
			className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}
		>
			<div className="flex items-center justify-between mb-2">
				<p className="text-sm font-medium text-muted-foreground">{title}</p>
				<Icon className="w-5 h-5" />
			</div>
			<p className="text-3xl font-bold mb-1">
				<AnimatedCounter
					value={value}
					prefix={prefix}
					suffix={suffix}
					decimals={decimals}
				/>
			</p>
			{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
		</div>
	);
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return `${seconds}s ago`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}
