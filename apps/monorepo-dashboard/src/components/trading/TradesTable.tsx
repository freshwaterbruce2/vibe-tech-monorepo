// Recent trades table component
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Trade } from "../../types";

interface TradesTableProps {
	trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
	if (trades.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>No recent trades</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border">
						<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
							Time
						</th>
						<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
							Pair
						</th>
						<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
							Side
						</th>
						<th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
							Quantity
						</th>
						<th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
							Price
						</th>
						<th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
							P&L
						</th>
					</tr>
				</thead>
				<tbody>
					{trades.map((trade) => {
						const isProfit = trade.pnl >= 0;
						const isBuy = trade.side === "buy";

						return (
							<tr
								key={trade.id}
								className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
							>
								{/* Timestamp */}
								<td className="py-3 px-4 text-sm">
									{formatTime(trade.executedAt)}
								</td>

								{/* Trading Pair */}
								<td className="py-3 px-4">
									<span className="font-mono text-sm font-medium">
										{trade.pair}
									</span>
								</td>

								{/* Side (Buy/Sell) */}
								<td className="py-3 px-4">
									<span
										className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
											isBuy
												? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
												: "bg-red-500/20 text-red-400 border border-red-500/30"
										}`}
									>
										{isBuy ? (
											<ArrowUpRight className="w-3 h-3" />
										) : (
											<ArrowDownRight className="w-3 h-3" />
										)}
										{trade.side.toUpperCase()}
									</span>
								</td>

								{/* Quantity */}
								<td className="py-3 px-4 text-right text-sm font-mono">
									{trade.quantity.toFixed(8)}
								</td>

								{/* Price */}
								<td className="py-3 px-4 text-right text-sm font-mono">
									${trade.price.toFixed(4)}
								</td>

								{/* P&L */}
								<td className="py-3 px-4 text-right">
									<span
										className={`font-mono text-sm font-medium ${isProfit ? "text-emerald-400" : "text-red-400"}`}
									>
										{isProfit ? "+" : ""}${trade.pnl.toFixed(2)}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{/* Summary Row */}
			<div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
				<span className="text-muted-foreground">
					Showing {trades.length} trade{trades.length !== 1 ? "s" : ""}
				</span>
				<span className="font-medium">
					Total P&L:{" "}
					<span
						className={
							trades.reduce((sum, t) => sum + t.pnl, 0) >= 0
								? "text-emerald-400"
								: "text-red-400"
						}
					>
						{trades.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? "+" : ""}$
						{trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
					</span>
				</span>
			</div>
		</div>
	);
}

// Helper function to format time
function formatTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

	// Format as HH:MM if today
	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear();

	if (isToday) {
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Format as MM/DD if this year
	const isThisYear = date.getFullYear() === now.getFullYear();
	if (isThisYear) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	// Full date for older trades
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
