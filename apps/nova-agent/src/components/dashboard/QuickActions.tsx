import {
	AlertCircle,
	ArrowRight,
	FileText,
	GitBranch,
	MessageSquare,
	PlusCircle,
	RefreshCw,
	Sparkles,
	TrendingUp,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentStatus, SystemContext } from "@/hooks/useNovaData";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface ProjectState {
	current_phase: string;
	next_steps: string[];
	blockers: string[];
	decisions: string[];
	last_updated: string;
}

interface QuickActionsProps {
	handleQuickAction: (action: string) => void;
	refresh: () => void;
	context: SystemContext | null;
	agentStatus: AgentStatus | null;
	projectState: ProjectState | null;
	handleNextStep: (step: string) => void;
}

export const QuickActions = ({
	handleQuickAction,
	refresh,
	context,
	agentStatus,
	projectState,
	handleNextStep,
}: QuickActionsProps) => {
	return (
		<div className="glass-2026 p-6 h-full">
			<h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
				<div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20">
					<Sparkles className="w-5 h-5 text-purple-400" />
				</div>
				<span className="text-neon-gradient">Quick Actions</span>
			</h2>

			<div className="grid grid-cols-2 gap-4 mb-8">
				<CreateTaskDialog
					onTaskCreated={refresh}
					defaultProjectPath={context?.current_project?.path}
					trigger={
						<Button 
							className="justify-start h-auto py-5 px-5 rounded-2xl bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/25 hover:border-purple-500/50 hover:from-purple-500/25 hover:to-pink-500/15 text-white transition-all duration-300 group hover:shadow-[0_0_30px_rgba(176,38,255,0.3)]"
						>
							<PlusCircle className="w-5 h-5 mr-3 text-purple-400 group-hover:scale-110 transition-transform" />
							Add Task
						</Button>
					}
				/>

				<Button
					className="justify-start h-auto py-5 px-5 rounded-2xl bg-gradient-to-r from-pink-500/15 to-purple-500/10 border border-pink-500/25 hover:border-pink-500/50 hover:from-pink-500/25 hover:to-purple-500/15 text-white transition-all duration-300 group hover:shadow-[0_0_30px_rgba(255,45,149,0.3)]"
					onClick={() => handleQuickAction("chat")}
				>
					<MessageSquare className="w-5 h-5 mr-3 text-pink-400 group-hover:scale-110 transition-transform" />
					Start AI Chat
				</Button>

				<Button
					className="justify-start h-auto py-5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500/15 to-purple-500/10 border border-cyan-500/25 hover:border-cyan-500/50 hover:from-cyan-500/25 hover:to-purple-500/15 text-white transition-all duration-300 group hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]"
					onClick={() => handleQuickAction("guide")}
				>
					<Zap className="w-5 h-5 mr-3 text-cyan-400 group-hover:scale-110 transition-transform" />
					Context Guide
				</Button>

				<Button
					className="justify-start h-auto py-5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 border border-emerald-500/25 hover:border-emerald-500/50 hover:from-emerald-500/25 hover:to-cyan-500/15 text-white transition-all duration-300 group hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
					onClick={() => handleQuickAction("doc-analysis")}
				>
					<FileText className="w-5 h-5 mr-3 text-emerald-400 group-hover:scale-110 transition-transform" />
					Doc Analysis
				</Button>

				<Button
					className="justify-start h-auto py-4 px-5 rounded-2xl col-span-2 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-purple-500/30 text-white/60 hover:text-white transition-all duration-300 group hover:shadow-[0_0_20px_rgba(176,38,255,0.2)]"
					onClick={refresh}
				>
					<RefreshCw className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-500" />
					Refresh Data
				</Button>
			</div>

			<div className="space-y-4">
				{/* Project State / Next Steps */}
				{projectState && (
					<div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
						<div className="flex items-center justify-between mb-4">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-primary/60" />
								Project Awareness
							</span>
							<Badge
								className="capitalize badge-neon"
							>
								{projectState.current_phase}
							</Badge>
						</div>
						<h3 className="font-semibold mb-3 text-foreground">Next Steps</h3>
						<div className="space-y-2">
							{projectState.next_steps.map((step, idx) => (
								<Button
									key={idx}
									variant="ghost"
									className="w-full justify-between text-left h-auto p-3 rounded-lg hover:bg-white/[0.05] group text-muted-foreground hover:text-foreground transition-all duration-200"
									onClick={() => handleNextStep(step)}
								>
									<span className="flex items-center gap-3">
										<span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary" />
										<span className="text-sm">{step}</span>
									</span>
									<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
								</Button>
							))}
						</div>
						{projectState.blockers.length > 0 && (
							<div className="mt-4 pt-4 border-t border-white/[0.06]">
								<h4 className="text-destructive text-sm font-semibold mb-3 flex items-center gap-2">
									<AlertCircle className="w-4 h-4" />
									Blockers
								</h4>
								{projectState.blockers.map((blocker, idx) => (
									<div
										key={idx}
										className="text-sm text-muted-foreground pl-4 border-l-2 border-destructive/30 py-2"
									>
										{blocker}
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Git Status */}
				{context?.git_status && (
					<div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
						<div className="flex items-center justify-between mb-4">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<GitBranch className="w-4 h-4 text-accent/60" />
								Git Status
							</span>
							<Badge
								className="text-accent bg-accent/10 border-0 rounded-lg font-mono text-xs"
							>
								{context.git_status.branch}
							</Badge>
						</div>
						<div className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Modified Files</span>
								<span
									className={cn(
										"font-medium",
										context.git_status.modified_files.length > 5
											? "text-amber-400"
											: "text-foreground",
									)}
								>
									{context.git_status.modified_files.length}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Staged Files</span>
								<span className="text-foreground font-medium">
									{context.git_status.staged_files.length}
								</span>
							</div>
							{context.git_status.ahead > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Commits Ahead</span>
									<span className="text-primary font-medium">
										{context.git_status.ahead}
									</span>
								</div>
							)}
							{context.git_status.behind > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Commits Behind</span>
									<span className="text-amber-400 font-medium">
										{context.git_status.behind}
									</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Model Status */}
				<div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
					<div className="flex items-center justify-between mb-4">
						<span className="text-sm text-muted-foreground">
							AI Model Status
						</span>
						<Badge
							className={cn(
								"border-0 rounded-lg",
								agentStatus
									? "bg-emerald-500/10 text-emerald-400"
									: "bg-amber-500/10 text-amber-400",
							)}
						>
							{agentStatus ? "Active" : "Loading..."}
						</Badge>
					</div>
					<div className="space-y-3">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Model</span>
							<span className="text-foreground font-medium">
								{agentStatus?.active_model ?? "Unknown"}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Conversations</span>
							<span className="text-foreground font-medium">
								{agentStatus?.active_conversations.length ?? 0}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Project</span>
							<span className="text-foreground font-medium">
								{context?.current_project?.name ?? "None"}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">IPC Bridge</span>
							<span
								className={cn(
									"font-medium flex items-center gap-2",
									agentStatus?.ipc_connected ? "text-emerald-400" : "text-amber-400",
								)}
							>
								<span className={cn(
									"w-2 h-2 rounded-full",
									agentStatus?.ipc_connected 
										? "bg-emerald-400 shadow-[0_0_8px_hsl(150_80%_50%_/_0.6)]" 
										: "bg-amber-400 shadow-[0_0_8px_hsl(45_90%_55%_/_0.6)]"
								)} />
								{agentStatus?.ipc_connected ? "Connected" : "Disconnected"}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
