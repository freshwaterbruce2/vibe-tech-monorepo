import { GitBranch, Server } from "lucide-react";
import type { AgentStatus, SystemContext } from "@/hooks/useNovaData";

export const AIModelStatusPanel = ({
	agentStatus,
	context,
}: {
	agentStatus: AgentStatus | null;
	context: SystemContext | null;
}) => {
	return (
		<div style={{
			background: 'rgba(15, 12, 28, 0.6)',
			backdropFilter: 'blur(16px)',
			border: '1px solid rgba(255, 255, 255, 0.06)',
			borderRadius: '20px',
			padding: '24px',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
				<div style={{
					width: '40px', height: '40px', borderRadius: '12px',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))',
					border: '1px solid rgba(168, 85, 247, 0.2)',
				}}>
					<Server style={{ width: '20px', height: '20px', color: '#a855f7' }} />
				</div>
				<span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>AI Model Status</span>
				<span style={{
					marginLeft: 'auto', padding: '4px 12px', borderRadius: '20px',
					fontSize: '0.75rem', fontWeight: 600,
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
							width: '8px', height: '8px', borderRadius: '50%',
							background: agentStatus?.ipc_connected ? '#22c55e' : '#eab308',
							boxShadow: `0 0 8px ${agentStatus?.ipc_connected ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 179, 8, 0.6)'}`,
						}} />
						{agentStatus?.ipc_connected ? 'Connected' : 'Disconnected'}
					</span>
				</div>
			</div>
		</div>
	);
};

export const GitStatusPanel = ({
	context,
}: {
	context: SystemContext | null;
}) => {
	return (
		<div style={{
			background: 'rgba(15, 12, 28, 0.6)',
			backdropFilter: 'blur(16px)',
			border: '1px solid rgba(255, 255, 255, 0.06)',
			borderRadius: '20px',
			padding: '24px',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
				<div style={{
					width: '40px', height: '40px', borderRadius: '12px',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.1))',
					border: '1px solid rgba(34, 211, 238, 0.2)',
				}}>
					<GitBranch style={{ width: '20px', height: '20px', color: '#22d3ee' }} />
				</div>
				<span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>Git Status</span>
				{context?.git_status?.branch && (
					<span style={{
						marginLeft: 'auto', padding: '4px 12px', borderRadius: '20px',
						fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace',
						background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee',
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
						<span style={{ color: context.git_status.modified_files?.length && context.git_status.modified_files.length > 5 ? '#eab308' : 'white', fontWeight: 500 }}>
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
	);
};
