import { Bot, Cpu, Database, Send, Sparkles, Zap } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ScreenshotButton } from "@/components/ScreenshotButton";
import { VoiceBar } from "@/components/chat/VoiceBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGravityClaw, type GCMessage } from "@/hooks/useGravityClaw";
import { useVoice } from "@/hooks/useVoice";
import { AgentService, type PendingTask } from "@/services/AgentService";
import type { AgentState, ChatMessage } from "@/types/agent";
import { Store } from "@tauri-apps/plugin-store";
import { ChatSidebar } from "./chat/ChatSidebar";
import { MessageList } from "./chat/MessageList";

const CHAT_STORAGE_KEY = "nova-chat-messages";
const CHAT_STORE_PATH = "store.json";
const MAX_PERSISTED_MESSAGES = 50;

/** Strips markdown syntax so TTS reads naturally */
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
	const [gravityClawMode, setGravityClawMode] = useState(false);
	const [voiceEnabled, setVoiceEnabled] = useState(false);

	const gcHistoryRef = useRef<GCMessage[]>([]);
	const msgCounterRef = useRef(0);
	const nextTimestamp = () => {
		const ts = Date.now();
		if (ts <= msgCounterRef.current) return ++msgCounterRef.current;
		msgCounterRef.current = ts;
		return ts;
	};

	const scrollRef = useRef<HTMLDivElement>(null);
	const { sendMessage: gcSend, isStreaming, abort: gcAbort, model: gcModel } = useGravityClaw();
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
					gcHistoryRef.current = [...history, { role: "assistant", content: responseText }];
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
					{ role: "system", content: `Error: ${err instanceof Error ? err.message : String(err)}`, timestamp: nextTimestamp() },
				]);
			} finally {
				setIsLoading(false);
			}
		},
		[isLoading, gravityClawMode, voiceEnabled, gcSend],
	);

	// ── Voice ────────────────────────────────────────────────────────────────
	const sendMessageRef = useRef(sendMessage);
	sendMessageRef.current = sendMessage;
	const handleTranscript = useCallback((transcript: string) => {
		setInput("");
		void sendMessageRef.current(transcript);
	}, []);
	const voice = useVoice({ onTranscript: handleTranscript });
	speakRef.current = voice.speak;

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	useEffect(() => {
		void loadAgentStatus();
		const loadMessages = async () => {
			try {
				const store = await Store.load(CHAT_STORE_PATH);
				const saved = await store.get<string>(CHAT_STORAGE_KEY);
				if (saved) {
					const parsed: ChatMessage[] = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						setMessages(parsed);
						gcHistoryRef.current = parsed
							.filter((m) => m.role === "user" || m.role === "assistant")
							.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
						return;
					}
				}
			} catch { /* corrupted storage */ }

			const greeting: ChatMessage = {
				role: "assistant",
				content: "Hello! I'm NOVA, your Neural Omnipresent Virtual Assistant. How can I help you today?",
				timestamp: nextTimestamp(),
			};
			setMessages([greeting]);
			gcHistoryRef.current = [{ role: "assistant", content: greeting.content }];
		};

		void loadMessages();
	}, []);

	useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

	useEffect(() => {
		if (messages.length === 0) return;
		const saveMessages = async () => {
			try {
				const store = await Store.load(CHAT_STORE_PATH);
				const toSave = messages.slice(-MAX_PERSISTED_MESSAGES);
				await store.set(CHAT_STORAGE_KEY, JSON.stringify(toSave));
				await store.save();
			} catch { /* non-fatal */ }
		};

		void saveMessages();
	}, [messages]);

	useEffect(() => { gcHistoryRef.current = []; }, [gravityClawMode]);

	// ── Task polling ─────────────────────────────────────────────────────────
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
				if (!cancelled) { setPendingTasks(tasks); nextDelay = tasks.length > 0 ? 5_000 : 15_000; }
			} catch { /* non-fatal */ }
			schedule(nextDelay);
		};
		const handleVisibility = () => {
			if (document.hidden) { if (timerId) { clearTimeout(timerId); timerId = null; } }
			else { void tick(); }
		};
		void tick();
		document.addEventListener("visibilitychange", handleVisibility);
		return () => { cancelled = true; if (timerId) clearTimeout(timerId); document.removeEventListener("visibilitychange", handleVisibility); };
	}, []);

	const loadAgentStatus = async () => {
		try { setAgentState(await AgentService.getStatus()); } catch { /* cosmetic */ }
	};

	// ── Handlers ──────────────────────────────────────────────────────────────
	const handleSend = () => { const text = input.trim(); if (!text) return; setInput(""); void sendMessage(text); };
	const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
	const handleScreenshotAnalysis = (analysis: string, imagePath: string) => {
		setMessages((prev) => [...prev, { role: "assistant", content: `📸 Screenshot Analysis:\n\n${analysis}\n\nImage: ${imagePath}`, timestamp: nextTimestamp() }]);
	};
	const toggleGravityClawMode = () => { if (isLoading) gcAbort(); setGravityClawMode((prev) => !prev); };

	// ── Derived UI ────────────────────────────────────────────────────────────
	const gcClawUrl = (import.meta.env.VITE_GRAVITY_CLAW_URL as string | undefined) ?? "http://localhost:5187";
	const modeLabel = gravityClawMode ? "G-CLAW" : "NOVA";
	const modeBadge = gravityClawMode
		? "text-purple-400 border-purple-500/40 bg-purple-500/10"
		: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10";

	return (
		<div className="container mx-auto px-4 py-8 h-[calc(100vh-100px)] flex gap-6">
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
								<Button variant="ghost" size="sm" onClick={toggleGravityClawMode}
									className={`text-xs font-mono border px-2 h-7 transition-all ${modeBadge}`}>
									<Zap className="w-3 h-3 mr-1" />{modeLabel}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								{gravityClawMode ? "Switch to NOVA (Tauri backend)" : `Switch to GravityClaw (${gcModel})`}
							</TooltipContent>
						</Tooltip>
						<Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10"><Database className="w-5 h-5" /></Button>
						<Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10"><Cpu className="w-5 h-5" /></Button>
					</div>
				</div>

				<MessageList messages={messages} modeLabel={modeLabel} gravityClawMode={gravityClawMode}
					isLoading={isLoading} isStreaming={isStreaming} scrollRef={scrollRef} />

				{/* Input */}
				<div className="p-4 border-t border-white/10 bg-white/5">
					<div className="flex gap-2">
						<VoiceBar state={voice.state} enabled={voiceEnabled} onToggleEnabled={() => setVoiceEnabled((v) => !v)}
							onStartListening={voice.startListening} onStopListening={voice.stopListening} unsupported={!voice.isSupported} />
						<Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyPress}
							placeholder={voiceEnabled ? "Click mic to speak, or type…" : "Type your message…"}
							className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20" disabled={isLoading} />
						<ScreenshotButton onAnalysisComplete={handleScreenshotAnalysis} />
						<Button onClick={handleSend} disabled={!input.trim() || isLoading}
							className={`text-white shadow-lg ${gravityClawMode ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20" : "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20"}`}>
							{isLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						</Button>
					</div>
					{gravityClawMode && (
						<p className="text-xs text-purple-400/50 mt-1.5 pl-1">
							GravityClaw · {gcModel} · <span className="font-mono">{gcClawUrl}</span>
						</p>
					)}
				</div>
			</Card>

			<ChatSidebar agentState={agentState} pendingTasks={pendingTasks} onTasksChange={setPendingTasks} />
		</div>
	);
};

export default ChatInterface;
