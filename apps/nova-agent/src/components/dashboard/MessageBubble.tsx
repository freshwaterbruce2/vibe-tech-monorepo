// apps/nova-agent/src/components/dashboard/MessageBubble.tsx

import { AlertTriangle, BrainCircuit, Cpu, User } from "lucide-react";
import type { AgentMessage } from "@/hooks/useNovaData"; // Adjust import if needed

interface MessageProps {
	message: AgentMessage;
}

export const MessageBubble = ({ message }: MessageProps) => {
	const isUser = message.role === "user";
	const isSystem = message.role === "system";

	// 1. Dynamic Styles based on Role
	const containerClass = isUser
		? "ml-auto border-zinc-700 bg-zinc-900"
		: isSystem
			? "mx-auto border-red-900/50 bg-red-950/10 max-w-full"
			: "mr-auto border-green-500/30 bg-green-950/10 shadow-[0_0_15px_rgba(34,197,94,0.05)]";

	const textClass = isUser
		? "text-zinc-300"
		: isSystem
			? "text-red-400"
			: "text-green-100";

	const headerClass = isUser
		? "text-zinc-500"
		: isSystem
			? "text-red-500"
			: "text-green-500";

	// PARSE THINKING BLOCKS (DeepSeek R1 style)
	// We look for <think> tags or just content separation if tags are stripped
	let thoughtContent = null;
	let mainContent = message.content;

	if (message.content.includes("<think>")) {
		const parts = message.content.split("</think>");
		if (parts.length > 1 && parts[0] && parts[1]) {
			thoughtContent = parts[0].replace("<think>", "").trim();
			mainContent = parts[1].trim();
		}
	}

	return (
		<div
			className={`flex flex-col max-w-[85%] group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? "items-end" : "items-start"}`}
		>
			{/* Meta Header */}
			<div
				className={`flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest font-mono ${headerClass}`}
			>
				{isUser ? (
					<User size={10} />
				) : isSystem ? (
					<AlertTriangle size={10} />
				) : (
					<Cpu size={10} />
				)}
				<span>
					{isUser ? "OPERATOR" : isSystem ? "SYSTEM_ALERT" : "NOVA_CORE"}
				</span>
				<span className="opacity-50">::</span>
				<span className="opacity-50">
					{new Date(message.timestamp).toLocaleTimeString()}
				</span>
			</div>

			{/* THOUGHT PROCESS COLLAPSIBLE */}
			{thoughtContent && !isUser && (
				<div className="mb-2 ml-1 mr-1 w-full">
					<details className="group/think">
						<summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] text-zinc-500 hover:text-green-400 transition-colors uppercase tracking-widest select-none bg-zinc-900/50 p-1 rounded border border-transparent hover:border-zinc-800">
							<BrainCircuit size={12} />
							<span>Cognitive Trace</span>
							<span className="opacity-30 group-open/think:hidden">
								:: EXPAND
							</span>
						</summary>
						<div className="mt-2 pl-3 border-l-2 border-zinc-800 text-xs text-zinc-500 font-mono leading-relaxed whitespace-pre-wrap italic bg-black/20 p-2 rounded-r">
							{thoughtContent}
						</div>
					</details>
				</div>
			)}

			{/* Content Body */}
			<div
				className={`relative p-4 border rounded-sm backdrop-blur-sm ${containerClass} w-full`}
			>
				{/* Cyber-Corner Accents (Visual Polish) */}
				{!isUser && !isSystem && (
					<>
						<div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-green-500"></div>
						<div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-green-500"></div>
					</>
				)}

				<div
					className={`whitespace-pre-wrap font-mono text-sm leading-relaxed selection:bg-green-500/30 selection:text-green-200 ${textClass}`}
				>
					{mainContent}
				</div>

				{/* Citation Footer (If Context Used) */}
				{message.citations && message.citations.length > 0 && (
					<div className="mt-3 pt-3 border-t border-zinc-800/50 flex flex-wrap gap-2">
						{message.citations.map(
							(cite: string | { title: string }, idx: number) => (
								<span
									key={idx}
									className="text-[9px] px-1.5 py-0.5 border border-blue-900 bg-blue-950/30 text-blue-400 rounded hover:bg-blue-900/50 cursor-help"
									title={
										typeof cite === "object" ? cite.title : "Source Context"
									}
								>
									REF: {typeof cite === "object" ? cite.title : String(cite)}
								</span>
							),
						)}
					</div>
				)}
			</div>
		</div>
	);
};
