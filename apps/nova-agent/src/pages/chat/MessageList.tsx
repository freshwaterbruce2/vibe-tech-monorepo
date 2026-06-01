import { AnimatePresence, motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage as CoreChatMessage } from "@/types/agent";

export interface ChatMessage extends Omit<CoreChatMessage, 'role'> {
	role: 'user' | 'assistant' | 'system' | 'tool';
	reasoning?: string;
}


interface MessageListProps {
	messages: ChatMessage[];
	modeLabel: string;
	gravityClawMode: boolean;
	isLoading: boolean;
	isStreaming: boolean;
	scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
	messages,
	modeLabel,
	gravityClawMode,
	isLoading,
	isStreaming,
	scrollRef,
}: MessageListProps) {
	return (
		<ScrollArea className="flex-1 p-4">
			<div className="space-y-6">
				<AnimatePresence initial={false}>
					{messages.map((msg) => (
						<motion.div
							key={msg.timestamp}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] rounded-2xl p-4 ${
									msg.role === "user"
										? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none"
										: msg.role === "system"
											? msg.content.startsWith("❌")
												? "bg-red-950/40 border border-red-800/40 text-red-200 text-xs font-mono rounded-lg w-full"
												: "bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-xs font-mono rounded-lg w-full"
											: msg.role === "tool"
												? "bg-yellow-950/40 border border-yellow-800/40 text-yellow-200 text-xs font-mono rounded-lg w-full"
												: gravityClawMode
													? "bg-purple-900/30 border border-purple-500/20 text-white rounded-tl-none"
													: "bg-white/10 border border-white/10 text-white rounded-tl-none"
								}`}
							>
								<div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
									{msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
									<span>
										{msg.role === "user"
											? "You"
											: msg.role === "system"
												? "System Log"
												: msg.role === "tool"
													? "Tool Result"
													: modeLabel}
									</span>
									<span>•</span>
									<span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
								</div>
								{msg.reasoning && (
									<div className="mb-3 rounded-lg bg-black/30 border border-cyan-500/20 p-3 text-xs text-cyan-200/80 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
										<div className="font-bold uppercase tracking-wider text-[10px] text-cyan-400 mb-1 opacity-90">Reasoning Process</div>
										{msg.reasoning}
									</div>
								)}
								<div className="whitespace-pre-wrap leading-relaxed">
									{msg.content || (
										<span className="opacity-40 italic text-sm">Thinking…</span>
									)}
								</div>
							</div>

						</motion.div>
					))}
				</AnimatePresence>

				{/* Bounce indicator only for non-streaming NOVA mode */}
				{isLoading && !isStreaming && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
						<div className="bg-white/5 rounded-2xl p-4 rounded-tl-none flex items-center gap-2">
							{[0, 150, 300].map((delay, idx) => (
								<div
									key={idx}
									className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
									style={{ animationDelay: `${delay}ms` }}
								/>
							))}
						</div>
					</motion.div>
				)}
				<div ref={scrollRef} />
			</div>
		</ScrollArea>
	);
}
