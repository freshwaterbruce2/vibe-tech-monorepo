import { motion } from "framer-motion";
import {
	Activity,
	Brain,
	Clock,
	Cpu,
	Database,
	Loader2,
	RefreshCw,
	ShieldAlert,
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LearningInsights } from "@/components/dashboard/LearningInsights";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { GroundedTaskPanel } from "@/components/dashboard/GroundedTaskPanel";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	formatRelativeTime,
	useActivityLogger,
	useNovaData,
} from "@/hooks/useNovaData";
import { AgentService } from "@/services/AgentService";

interface SystemMetric {
	label: string;
	value: string | number;
	change?: number;
	icon: React.ReactNode;
	status?: "good" | "warning" | "error";
}

interface ProjectState {
	current_phase: string;
	next_steps: string[];
	blockers: string[];
	decisions: string[];
	last_updated: string;
}

const NovaDashboard = () => {
	const navigate = useNavigate();
	const {
		tasks,
		activities,
		learningEvents,
		focusState,
		agentStatus,
		context,
		taskStats,
		todayActivityCount,
		isLoading,
		error,
		refresh,
		memoryOverview,
		storageHealth,
	} = useNovaData();
	const { logActivity } = useActivityLogger();
	const [projectState, setProjectState] = useState<ProjectState | null>(null);
	const lastIpcConnected = useRef<boolean | null>(null);

	useEffect(() => {
		const projectPath = context?.current_project?.path;
		if (!projectPath) {
			return;
		}

		const timer = setTimeout(() => {
			void AgentService.getProjectState(projectPath)
				.then((state) => {
					setProjectState(state as ProjectState);
				})
				.catch((error) => {
					console.error("Failed to load project state", error);
				});
		}, 0);

		return () => clearTimeout(timer);
	}, [context?.current_project?.path]);

	useEffect(() => {
		if (agentStatus?.ipc_connected === undefined) return;
		if (lastIpcConnected.current === null) {
			lastIpcConnected.current = agentStatus.ipc_connected;
			return;
		}
		if (agentStatus.ipc_connected !== lastIpcConnected.current) {
			if (agentStatus.ipc_connected) {
				toast.success("IPC bridge connected");
			} else {
				toast.warning("IPC bridge disconnected");
			}
			lastIpcConnected.current = agentStatus.ipc_connected;
		}
	}, [agentStatus?.ipc_connected]);

	const handleQuickAction = async (action: string) => {
		await logActivity("quick_action", action);
		switch (action) {
			case "chat":
				void navigate("/chat");
				break;
			case "guide":
				void navigate("/context-guide");
				break;
			case "doc-analysis":
				void navigate("/document-analysis");
				break;
		}
	};

	const handleNextStep = async (step: string) => {
		await logActivity("next_step_clicked", step);
		void navigate("/chat", {
			state: { initialMessage: `Help me with this task: ${step}` },
		});
	};

	const onQuickAction = (action: string) => {
		void handleQuickAction(action);
	};

	const onRefresh = () => {
		void refresh();
	};

	const onNextStep = (step: string) => {
		void handleNextStep(step);
	};

	const openTasks = Object.entries(taskStats)
		.filter(([status]) => status !== "completed" && status !== "archived")
		.reduce((sum, [, count]) => sum + (count ?? 0), 0);

	const metrics: SystemMetric[] = [
		{
			label: "Daily Activity",
			value: todayActivityCount,
			icon: <Activity className="w-5 h-5" />,
			status: "good",
		},
		{
			label: "Active Memory",
			value: agentStatus?.memory_count ?? 0,
			icon: <Brain className="w-5 h-5" />,
			status: "good",
		},
		{
			label: "Deep Work",
			value: context?.deep_work_minutes
				? `${Math.floor(context.deep_work_minutes)}m`
				: "0m",
			icon: <Clock className="w-5 h-5" />,
			status:
				context?.deep_work_minutes && context.deep_work_minutes > 60
					? "good"
					: "warning",
		},
		{
			label: "Open Tasks",
			value: openTasks,
			icon: <Cpu className="w-5 h-5" />,
			status: openTasks > 0 ? "warning" : "good",
		},
	];

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.6,
				staggerChildren: 0.1,
			},
		},
	} as const;

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4, ease: "easeOut" as const },
		},
	} as const;

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="glass-card p-8 rounded-2xl flex flex-col items-center gap-4">
					<div className="relative">
						<Loader2 className="w-10 h-10 animate-spin text-primary" />
						<div className="absolute inset-0 blur-xl bg-primary/30" />
					</div>
					<span className="text-muted-foreground">Loading Nova...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="glass-card p-8 rounded-2xl text-center max-w-md">
					<div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
						<ShieldAlert className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold mb-2 text-foreground">Connection Error</h2>
					<p className="mb-6 text-muted-foreground">{error}</p>
					<Button
						onClick={onRefresh}
						className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-0 rounded-xl px-6"
					>
						<RefreshCw className="w-4 h-4 mr-2" />
						Retry Connection
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-foreground">
			<motion.div
				className="relative z-10 container max-w-7xl mx-auto px-6 py-8 space-y-8"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{/* Header */}
				<motion.div variants={itemVariants} className="space-y-3">
					<div className="flex items-center gap-3">
						<div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
							<Sparkles className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-4xl font-bold">
							<span className="gradient-text">Welcome to NOVA</span>
						</h1>
					</div>
					<p className="text-lg text-muted-foreground max-w-2xl">
						Your AI-powered desktop assistant is ready to help.
					</p>
				</motion.div>

				{/* Storage Warning */}
				{storageHealth &&
					(!storageHealth.on_d_drive || !storageHealth.db_initialized) && (
						<motion.div variants={itemVariants}>
							<div className="glass-card p-4 rounded-xl border-destructive/30 flex items-start gap-4">
								<div className="p-2 rounded-lg bg-destructive/10">
									<ShieldAlert className="w-5 h-5 text-destructive" />
								</div>
								<div>
									<p className="font-semibold text-foreground">Storage warning</p>
									<p className="text-sm text-muted-foreground mt-1">
										{storageHealth.message}
									</p>
									<p className="text-xs text-muted-foreground/60 mt-2 font-mono">
										DATABASE_PATH: {storageHealth.database_path}
									</p>
								</div>
							</div>
						</motion.div>
					)}

				{/* Metrics Grid */}
				<MetricsGrid metrics={metrics} itemVariants={itemVariants} />

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Quick Actions - Takes 2 columns */}
					<motion.div variants={itemVariants} className="lg:col-span-2">
						<QuickActions
							handleQuickAction={onQuickAction}
							refresh={onRefresh}
							context={context}
							agentStatus={agentStatus}
							projectState={projectState}
							handleNextStep={onNextStep}
						/>
					</motion.div>

					{/* Right Sidebar */}
					<motion.div variants={itemVariants} className="space-y-6">
						<GroundedTaskPanel tasks={tasks} variant="compact" />

						<RecentActivity
							activities={activities}
							formatRelativeTime={formatRelativeTime}
						/>

						<LearningInsights
							agentStatus={agentStatus}
							taskStats={taskStats}
							activities={activities}
							learningEvents={learningEvents}
							focusState={focusState}
						/>

						{/* Memory Overview Card */}
						{memoryOverview && (
							<div className="glass-card p-6 rounded-2xl">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-primary/10">
											<Database className="w-4 h-4 text-primary" />
										</div>
										<span className="font-semibold text-foreground">Memory</span>
									</div>
									<Badge className="bg-primary/10 text-primary border-0 rounded-lg">
										{memoryOverview.count} entries
									</Badge>
								</div>
								{memoryOverview.recent.length === 0 ? (
									<div className="text-center py-6">
										<Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
										<p className="text-sm text-muted-foreground">No memories yet.</p>
									</div>
								) : (
									<div className="space-y-2">
										{memoryOverview.recent.map((memory) => (
											<div
												key={memory.id}
												className="p-3 rounded-xl glass-input hover:bg-white/[0.04] transition-all duration-200"
											>
												<div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
													<span className="capitalize font-medium text-secondary/80">
														{memory.memory_type}
													</span>
													<span>
														{new Date(
															memory.last_accessed * 1000,
														).toLocaleTimeString()}
													</span>
												</div>
												<p className="text-sm text-foreground/80 line-clamp-2">
													{memory.content}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
};

export default NovaDashboard;
