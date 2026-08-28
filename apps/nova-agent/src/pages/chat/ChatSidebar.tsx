import { Cpu, Sparkles, Zap } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AgentService, type PendingTask } from "@/services/AgentService";
import type { AgentState } from "@/types/agent";

interface ChatSidebarProps {
	agentState: AgentState | null;
	pendingTasks: PendingTask[];
	onTasksChange: (tasks: PendingTask[]) => void;
}

export function ChatSidebar({ agentState, pendingTasks, onTasksChange }: ChatSidebarProps) {
	const handleApproveTask = async (taskId: string) => {
		try {
			await AgentService.approveTask(taskId);
			onTasksChange(pendingTasks.filter((t) => t.id !== taskId));
			toast({ title: "Task approved", description: "The task has been approved successfully." });
		} catch (err) {
			console.error("Failed to approve task:", err);
			toast({ title: "Failed to approve task", description: String(err), variant: "destructive" });
		}
	};

	const handleRejectTask = async (taskId: string) => {
		try {
			await AgentService.rejectTask(taskId);
			onTasksChange(pendingTasks.filter((t) => t.id !== taskId));
			toast({ title: "Task rejected", description: "The task has been rejected." });
		} catch (err) {
			console.error("Failed to reject task:", err);
			toast({ title: "Failed to reject task", description: String(err), variant: "destructive" });
		}
	};

	return (
		<div className="hidden lg:flex w-80 flex-col gap-4">
			<Card className="p-4 bg-black/40 backdrop-blur-xl border-white/10 text-white">
				<h3 className="font-bold mb-4 flex items-center gap-2">
					<Cpu className="w-4 h-4 text-purple-400" />
					System Status
				</h3>
				<div className="space-y-4">
					<div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-white/60">Memory Usage</span>
							<span className="text-cyan-400">{agentState?.memory_count ?? 0} items</span>
						</div>
						<div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
							<div className="h-full bg-cyan-500 w-[45%]" />
						</div>
					</div>
					<div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-white/60">Active Contexts</span>
							<span className="text-purple-400">{agentState?.active_conversations?.length ?? 0}</span>
						</div>
						<div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
							<div className="h-full bg-purple-500 w-[70%]" />
						</div>
					</div>
				</div>
			</Card>

			<Card className="p-4 bg-black/40 backdrop-blur-xl border-white/10 text-white flex-1">
				<h3 className="font-bold mb-4 flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-yellow-400" />
					Capabilities
				</h3>
				<div className="flex flex-wrap gap-2">
					{agentState?.capabilities?.map((cap, i) => (
						<span key={i} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/80">
							{cap}
						</span>
					)) ?? (
						<span className="text-sm text-white/40 italic">Loading capabilities…</span>
					)}
				</div>
			</Card>

			{pendingTasks.length > 0 && (
				<Card className="p-4 bg-black/40 backdrop-blur-xl border-amber-500/20 text-white">
					<h3 className="font-bold mb-3 flex items-center gap-2 text-amber-400">
						<Zap className="w-4 h-4" />
						Awaiting Approval ({pendingTasks.length})
					</h3>
					<div className="space-y-2">
						{pendingTasks.map((task) => (
							<div key={task.id} className="text-xs bg-white/5 rounded-lg p-3 space-y-2">
								<p className="text-white/80 truncate">{task.title}</p>
								<div className="flex gap-2">
									<Button size="sm" onClick={() => void handleApproveTask(task.id)}
										className="h-6 text-xs bg-green-600 hover:bg-green-700 flex-1">Approve</Button>
									<Button size="sm" variant="ghost" onClick={() => void handleRejectTask(task.id)}
										className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-1">Reject</Button>
								</div>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}
