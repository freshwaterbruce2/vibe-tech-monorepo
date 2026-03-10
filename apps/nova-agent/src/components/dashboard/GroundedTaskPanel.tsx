import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import {
	formatRelativeTime,
	getTaskGroundingState,
	parseTaskMetadata,
	type Task,
} from "@/hooks/useNovaData";

interface GroundedTaskPanelProps {
	tasks: Task[];
	variant?: "default" | "compact";
}

const badgeClassByState: Record<string, string> = {
	grounded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
	blocked_review: "bg-red-500/10 text-red-400 border-red-500/20",
	awaiting_approval: "bg-amber-500/10 text-amber-400 border-amber-500/20",
	ungrounded: "bg-orange-500/10 text-orange-400 border-orange-500/20",
	unknown: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

export function GroundedTaskPanel({
	tasks,
	variant = "default",
}: GroundedTaskPanelProps) {
	const counts = tasks.reduce(
		(acc, task) => {
			const state = getTaskGroundingState(task).label;
			acc[state] = (acc[state] ?? 0) + 1;
			return acc;
		},
		{
			grounded: 0,
			blocked_review: 0,
			awaiting_approval: 0,
			ungrounded: 0,
			unknown: 0,
		},
	);

	const visibleTasks = tasks.slice(0, variant === "compact" ? 4 : 6);

	return (
		<div className="glass-card p-6 rounded-2xl space-y-5">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="text-lg font-semibold text-foreground">Grounded Task Status</h3>
					<p className="text-sm text-muted-foreground">
						Task execution now depends on a real repo review artifact.
					</p>
				</div>
				<div className="p-2 rounded-xl bg-primary/10">
					<ShieldAlert className="w-5 h-5 text-primary" />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
					<div className="flex items-center gap-2 text-emerald-400">
						<CheckCircle2 className="w-4 h-4" />
						<span className="text-xs uppercase tracking-wide">Grounded</span>
					</div>
					<div className="mt-2 text-2xl font-semibold text-foreground">{counts.grounded}</div>
				</div>
				<div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
					<div className="flex items-center gap-2 text-red-400">
						<ShieldAlert className="w-4 h-4" />
						<span className="text-xs uppercase tracking-wide">Blocked</span>
					</div>
					<div className="mt-2 text-2xl font-semibold text-foreground">{counts.blocked_review}</div>
				</div>
				<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
					<div className="flex items-center gap-2 text-amber-400">
						<Clock3 className="w-4 h-4" />
						<span className="text-xs uppercase tracking-wide">Approval</span>
					</div>
					<div className="mt-2 text-2xl font-semibold text-foreground">{counts.awaiting_approval}</div>
				</div>
				<div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
					<div className="flex items-center gap-2 text-orange-400">
						<AlertTriangle className="w-4 h-4" />
						<span className="text-xs uppercase tracking-wide">Ungrounded</span>
					</div>
					<div className="mt-2 text-2xl font-semibold text-foreground">{counts.ungrounded + counts.unknown}</div>
				</div>
			</div>

			<div className="space-y-3">
				{visibleTasks.length === 0 ? (
					<div className="rounded-xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
						No tasks available yet.
					</div>
				) : (
					visibleTasks.map((task) => {
						const grounding = getTaskGroundingState(task);
						const metadata = parseTaskMetadata(task.metadata);
						const projectPath = metadata?.project_path ?? "No project path";

						return (
							<div
								key={task.id}
								className="rounded-xl border border-border/60 bg-background/30 p-4"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="font-medium text-foreground truncate">{task.title}</p>
										<p className="text-xs text-muted-foreground mt-1 break-all">{projectPath}</p>
									</div>
									<span
										className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${badgeClassByState[grounding.label]}`}
									>
										{grounding.label.replace("_", " ")}
									</span>
								</div>
								<p className="mt-3 text-sm text-muted-foreground">{grounding.detail}</p>
								<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
									<span>Status: {task.status}</span>
									<span>{formatRelativeTime(task.updated_at)}</span>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
