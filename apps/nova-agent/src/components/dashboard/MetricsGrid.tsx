import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SystemMetric {
	label: string;
	value: string | number;
	change?: number;
	icon: React.ReactNode;
	status?: "good" | "warning" | "error";
}

interface MetricsGridProps {
	metrics: SystemMetric[];
	itemVariants: Variants;
}

export const MetricsGrid = ({ metrics, itemVariants }: MetricsGridProps) => {
	return (
		<motion.div
			variants={itemVariants}
			className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
		>
			{metrics.map((metric, index) => (
				<motion.div
					key={index}
					className="glass-card p-5 rounded-2xl group cursor-default"
					whileHover={{ y: -4, transition: { duration: 0.2 } }}
				>
					<div className="flex items-start justify-between mb-4">
						<div
							className={cn(
								"p-3 rounded-xl transition-all duration-300",
								metric.status === "good" && "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_hsl(250_85%_70%_/_0.2)]",
								metric.status === "warning" && "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:shadow-[0_0_20px_hsl(45_90%_55%_/_0.2)]",
								metric.status === "error" && "bg-destructive/10 text-destructive group-hover:bg-destructive/20 group-hover:shadow-[0_0_20px_hsl(0_70%_55%_/_0.2)]",
								!metric.status && "bg-muted text-muted-foreground",
							)}
						>
							{metric.icon}
						</div>
						{metric.change && (
							<Badge
								variant="secondary"
								className={cn(
									"text-xs border-0 font-medium",
									metric.change > 0 
										? "bg-emerald-500/10 text-emerald-400" 
										: "bg-destructive/10 text-destructive",
								)}
							>
								{metric.change > 0 ? '+' : ''}{metric.change}%
							</Badge>
						)}
					</div>
					<div className="text-3xl font-bold mb-1 text-foreground">{metric.value}</div>
					<div className="text-sm text-muted-foreground">{metric.label}</div>
				</motion.div>
			))}
		</motion.div>
	);
};
