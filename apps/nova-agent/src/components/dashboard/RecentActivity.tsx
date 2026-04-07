import {
	Activity,
	Brain,
	CheckCircle,
	Clock,
	MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity as ActivityRecord } from "@/hooks/useNovaData";

interface RecentActivityProps {
	activities: ActivityRecord[];
	formatRelativeTime: (timestamp: number) => string;
}

export const RecentActivity = ({
	activities,
	formatRelativeTime,
}: RecentActivityProps) => {
	const recentActivities = activities.slice(0, 5).map((act) => ({
		type: act.activity_type.includes("chat")
			? "chat"
			: act.activity_type.includes("learn")
				? "learn"
				: act.activity_type.includes("task")
					? "task"
					: "system",
		message: act.details ?? act.activity_type,
		time: formatRelativeTime(act.timestamp),
		icon: act.activity_type.includes("chat") ? (
			<MessageSquare className="w-4 h-4" />
		) : act.activity_type.includes("learn") ? (
			<Brain className="w-4 h-4" />
		) : act.activity_type.includes("task") ? (
			<CheckCircle className="w-4 h-4" />
		) : (
			<Activity className="w-4 h-4" />
		),
	}));

	return (
		<div className="glass-card-2026 p-6">
			<h2 className="text-lg font-semibold mb-4 flex items-center gap-3">
				<div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/20">
					<Clock className="w-4 h-4 text-cyan-400" />
				</div>
				<span className="text-white">Recent Activity</span>
			</h2>

			<div className="space-y-2">
				{recentActivities.length > 0 ? (
					recentActivities.map((activity, index) => (
						<div
							key={index}
							className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-500/[0.05] transition-all duration-200 group cursor-default border border-transparent hover:border-purple-500/20"
						>
							<div
								className={cn(
									"p-2 rounded-xl transition-all duration-200",
									activity.type === "chat" && "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 group-hover:shadow-[0_0_15px_rgba(176,38,255,0.3)]",
									activity.type === "learn" && "bg-pink-500/15 text-pink-400 group-hover:bg-pink-500/25 group-hover:shadow-[0_0_15px_rgba(255,45,149,0.3)]",
									activity.type === "task" && "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]",
									activity.type === "system" && "bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25 group-hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]",
								)}
							>
								{activity.icon}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
									{activity.message}
								</p>
								<p className="text-xs text-white/40 mt-1.5">{activity.time}</p>
							</div>
						</div>
					))
				) : (
					<div className="text-center py-8">
						<Activity className="w-8 h-8 text-white/20 mx-auto mb-3" />
						<p className="text-white/40 text-sm">No recent activity</p>
					</div>
				)}
			</div>
		</div>
	);
};
