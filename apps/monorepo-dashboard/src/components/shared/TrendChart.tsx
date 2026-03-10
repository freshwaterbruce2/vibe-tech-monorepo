// Responsive line chart component using Recharts

import { format } from "date-fns";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export interface TrendDataPoint {
	timestamp: Date | number | string;
	value: number;
}

export interface TrendChartProps {
	data: TrendDataPoint[];
	title: string;
	color?: string;
	yAxisLabel?: string;
	valueFormatter?: (value: number) => string;
	height?: number;
}

export function TrendChart({
	data,
	title,
	color = "#10b981", // emerald-500
	yAxisLabel,
	valueFormatter = (value: number) => value.toFixed(2),
	height = 300,
}: TrendChartProps) {
	// Format data for Recharts
	const chartData = data.map((point) => ({
		timestamp:
			typeof point.timestamp === "string" || typeof point.timestamp === "number"
				? new Date(point.timestamp)
				: point.timestamp,
		value: point.value,
	}));

	// Custom tooltip component
	function CustomTooltip({ active, payload }: any) {
		if (!active || !payload?.length) return null;

		const data = payload[0];
		const timestamp = data.payload.timestamp as Date;
		const value = data.value as number;

		return (
			<div className="bg-background/95 border border-border rounded-lg p-3 shadow-lg">
				<p className="text-xs text-muted-foreground mb-1">
					{format(timestamp, "MMM dd, yyyy HH:mm")}
				</p>
				<p className="text-sm font-semibold" style={{ color }}>
					{yAxisLabel}: {valueFormatter(value)}
				</p>
			</div>
		);
	}

	return (
		<div className="bg-secondary/20 rounded-lg p-6">
			<h3 className="text-lg font-semibold mb-4">{title}</h3>

			<ResponsiveContainer width="100%" height={height}>
				<LineChart
					data={chartData}
					margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

					<XAxis
						dataKey="timestamp"
						tickFormatter={(timestamp: Date) => format(timestamp, "HH:mm")}
						stroke="#9ca3af"
						style={{ fontSize: "12px" }}
					/>

					<YAxis
						label={
							yAxisLabel
								? {
										value: yAxisLabel,
										angle: -90,
										position: "insideLeft",
										style: { fill: "#9ca3af" },
									}
								: undefined
						}
						tickFormatter={valueFormatter}
						stroke="#9ca3af"
						style={{ fontSize: "12px" }}
					/>

					<Tooltip content={<CustomTooltip />} />

					<Line
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 6, fill: color }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
