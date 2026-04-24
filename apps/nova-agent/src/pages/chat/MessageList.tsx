import { AnimatePresence, motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types/agent";

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
											? "bg-red-900/50 border border-red-500/30 text-red-200"
											: gravityClawMode
												? "bg-purple-900/30 border border-purple-500/20 text-white rounded-tl-none"
												: "bg-white/10 border border-white/10 text-white rounded-tl-none"
								}`}
							>
								<div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
									{msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
									<span>{msg.role === "user" ? "You" : modeLabel}</span>
									<span>•</span>
									<span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
								</div>
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
