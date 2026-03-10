import { motion } from "framer-motion";
import {
	Activity,
	Brain,
	ChevronRight,
	Clock,
	FileText,
	GitBranch,
	Loader2,
	MessageSquare,
	PlusCircle,
	RefreshCw,
	Server,
	ShieldAlert,
	Sparkles,
	Zap,
	type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { GroundedTaskPanel } from "@/components/dashboard/GroundedTaskPanel";
import { LearningInsights } from "@/components/dashboard/LearningInsights";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
	formatRelativeTime,
	useActivityLogger,
	useNovaData,
} from "@/hooks/useNovaData";
import "@/styles/neon-2026.css";

// Metric Card Component - 2026 Style
const MetricCard2026 = ({
	label,
	value,
	icon: Icon,
	color = "purple",
}: {
	label: string;
	value: string | number;
	icon: LucideIcon;
	color?: "purple" | "pink" | "cyan" | "green";
}) => {
	const colorStyles = {
		purple: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.25)', icon: '#a855f7' },
		pink: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.25)', icon: '#ec4899' },
		cyan: { bg: 'rgba(34, 211, 238, 0.15)', border: 'rgba(34, 211, 238, 0.25)', icon: '#22d3ee' },
		green: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.25)', icon: '#22c55e' },
	};
	const styles = colorStyles[color];

	return (
		<motion.div
			style={{
				background: 'rgba(15, 12, 28, 0.6)',
				backdropFilter: 'blur(16px)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
				borderRadius: '20px',
				padding: '24px',
			}}
			whileHover={{ scale: 1.02, borderColor: 'rgba(176, 38, 255, 0.3)' }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
		>
			<div className="flex items-start justify-between mb-4">
				<div
					style={{
						width: '48px',
						height: '48px',
						borderRadius: '14px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: styles.bg,
						border: `1px solid ${styles.border}`,
					}}
				>
					<Icon style={{ width: '20px', height: '20px', color: styles.icon }} />
				</div>
				<div 
					style={{
						width: '8px',
						height: '8px',
						borderRadius: '50%',
						background: '#b026ff',
						boxShadow: '0 0 12px rgba(176, 38, 255, 0.8)',
					}}
				/>
			</div>
			<div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
			<div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
		</motion.div>
	);
};

// Action Button Component - 2026 Style
const ActionButton2026 = ({
	icon: Icon,
	label,
	onClick,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}) => {
	return (
		<motion.button
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '12px',
				padding: '24px 16px',
				background: 'rgba(15, 12, 28, 0.5)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
				borderRadius: '20px',
				cursor: 'pointer',
				width: '100%',
			}}
			onClick={onClick}
			whileHover={{ scale: 1.02, background: 'rgba(176, 38, 255, 0.1)', borderColor: 'rgba(176, 38, 255, 0.3)' }}
			whileTap={{ scale: 0.98 }}
		>
			<div style={{
				width: '56px',
				height: '56px',
				borderRadius: '16px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.2), rgba(255, 45, 149, 0.1))',
				border: '1px solid rgba(176, 38, 255, 0.2)',
			}}>
				<Icon style={{ width: '24px', height: '24px', color: '#a855f7' }} />
			</div>
			<span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
		</motion.button>
	);
};

