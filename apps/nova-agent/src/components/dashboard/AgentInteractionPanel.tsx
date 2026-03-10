import { Cpu } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/hooks/useNovaData";
import { MessageBubble } from "./MessageBubble"; // Import the new bubble component

interface Props {
	history: AgentMessage[];
	onSend: (text: string) => void;
	isProcessing: boolean;
}

export const AgentInteractionPanel = ({
	history,
	onSend,
	isProcessing,
}: Props) => {
	const [input, setInput] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [history]);

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim()) {
				onSend(input);
				setInput("");
			}
		}
	};

	return (
		<>
			{/* Message Stream */}
			<div className="flex-1 overflow-y-auto p-6 space-y-8">
				{/* Intro / Welcome Message */}
				{history.length === 0 && (
					<div className="h-full flex items-center justify-center opacity-20 pointer-events-none select-none">
						<div className="text-center font-mono">
							<div className="text-6xl font-black text-zinc-800 mb-4">NOVA</div>
							<div className="text-sm text-zinc-600 tracking-[0.5em]">
								SYSTEM ONLINE
							</div>
						</div>
					</div>
				)}

				{history.map((msg, idx) => (
					// Use index as fallback key if id is missing/duplicate in dev
					<MessageBubble key={msg.id ?? idx} message={msg} />
				))}

				{/* Processing Indicator (The "Thinking" State) */}
				{isProcessing && (
					<div className="flex flex-col max-w-[85%] mr-auto animate-pulse">
						<div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest font-mono text-green-500/50">
							<Cpu size={10} />
							<span>NOVA_CORE</span>
							<span className="opacity-50">::</span>
							<span>COMPUTING</span>
						</div>
						<div className="p-4 border border-green-500/20 bg-green-950/5 rounded-sm">
							<div className="flex gap-1">
								<div
									className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
									style={{ animationDelay: "0ms" }}
								></div>
								<div
									className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
									style={{ animationDelay: "150ms" }}
								></div>
								<div
									className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
									style={{ animationDelay: "300ms" }}
								></div>
							</div>
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>

			{/* Input Command Line */}
			<div className="h-auto min-h-[80px] border-t border-zinc-800 bg-black/90 p-4">
				<div className="flex gap-3 h-full">
					<div className="pt-2 text-green-500 animate-pulse">{">"}</div>
					<textarea
						id="chat-input"
						name="chatInput"
						aria-label="Input Directive"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Input Directive..."
						className="w-full h-full bg-transparent border-none outline-none resize-none text-green-400 font-mono text-sm placeholder-zinc-700 focus:ring-0"
						autoFocus
					/>
				</div>
			</div>
		</>
	);
};
