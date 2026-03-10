import { AnimatePresence, motion } from "framer-motion";
import { Bot, Cpu, Database, Send, Sparkles, User } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ScreenshotButton } from "@/components/ScreenshotButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentService } from "@/services/AgentService";
import type { AgentState, ChatMessage } from "@/types/agent";

const ChatInterface = () => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [agentState, setAgentState] = useState<AgentState | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void loadAgentStatus();
		// Add initial greeting
		setMessages([
			{
				role: "assistant",
				content:
					"Hello! I'm NOVA, your Neural Omnipresent Virtual Assistant. How can I help you today?",
				timestamp: Date.now(),
			},
		]);
	}, []);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	const loadAgentStatus = async () => {
		try {
			const status = await AgentService.getStatus();
			setAgentState(status);
		} catch (error) {
			console.error("Failed to load agent status:", error);
		}
	};

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			role: "user",
			content: input,
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			const response = await AgentService.chat(input);

			const assistantMessage: ChatMessage = {
				role: "assistant",
				content: response,
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, assistantMessage]);
			await loadAgentStatus(); // Refresh status after interaction
		} catch (error) {
			console.error("Chat error:", error);
			const errorMessage: ChatMessage = {
				role: "system",
				content: `Error: ${error instanceof Error ? error.message : String(error)}`,
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSend();
		}
	};

	const handleScreenshotAnalysis = (analysis: string, imagePath: string) => {
		// Add analysis as a system message
		const analysisMessage: ChatMessage = {
			role: "assistant",
			content: `📸 Screenshot Analysis:\n\n${analysis}\n\nImage: ${imagePath}`,
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, analysisMessage]);
	};

	return (
		<div className="container mx-auto px-4 py-8 h-[calc(100vh-100px)] flex gap-6">
			{/* Main Chat Area */}
			<Card className="flex-1 flex flex-col bg-black/40 backdrop-blur-xl border-white/10 overflow-hidden shadow-2xl">
				{/* Header */}
				<div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
							<Bot className="w-6 h-6 text-cyan-400" />
						</div>
						<div>
							<h2 className="font-bold text-white">NOVA Assistant</h2>
							<div className="flex items-center gap-2 text-xs text-cyan-400">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
								</span>
								Online & Ready
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="icon"
							className="text-white/70 hover:text-white hover:bg-white/10"
						>
							<Database className="w-5 h-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-white/70 hover:text-white hover:bg-white/10"
						>
							<Cpu className="w-5 h-5" />
						</Button>
					</div>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1 p-4">
					<div className="space-y-6">
						<AnimatePresence initial={false}>
							{messages.map((msg, index) => (
								<motion.div
									key={index}
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
													: "bg-white/10 border border-white/10 text-white rounded-tl-none"
										}`}
									>
										<div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
											{msg.role === "user" ? (
												<User className="w-3 h-3" />
											) : (
												<Bot className="w-3 h-3" />
											)}
											<span>{msg.role === "user" ? "You" : "NOVA"}</span>
											<span>•</span>
											<span>
												{new Date(msg.timestamp).toLocaleTimeString()}
											</span>
										</div>
										<div className="whitespace-pre-wrap leading-relaxed">
											{msg.content}
										</div>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
						{isLoading && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="flex justify-start"
							>
								<div className="bg-white/5 rounded-2xl p-4 rounded-tl-none flex items-center gap-2">
									<div
										className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
										style={{ animationDelay: "0ms" }}
									/>
									<div
										className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
										style={{ animationDelay: "150ms" }}
									/>
									<div
										className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
										style={{ animationDelay: "300ms" }}
									/>
								</div>
							</motion.div>
						)}
						<div ref={scrollRef} />
					</div>
				</ScrollArea>

				{/* Input */}
				<div className="p-4 border-t border-white/10 bg-white/5">
					<div className="flex gap-2">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder="Type your message..."
							className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20"
							disabled={isLoading}
						/>
						<ScreenshotButton onAnalysisComplete={handleScreenshotAnalysis} />
						<Button
							onClick={() => {
								void handleSend();
							}}
							disabled={!input.trim() || isLoading}
							className="bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
						>
							{isLoading ? (
								<Sparkles className="w-4 h-4 animate-spin" />
							) : (
								<Send className="w-4 h-4" />
							)}
						</Button>
					</div>
				</div>
			</Card>

			{/* Sidebar / Status Panel (Desktop only) */}
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
								<span className="text-cyan-400">
									{agentState?.memory_count ?? 0} items
								</span>
							</div>
							<div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
								<div className="h-full bg-cyan-500 w-[45%]" />
							</div>
						</div>
						<div>
							<div className="flex justify-between text-sm mb-1">
								<span className="text-white/60">Active Contexts</span>
								<span className="text-purple-400">
									{agentState?.active_conversations?.length ?? 0}
								</span>
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
							<span
								key={i}
								className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/80"
							>
								{cap}
							</span>
						)) ?? (
							<span className="text-sm text-white/40 italic">
								Loading capabilities...
							</span>
						)}
					</div>
				</Card>
			</div>
		</div>
	);
};

export default ChatInterface;
