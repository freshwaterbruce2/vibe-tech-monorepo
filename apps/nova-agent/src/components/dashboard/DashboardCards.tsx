import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface MetricCardProps {
	title: string;
	value: string | number;
	change: number;
	icon: React.ReactNode;
	trend: "up" | "down";
	suffix?: string;
}

export const MetricCard = ({
	title,
	value,
	change,
	icon,
	trend,
	suffix = "",
}: MetricCardProps) => {
	const isPositive = trend === "up";

	return (
		<Card className="relative overflow-hidden group hover:shadow-neon-blue transition-all duration-300 border-aura-accent/30 bg-gradient-to-br from-aura-darkBg/90 via-aura-darkBgLight/80 to-aura-darkBg/90 backdrop-blur-xl">
			{/* Animated border glow */}
			<div
				className="absolute inset-0 bg-gradient-to-r from-aura-neonBlue/20 via-aura-neonPurple/20 to-aura-neonPink/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-shift"
				style={{ backgroundSize: "200% 200%" }}
			/>

			<div className="relative p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="p-3 rounded-lg bg-gradient-to-br from-aura-neonBlue/20 to-aura-neonPurple/20 border border-aura-neonBlue/30 group-hover:shadow-neon-blue transition-all duration-300">
						<div className="text-aura-neonBlue group-hover:animate-pulse">
							{icon}
						</div>
					</div>

					<Badge
						variant="outline"
						className={`${
							isPositive
								? "bg-aura-neonGreen/10 border-aura-neonGreen/50 text-aura-neonGreen"
								: "bg-red-500/10 border-red-500/50 text-red-400"
						} backdrop-blur-sm`}
					>
						{isPositive ? (
							<ArrowUpRight className="w-3 h-3 mr-1" />
						) : (
							<ArrowDownRight className="w-3 h-3 mr-1" />
						)}
						{Math.abs(change)}%
					</Badge>
				</div>

				<div className="space-y-1">
					<h3 className="text-sm font-medium text-aura-textSecondary">
						{title}
					</h3>
					<p className="text-3xl font-bold text-white tracking-tight">
						{value}
						{suffix && (
							<span className="text-xl text-aura-textSecondary ml-1">
								{suffix}
							</span>
						)}
					</p>
				</div>

				<div className="mt-4 h-12 flex items-end gap-1">
					{[40, 60, 45, 70, 55, 85, 75, 90, 80, 95].map((height, i) => (
						<div
							key={i}
							className="flex-1 bg-gradient-to-t from-aura-neonBlue/30 to-aura-neonPurple/30 rounded-t transition-all duration-300 group-hover:from-aura-neonBlue/50 group-hover:to-aura-neonPurple/50"
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
			</div>
		</Card>
	);
};

export interface ActivityItemProps {
	type: "user" | "system" | "alert" | "success";
	message: string;
	time: string;
	icon: React.ReactNode;
}

export const ActivityItem = ({ type, message, time, icon }: ActivityItemProps) => {
	const typeColors = {
		user: "from-aura-neonBlue/20 to-aura-neonBlue/10 border-aura-neonBlue/30",
		system:
			"from-aura-neonPurple/20 to-aura-neonPurple/10 border-aura-neonPurple/30",
		alert:
			"from-aura-neonOrange/20 to-aura-neonOrange/10 border-aura-neonOrange/30",
		success:
			"from-aura-neonGreen/20 to-aura-neonGreen/10 border-aura-neonGreen/30",
	};

	return (
		<div className="flex items-start gap-4 p-4 rounded-lg bg-aura-darkBgLight/50 border border-aura-accent/20 hover:border-aura-accent/40 transition-all duration-300 group cursor-pointer">
			<div
				className={`p-2 rounded-lg bg-gradient-to-br ${typeColors[type]} border group-hover:shadow-neon transition-all duration-300`}
			>
				<div className="text-white w-5 h-5">{icon}</div>
			</div>

			<div className="flex-1 min-w-0">
				<p className="text-sm text-white group-hover:text-aura-neonBlue transition-colors duration-300">
					{message}
				</p>
				<p className="text-xs text-aura-textSecondary mt-1">{time}</p>
			</div>

			<ChevronRight className="w-5 h-5 text-aura-textSecondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
		</div>
	);
};
