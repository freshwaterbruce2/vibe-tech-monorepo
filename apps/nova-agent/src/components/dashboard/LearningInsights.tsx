import { Brain, CheckCircle, Crosshair } from "lucide-react";
import type {
	Activity,
	FocusState,
	LearningEvent,
	TaskStats,
} from "@/hooks/useNovaData";

interface LearningInsightsProps {
	agentStatus: { memory_count: number } | null;
	taskStats: TaskStats;
	activities: Activity[];
	learningEvents: LearningEvent[];
	focusState: FocusState | null;
}

function getTopActivityType(activities: Activity[]): string | null {
	if (!activities.length) return null;
	const counts = new Map<string, number>();
	for (const activity of activities) {
		counts.set(
			activity.activity_type,
			(counts.get(activity.activity_type) ?? 0) + 1,
		);
	}
	let best: { type: string; count: number } | null = null;
	for (const [type, count] of counts.entries()) {
		if (!best || count > best.count) best = { type, count };
	}
	return best?.type ?? null;
}

export const LearningInsights = ({
	agentStatus,
	taskStats,
	activities,
	learningEvents,
	focusState,
}: LearningInsightsProps) => {
	const totalTasks = Object.values(taskStats).reduce(
		(sum, count) => sum + (count ?? 0),
		0,
	);
	const completedTasks = taskStats["completed"] ?? 0;
	const topActivityType = getTopActivityType(activities);
	const focusMinutes =
		focusState && focusState.last_seen >= focusState.focus_started_at
			? Math.floor((focusState.last_seen - focusState.focus_started_at) / 60)
			: null;

	const insights = [
		{
			icon: <Crosshair className="w-4 h-4" />,
			iconBg: "bg-emerald-500/15 text-emerald-400",
			label: "Current Focus",
			value: focusState?.process_name ?? "Not available",
			subtext: focusMinutes !== null
				? `${focusMinutes}m focused`
				: "Waiting for activity monitor",
		},
		{
			icon: <Brain className="w-4 h-4" />,
			iconBg: "bg-pink-500/15 text-pink-400",
			label: "Signals",
			value: topActivityType ? topActivityType : "No activity yet",
			subtext: `${learningEvents.length} learning events${agentStatus ? ` • ${agentStatus.memory_count} memories` : ""}`,
		},
		{
			icon: <CheckCircle className="w-4 h-4" />,
			iconBg: "bg-purple-500/15 text-purple-400",
			label: "Tasks Completed",
			value: completedTasks.toString(),
			subtext: `of ${totalTasks} tasks`,
		},
	];

	return (
		<div className="glass-card-2026 p-6">
			<h2 className="text-lg font-semibold mb-4 flex items-center gap-3">
				<div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/20">
					<Brain className="w-4 h-4 text-pink-400" />
				</div>
				<span className="text-white">Learning Insights</span>
			</h2>

			<div className="space-y-3">
				{insights.map((insight, index) => (
					<div 
						key={index} 
						className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-purple-500/[0.05] hover:border-purple-500/20 transition-all duration-200"
					>
						<div className="flex items-center gap-2 mb-2">
							<div className={`p-1.5 rounded-xl ${insight.iconBg}`}>
								{insight.icon}
							</div>
							<span className="text-sm text-white/50">{insight.label}</span>
						</div>
						<p className="text-base font-semibold text-white mb-1">
							{insight.value}
						</p>
						<p className="text-xs text-white/40">
							{insight.subtext}
						</p>
					</div>
				))}
			</div>
		</div>
	);
};
