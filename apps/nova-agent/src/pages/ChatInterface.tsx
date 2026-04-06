import { AnimatePresence, motion } from "framer-motion";
import { Bot, Cpu, Database, Send, Sparkles, User, Zap } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ScreenshotButton } from "@/components/ScreenshotButton";
import { VoiceBar } from "@/components/chat/VoiceBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useGravityClaw, type GCMessage } from "@/hooks/useGravityClaw";
import { useVoice } from "@/hooks/useVoice";
import { AgentService, type PendingTask } from "@/services/AgentService";
import type { AgentState, ChatMessage } from "@/types/agent";

const CHAT_STORAGE_KEY = "nova-chat-messages";
const MAX_PERSISTED_MESSAGES = 50;

// Strips markdown syntax so TTS reads naturally
function toSpokenText(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, "code block omitted")
		.replace(/[*_`#~>]/g, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.trim();
}

const ChatInterface = () => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [agentState, setAgentState] = useState<AgentState | null>(null);
	const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);

	// false = NOVA (Tauri IPC), true = G-CLAW (GravityClaw via HTTP)
	const [gravityClawMode, setGravityClawMode] = useState(false);
	const [voiceEnabled, setVoiceEnabled] = useState(false);

	// Full conversation history for gravity-claw (stateless API — we send it each time)
	const gcHistoryRef = useRef<GCMessage[]>([]);
	// Monotonic timestamp: Date.now() + sub-ms counter to guarantee uniqueness
	const msgCounterRef = useRef(0);
	const nextTimestamp = () => {
		const ts = Date.now();
		// If wall-clock hasn't advanced, bump the counter to stay unique
		if (ts <= msgCounterRef.current) return ++msgCounterRef.current;
		msgCounterRef.current = ts;
		return ts;
	};

	const scrollRef = useRef<HTMLDivElement>(null);

	const { sendMessage: gcSend, isStreaming, abort: gcAbort, model: gcModel } = useGravityClaw();

	// ── Ref-based speak so sendMessage never has voice as a circular dep ─────
	// voice is declared after sendMessage in render order; this ref bridges it
	const speakRef = useRef<(text: string) => Promise<void>>(async () => undefined);

	// ── sendMessage ──────────────────────────────────────────────────────────
	const sendMessage = useCallback(
		async (text: string) => {
			if (!text.trim() || isLoading) return;

			const userMsg: ChatMessage = { role: "user", content: text, timestamp: nextTimestamp() };
			setMessages((prev) => [...prev, userMsg]);
			setIsLoading(true);

			try {
				let responseText: string;

				if (gravityClawMode) {
					const history: GCMessage[] = [
						...gcHistoryRef.current,
						{ role: "user", content: text },
					];

					const streamKey = nextTimestamp();
					setMessages((prev) => [
						...prev,
						{ role: "assistant", content: "", timestamp: streamKey },
					]);

					let accumulated = "";
					responseText = await gcSend(history, {
						onChunk: (chunk) => {
							accumulated += chunk;
							setMessages((prev) =>
								prev.map((m) =>
									m.timestamp === streamKey ? { ...m, content: accumulated } : m,
								),
							);
						},
					});

					gcHistoryRef.current = [
						...history,
						{ role: "assistant", content: responseText },
					];
				} else {
					responseText = await AgentService.chat(text);
					setMessages((prev) => [
						...prev,
						{ role: "assistant", content: responseText, timestamp: nextTimestamp() },
					]);
					gcHistoryRef.current = [
						...gcHistoryRef.current,
						{ role: "user", content: text },
						{ role: "assistant", content: responseText },
					];
					void loadAgentStatus();
				}

				if (voiceEnabled && responseText) {
					const spoken = toSpokenText(responseText).slice(0, 800);
					if (spoken) await speakRef.current(spoken);
				}
			} catch (err) {
				if ((err as Error).name === "AbortError") return;
				setMessages((prev) => [
					...prev,
					{
						role: "system",
						content: `Error: ${err instanceof Error ? err.message : String(err)}`,
						timestamp: nextTimestamp(),
					},
				]);
			} finally {
				setIsLoading(false);
			}
		},
		[isLoading, gravityClawMode, voiceEnabled, gcSend],
	);

	// ── Voice — defined after sendMessage to avoid circular initialization ───
	// handleTranscript is stable (empty deps); reads latest sendMessage via ref
	const sendMessageRef = useRef(sendMessage);
	sendMessageRef.current = sendMessage;

	const handleTranscript = useCallback((transcript: string) => {
		setInput("");
		void sendMessageRef.current(transcript);
	}, []);

	const voice = useVoice({ onTranscript: handleTranscript });

	// Wire speak into the ref once voice is available
	speakRef.current = voice.speak;

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	useEffect(() => {
		void loadAgentStatus();

		// Restore persisted chat messages from localStorage
		try {
			const saved = localStorage.getItem(CHAT_STORAGE_KEY);
			if (saved) {
				const parsed: ChatMessage[] = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					setMessages(parsed);
					// Rebuild gcHistoryRef from saved messages
					gcHistoryRef.current = parsed
						.filter((m) => m.role === "user" || m.role === "assistant")
						.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
					return;
				}
			}
		} catch {
			// Corrupted storage — fall through to greeting
		}

		const greeting: ChatMessage = {
			role: "assistant",
			content: "Hello! I'm NOVA, your Neural Omnipresent Virtual Assistant. How can I help you today?",
			timestamp: nextTimestamp(),
		};
		setMessages([greeting]);
		gcHistoryRef.current = [{ role: "assistant", content: greeting.content }];
	}, []);

	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Persist messages to localStorage (capped at last 50)
	useEffect(() => {
		if (messages.length === 0) return;
		try {
			const toSave = messages.slice(-MAX_PERSISTED_MESSAGES);
			localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
		} catch {
			// Storage full or unavailable — non-fatal
		}
	}, [messages]);

	// Reset gc history when switching modes so context stays clean
	useEffect(() => {
		gcHistoryRef.current = [];
	}, [gravityClawMode]);

	// Poll for tasks awaiting approval — 5s when tasks exist, 15s when idle,
	// pauses entirely when the tab is hidden (Page Visibility API).
	// Uses setTimeout chains to prevent overlapping polls.
	useEffect(() => {
		let timerId: ReturnType<typeof setTimeout> | null = null;
		let cancelled = false;

		const schedule = (delay: number) => {
			if (cancelled || document.hidden) return;
			timerId = setTimeout(() => void tick(), delay);
		};

		const tick = async () => {
			if (cancelled) return;
			let nextDelay = 15_000;
			try {
				const tasks = await AgentService.getPendingTasks();
				if (!cancelled) {
					setPendingTasks(tasks);
					nextDelay = tasks.length > 0 ? 5_000 : 15_000;
				}
			} catch {
				// non-fatal — panel simply stays hidden on error
			}
			schedule(nextDelay);
		};

		const handleVisibility = () => {
			if (document.hidden) {
				if (timerId) { clearTimeout(timerId); timerId = null; }
			} else {
				// Resume immediately on tab focus
				void tick();
			}
		};

		void tick();
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			cancelled = true;
			if (timerId) clearTimeout(timerId);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, []);

	const loadAgentStatus = async () => {
		try {
			setAgentState(await AgentService.getStatus());
		} catch {
			// non-fatal — sidebar status is cosmetic
		}
	};

	// ── Handlers ──────────────────────────────────────────────────────────────
	const handleSend = () => {
		const text = input.trim();
		if (!text) return;
		setInput("");
		void sendMessage(text);
	};

	const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleScreenshotAnalysis = (analysis: string, imagePath: string) => {
		setMessages((prev) => [
			...prev,
			{
				role: "assistant",
				content: `📸 Screenshot Analysis:\n\n${analysis}\n\nImage: ${imagePath}`,
				timestamp: nextTimestamp(),
			},
		]);
	};

	const handleApproveTask = async (taskId: string) => {
		try {
			await AgentService.approveTask(taskId);
			setPendingTasks((prev) => prev.filter((t) => t.id !== taskId));
			toast({ title: "Task approved", description: "The task has been approved successfully." });
		} catch (err) {
			console.error("Failed to approve task:", err);
			toast({ title: "Failed to approve task", description: String(err), variant: "destructive" });
		}
	};

	const handleRejectTask = async (taskId: string) => {
		try {
			await AgentService.rejectTask(taskId);
			setPendingTasks((prev) => prev.filter((t) => t.id !== taskId));
			toast({ title: "Task rejected", description: "The task has been rejected." });
		} catch (err) {
			console.error("Failed to reject task:", err);
			toast({ title: "Failed to reject task", description: String(err), variant: "destructive" });
		}
	};

	const toggleGravityClawMode = () => {
		if (isLoading) gcAbort();
		setGravityClawMode((prev) => !prev);
	};

	// ── Derived UI ────────────────────────────────────────────────────────────
	const gcClawUrl = (import.meta.env.VITE_GRAVITY_CLAW_URL as string | undefined) ?? "http://localhost:5187";
	const modeLabel = gravityClawMode ? "G-CLAW" : "NOVA";
	const modeBadge = gravityClawMode
		? "text-purple-400 border-purple-500/40 bg-purple-500/10"
		: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10";

	return (
		<div className="container mx-auto px-4 py-8 h-[calc(100vh-100px)] flex gap-6">
			{/* Main Chat Area */}
			<Card className="flex-1 flex flex-col bg-black/40 backdrop-blur-xl border-white/10 overflow-hidden shadow-2xl">

				{/* Header */}
				<div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
					<div className="flex items-center gap-3">
						<div className={`w-10 h-10 rounded-full flex items-center justify-center border ${gravityClawMode ? "bg-purple-500/20 border-purple-500/30" : "bg-cyan-500/20 border-cyan-500/30"}`}>
							<Bot className={`w-6 h-6 ${gravityClawMode ? "text-purple-400" : "text-cyan-400"}`} />
						</div>
						<div>
							<h2 className="font-bold text-white">NOVA Assistant</h2>
							<div className={`flex items-center gap-2 text-xs ${gravityClawMode ? "text-purple-400" : "text-cyan-400"}`}>
								<span className="relative flex h-2 w-2">
									<span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gravityClawMode ? "bg-purple-400" : "bg-cyan-400"}`} />
									<span className={`relative inline-flex rounded-full h-2 w-2 ${gravityClawMode ? "bg-purple-500" : "bg-cyan-500"}`} />
								</span>
								{gravityClawMode ? `GravityClaw · ${gcModel}` : "Online & Ready"}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									onClick={toggleGravityClawMode}
									className={`text-xs font-mono border px-2 h-7 transition-all ${modeBadge}`}
								>
									<Zap className="w-3 h-3 mr-1" />
									{modeLabel}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								{gravityClawMode
									? "Switch to NOVA (Tauri backend)"
									: `Switch to GravityClaw (${gcModel})`}
							</TooltipContent>
						</Tooltip>
						<Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
							<Database className="w-5 h-5" />
						</Button>
						<Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
							<Cpu className="w-5 h-5" />
						</Button>
					</div>
				</div>

				{/* Messages */}
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

				{/* Input */}
				<div className="p-4 border-t border-white/10 bg-white/5">
					<div className="flex gap-2">
						<VoiceBar
							state={voice.state}
							enabled={voiceEnabled}
							onToggleEnabled={() => setVoiceEnabled((v) => !v)}
							onStartListening={voice.startListening}
							onStopListening={voice.stopListening}
							unsupported={!voice.isSupported}
						/>
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder={voiceEnabled ? "Click mic to speak, or type…" : "Type your message…"}
							className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20"
							disabled={isLoading}
						/>
						<ScreenshotButton onAnalysisComplete={handleScreenshotAnalysis} />
						<Button
							onClick={handleSend}
							disabled={!input.trim() || isLoading}
							className={`text-white shadow-lg ${
								gravityClawMode
									? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
									: "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20"
							}`}
						>
							{isLoading ? (
								<Sparkles className="w-4 h-4 animate-spin" />
							) : (
								<Send className="w-4 h-4" />
							)}
						</Button>
					</div>
					{gravityClawMode && (
						<p className="text-xs text-purple-400/50 mt-1.5 pl-1">
							GravityClaw · {gcModel} ·{" "}
							<span className="font-mono">{gcClawUrl}</span>
						</p>
					)}
				</div>
			</Card>

			{/* Sidebar (desktop only) */}
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
		</div>
	);
};

export default ChatInterface;
