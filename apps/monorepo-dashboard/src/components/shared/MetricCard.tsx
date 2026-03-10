// Reusable metric card component with trend indicators
import { clsx } from "clsx";
import { type LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

export interface MetricCardProps {
	title: string;
	value: number;
	icon: LucideIcon;
	trend?: "up" | "down" | "stable";
	trendValue?: string;
	variant?: "default" | "success" | "warning" | "danger";
	prefix?: string;
	suffix?: string;
	decimals?: number;
	subtitle?: string;
	glow?: boolean;
}

export function MetricCard({
	title,
	value,
	icon: Icon,
	trend,
	trendValue,
	variant = "default",
	prefix = "",
	suffix = "",
	decimals = 0,
	subtitle,
	glow = false,
}: MetricCardProps) {
	// Map variant to color classes
	const variantClasses = {
		default: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30",
		success:
			"from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30",
		warning:
			"from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30",
		danger: "from-red-500/20 to-red-600/5 text-red-400 border-red-500/30",
	};

	// Trend icon component
	const TrendIcon =
		trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

	// Trend color classes
	const trendColorClasses = {
		up: "text-emerald-400",
		down: "text-red-400",
		stable: "text-gray-400",
	};

	return (
		<div
			className={clsx(
				"bg-gradient-to-br border rounded-lg p-6 transition-all duration-200",
				variantClasses[variant],
				glow && "ring-2 ring-emerald-500/30",
				"hover:shadow-lg hover:scale-[1.02]",
			)}
		>
			{/* Header with title and icon */}
			<div className="flex items-center justify-between mb-3">
				<p className="text-sm font-medium text-muted-foreground">{title}</p>
				<Icon className="w-5 h-5" />
			</div>

			{/* Main metric value */}
			<div className="flex items-baseline justify-between mb-2">
				<p className="text-3xl font-bold">
					<AnimatedCounter
						value={value}
						prefix={prefix}
						suffix={suffix}
						decimals={decimals}
					/>
				</p>

				{/* Trend indicator */}
				{trend && trendValue && (
					<div
						className={clsx(
							"flex items-center gap-1 text-sm font-medium",
							trendColorClasses[trend],
						)}
					>
						<TrendIcon className="w-4 h-4" />
						<span>{trendValue}</span>
					</div>
				)}
			</div>

			{/* Subtitle */}
			{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
		</div>
	);
}