const NovaDashboard2026 = () => {
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
		storageHealth,
	} = useNovaData();
	const { logActivity } = useActivityLogger();
	const lastIpcConnected = useRef<boolean | null>(null);

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
			case "task":
				// handled by dialog
				break;
		}
	};

	const openTasks = Object.entries(taskStats)
		.filter(([status]) => status !== "completed" && status !== "archived")
		.reduce((sum, [, count]) => sum + ((count as number) ?? 0), 0);

	// Loading State - 2026 Style
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<motion.div 
					style={{
						background: 'rgba(15, 12, 28, 0.8)',
						backdropFilter: 'blur(24px)',
						border: '1px solid rgba(176, 38, 255, 0.2)',
						borderRadius: '24px',
						padding: '48px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '24px',
					}}
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
				>
					<div className="relative">
						<Loader2 className="w-12 h-12 animate-spin text-purple-400" />
					</div>
					<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', fontWeight: 500 }}>Initializing NOVA...</span>
				</motion.div>
			</div>
		);
	}

	// Error State - 2026 Style
	if (error) {
		return (
			<div className="flex items-center justify-center p-4 py-20">
				<motion.div 
					style={{
						background: 'rgba(15, 12, 28, 0.8)',
						backdropFilter: 'blur(24px)',
						border: '1px solid rgba(239, 68, 68, 0.2)',
						borderRadius: '24px',
						padding: '40px',
						textAlign: 'center',
						maxWidth: '28rem',
					}}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div style={{
						width: '80px',
						height: '80px',
						borderRadius: '16px',
						background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(236, 72, 153, 0.1))',
						border: '1px solid rgba(239, 68, 68, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						margin: '0 auto 24px',
					}}>
						<ShieldAlert style={{ width: '40px', height: '40px', color: '#f87171' }} />
					</div>
					<h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Connection Error</h2>
					<p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>{error}</p>
					<button 
						onClick={() => {
							void refresh();
						}} 
						style={{
							background: 'linear-gradient(135deg, #b026ff, #ff2d95)',
							border: 'none',
							borderRadius: '14px',
							padding: '14px 28px',
							color: 'white',
							fontWeight: 600,
							display: 'inline-flex',
							alignItems: 'center',
							gap: '8px',
							cursor: 'pointer',
						}}
					>
						<RefreshCw style={{ width: '20px', height: '20px' }} />
						Retry Connection
					</button>
				</motion.div>
			</div>
		);
	}

	return (
		<div style={{ color: 'white', position: 'relative' }}>
			{/* No extra background - MainLayout provides it */}

			<motion.div
				className="container max-w-7xl mx-auto px-6 py-10 space-y-10"
				style={{ opacity: 1 }}
				initial={{ opacity: 1 }}
				animate={{ opacity: 1 }}
			>
				{/* Hero Header */}
				<motion.div  className="text-center space-y-6">
					<motion.div 
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '12px',
							padding: '8px 20px',
							borderRadius: '9999px',
							background: 'rgba(15, 12, 28, 0.7)',
							backdropFilter: 'blur(20px)',
							border: '1px solid rgba(168, 85, 247, 0.2)',
						}}
						whileHover={{ scale: 1.05 }}
					>
						<div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px rgba(34, 197, 94, 0.8)' }} />
						<span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
							{agentStatus?.ipc_connected ? "System Online" : "Connecting..."}
						</span>
						<span style={{
							background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.2), rgba(255, 45, 149, 0.1))',
							border: '1px solid rgba(176, 38, 255, 0.3)',
							color: '#ff2d95',
							padding: '4px 12px',
							borderRadius: '20px',
							fontSize: '0.75rem',
							fontWeight: 600,
						}}>
							{agentStatus?.active_model ?? "Loading"}
						</span>
					</motion.div>

					<h1 
						className="text-4xl md:text-5xl font-extrabold"
						style={{
							background: 'linear-gradient(135deg, #00ffff, #b026ff, #ff2d95)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
						}}
					>
						Welcome to NOVA
					</h1>
					
					<p className="text-xl text-white/50 max-w-2xl mx-auto">
						Your AI-powered desktop assistant is ready to help.
					</p>
				</motion.div>

				{/* Storage Warning */}
				{storageHealth && (!storageHealth.on_d_drive || !storageHealth.db_initialized) && (
					<motion.div >
						<div className="glass-card-2026 p-5 border-red-500/30 flex items-start gap-4">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/10 flex items-center justify-center flex-shrink-0">
								<ShieldAlert className="w-6 h-6 text-red-400" />
							</div>
							<div>
								<p className="font-semibold text-white">Storage Warning</p>
								<p className="text-sm text-white/50 mt-1">{storageHealth.message}</p>
							</div>
						</div>
					</motion.div>
				)}

				{/* Metrics Grid */}
				<motion.div >
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
						<MetricCard2026
							label="Daily Activity"
							value={todayActivityCount}
							icon={Activity}
							color="purple"
						/>
						<MetricCard2026
							label="Active Memory"
							value={agentStatus?.memory_count ?? 0}
							icon={Brain}
							color="pink"
						/>
						<MetricCard2026
							label="Deep Work"
							value={context?.deep_work_minutes ? `${Math.floor(context.deep_work_minutes)}m` : "0m"}
							icon={Clock}
							color="cyan"
						/>
						<MetricCard2026
							label="Open Tasks"
							value={openTasks}
							icon={Zap}
							color="green"
						/>
					</div>
				</motion.div>

				{/* Primary CTA */}
				<motion.div >
					<div style={{
						background: 'linear-gradient(135deg, rgba(20, 15, 40, 0.8), rgba(15, 10, 30, 0.9))',
						backdropFilter: 'blur(24px)',
						border: '1px solid rgba(176, 38, 255, 0.15)',
						borderRadius: '24px',
						padding: '32px',
						boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 80px -20px rgba(176, 38, 255, 0.15)',
					}}>
						<div className="flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex items-center gap-5">
								<div style={{
									width: '64px',
									height: '64px',
									borderRadius: '16px',
									background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.2))',
									border: '1px solid rgba(168, 85, 247, 0.3)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}>
									<MessageSquare style={{ width: '32px', height: '32px', color: '#c4b5fd' }} />
								</div>
								<div>
									<h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Start AI Chat</h2>
									<p style={{ color: 'rgba(255,255,255,0.5)' }}>Ask NOVA anything or get help with your projects</p>
								</div>
							</div>
							<motion.button
								style={{
									background: 'linear-gradient(135deg, #b026ff, #ff2d95)',
									border: 'none',
									borderRadius: '14px',
									padding: '16px 40px',
									color: 'white',
									fontWeight: 600,
									fontSize: '1.125rem',
									display: 'flex',
									alignItems: 'center',
									gap: '12px',
									boxShadow: '0 4px 20px rgba(176, 38, 255, 0.4), 0 0 40px rgba(255, 45, 149, 0.2)',
									cursor: 'pointer',
								}}
								onClick={() => {
									void handleQuickAction("chat");
								}}
								whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(176, 38, 255, 0.6), 0 0 60px rgba(255, 45, 149, 0.4)' }}
								whileTap={{ scale: 0.95 }}
							>
								<Sparkles style={{ width: '20px', height: '20px' }} />
								Open Chat
								<ChevronRight style={{ width: '20px', height: '20px' }} />
							</motion.button>
						</div>
					</div>
				</motion.div>

				{/* Quick Actions Grid */}
				<motion.div >
					<h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
						<Sparkles style={{ width: '20px', height: '20px', color: '#a855f7' }} />
						Quick Actions
					</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }} className="md:grid-cols-4">
						<CreateTaskDialog
							onTaskCreated={() => {
								void refresh();
							}}
							defaultProjectPath={context?.current_project?.path}
							trigger={
								<motion.div
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										gap: '12px',
										padding: '24px 16px',
										background: 'rgba(15, 12, 28, 0.5)',
										border: '1px solid rgba(255, 255, 255, 0.06)',
										borderRadius: '20px',
										cursor: 'pointer',
									}}
									whileHover={{ scale: 1.02, background: 'rgba(176, 38, 255, 0.1)', borderColor: 'rgba(176, 38, 255, 0.3)' }}
									whileTap={{ scale: 0.98 }}
								>
									<div style={{
										width: '56px',
										height: '56px',
										borderRadius: '16px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.2), rgba(255, 45, 149, 0.1))',
										border: '1px solid rgba(176, 38, 255, 0.2)',
									}}>
										<PlusCircle style={{ width: '24px', height: '24px', color: '#a855f7' }} />
									</div>
									<span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Add Task</span>
								</motion.div>
							}
						/>
						<ActionButton2026
							icon={Zap}
							label="Context Guide"
							onClick={() => {
								void handleQuickAction("guide");
							}}
						/>
						<ActionButton2026
							icon={FileText}
							label="Doc Analysis"
							onClick={() => {
								void handleQuickAction("doc-analysis");
							}}
						/>
						<motion.button
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '12px',
								padding: '24px 16px',
								background: 'rgba(15, 12, 28, 0.5)',
								border: '1px solid rgba(255, 255, 255, 0.06)',
								borderRadius: '20px',
								cursor: 'pointer',
							}}
							onClick={() => {
								void refresh();
							}}
							whileHover={{ scale: 1.02, background: 'rgba(34, 211, 238, 0.1)', borderColor: 'rgba(34, 211, 238, 0.3)' }}
							whileTap={{ scale: 0.98 }}
						>
							<div style={{
								width: '56px',
								height: '56px',
								borderRadius: '16px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.1))',
								border: '1px solid rgba(34, 211, 238, 0.2)',
							}}>
								<RefreshCw style={{ width: '24px', height: '24px', color: '#22d3ee' }} />
							</div>
							<span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Refresh</span>
						</motion.button>
					</div>
				</motion.div>

				{/* Status Panels */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* AI Model Status */}
					<div style={{
						background: 'rgba(15, 12, 28, 0.6)',
						backdropFilter: 'blur(16px)',
						border: '1px solid rgba(255, 255, 255, 0.06)',
						borderRadius: '20px',
						padding: '24px',
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
							<div style={{
								width: '40px',
								height: '40px',
								borderRadius: '12px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))',
								border: '1px solid rgba(168, 85, 247, 0.2)',
							}}>
								<Server style={{ width: '20px', height: '20px', color: '#a855f7' }} />
							</div>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>AI Model Status</span>
							<span style={{
								marginLeft: 'auto',
								padding: '4px 12px',
								borderRadius: '20px',
								fontSize: '0.75rem',
								fontWeight: 600,
								background: agentStatus?.ipc_connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
								color: agentStatus?.ipc_connected ? '#22c55e' : '#eab308',
								border: `1px solid ${agentStatus?.ipc_connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
							}}>
								{agentStatus?.ipc_connected ? 'Connected' : 'Connecting...'}
							</span>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
								<span style={{ color: 'rgba(255,255,255,0.5)' }}>Model</span>
								<span style={{ color: 'white', fontWeight: 500 }}>{agentStatus?.active_model ?? 'Unknown'}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
								<span style={{ color: 'rgba(255,255,255,0.5)' }}>Conversations</span>
								<span style={{ color: 'white', fontWeight: 500 }}>{agentStatus?.active_conversations?.length ?? 0}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
								<span style={{ color: 'rgba(255,255,255,0.5)' }}>Project</span>
								<span style={{ color: 'white', fontWeight: 500 }}>{context?.current_project?.name ?? 'None'}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
								<span style={{ color: 'rgba(255,255,255,0.5)' }}>IPC Bridge</span>
								<span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: agentStatus?.ipc_connected ? '#22c55e' : '#eab308', fontWeight: 500 }}>
									<span style={{
										width: '8px',
										height: '8px',
										borderRadius: '50%',
										background: agentStatus?.ipc_connected ? '#22c55e' : '#eab308',
										boxShadow: `0 0 8px ${agentStatus?.ipc_connected ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 179, 8, 0.6)'}`,
									}} />
									{agentStatus?.ipc_connected ? 'Connected' : 'Disconnected'}
								</span>
							</div>
						</div>
					</div>

					{/* Git Status */}
					<div style={{
						background: 'rgba(15, 12, 28, 0.6)',
						backdropFilter: 'blur(16px)',
						border: '1px solid rgba(255, 255, 255, 0.06)',
						borderRadius: '20px',
						padding: '24px',
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
							<div style={{
								width: '40px',
								height: '40px',
								borderRadius: '12px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.1))',
								border: '1px solid rgba(34, 211, 238, 0.2)',
							}}>
								<GitBranch style={{ width: '20px', height: '20px', color: '#22d3ee' }} />
							</div>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>Git Status</span>
							{context?.git_status?.branch && (
								<span style={{
									marginLeft: 'auto',
									padding: '4px 12px',
									borderRadius: '20px',
									fontSize: '0.75rem',
									fontWeight: 600,
									fontFamily: 'monospace',
									background: 'rgba(34, 211, 238, 0.15)',
									color: '#22d3ee',
									border: '1px solid rgba(34, 211, 238, 0.3)',
								}}>
									{context.git_status.branch}
								</span>
							)}
						</div>
						{context?.git_status ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
									<span style={{ color: 'rgba(255,255,255,0.5)' }}>Modified Files</span>
									<span style={{ color: context.git_status.modified_files?.length > 5 ? '#eab308' : 'white', fontWeight: 500 }}>
										{context.git_status.modified_files?.length ?? 0}
									</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
									<span style={{ color: 'rgba(255,255,255,0.5)' }}>Staged Files</span>
									<span style={{ color: 'white', fontWeight: 500 }}>{context.git_status.staged_files?.length ?? 0}</span>
								</div>
								{context.git_status.ahead > 0 && (
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
										<span style={{ color: 'rgba(255,255,255,0.5)' }}>Commits Ahead</span>
										<span style={{ color: '#a855f7', fontWeight: 500 }}>{context.git_status.ahead}</span>
									</div>
								)}
								{context.git_status.behind > 0 && (
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
										<span style={{ color: 'rgba(255,255,255,0.5)' }}>Commits Behind</span>
										<span style={{ color: '#eab308', fontWeight: 500 }}>{context.git_status.behind}</span>
									</div>
								)}
							</div>
						) : (
							<div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.4)' }}>
								<GitBranch style={{ width: '32px', height: '32px', margin: '0 auto 8px', opacity: 0.3 }} />
								<p style={{ fontSize: '0.875rem' }}>No git info available</p>
							</div>
						)}
					</div>
				</div>

				{/* Activity Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<GroundedTaskPanel tasks={tasks} />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
				</div>
			</motion.div>
		</div>
	);
};

export default NovaDashboard2026;
