import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertCircle,
	Command,
	Send,
	Sparkles,
	Terminal,
} from "lucide-react";
import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrchestratorService } from "@/services/OrchestratorService";

const Orchestrator = () => {
	const [prompt, setPrompt] = useState("");
	const [isExecuting, setIsExecuting] = useState(false);
	const [history, setHistory] = useState<
		{ prompt: string; result: string; timestamp: string }[]
	>([]);
	const [error, setError] = useState<string | null>(null);

	const handleExecute = async () => {
		if (!prompt.trim()) return;

		setIsExecuting(true);
		setError(null);
		const startTime = new Date();

		try {
			const result = await OrchestratorService.orchestrate(prompt);
			setHistory((prev) => [
				{
					prompt,
					result,
					timestamp: startTime.toLocaleTimeString(),
				},
				...prev,
			]);
			setPrompt("");
		} catch (err) {
			setError(String(err));
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<PageLayout
			title="Nova Hands"
			description="Desktop Orchestration & Automation. Use natural language to control your environment."
		>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Control Panel */}
				<div className="lg:col-span-2 space-y-6">
					<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl hover:shadow-neon-blue transition-all duration-300">
						<div className="flex items-center gap-2 mb-6 text-aura-neonBlue">
							<Command className="w-6 h-6" />
							<h2 className="text-xl font-bold tracking-tight text-white uppercase">
								Command Input
							</h2>
						</div>

						<div className="space-y-4">
							<div className="relative">
								<Input
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter") { void handleExecute(); } }}
									placeholder="e.g., 'Open a browser and search for the latest Rust news'"
									className="pr-12 bg-aura-darkBgLight/50 border-aura-accent/30 text-white placeholder:text-aura-textSecondary focus:border-aura-neonBlue focus:ring-1 focus:ring-aura-neonBlue"
									disabled={isExecuting}
								/>
								<Button
									onClick={() => { void handleExecute(); }}
									disabled={isExecuting || !prompt.trim()}
									className="absolute right-1 top-1 h-8 w-8 p-0 bg-aura-neonBlue hover:bg-aura-neonBlue/80 text-aura-darkBg"
								>
									<Send className="w-4 h-4" />
								</Button>
							</div>

							{error && (
								<div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-pulse-glow">
									<AlertCircle className="w-4 h-4" />
									<span>{error}</span>
								</div>
							)}

							<div className="flex flex-wrap gap-2">
								<span className="text-xs text-aura-textSecondary uppercase tracking-widest mt-1 mr-2">
									Suggestions:
								</span>
								{[
									"Check CPU load",
									"List current git branches",
									"Open Vibe Code Studio",
								].map((s) => (
									<Badge
										key={s}
										variant="outline"
										className="cursor-pointer border-aura-neonBlue/30 hover:bg-aura-neonBlue/10 transition-colors"
										onClick={() => setPrompt(s)}
									>
										{s}
									</Badge>
								))}
							</div>
						</div>
					</Card>

					{/* Execution History */}
					<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl">
						<div className="flex items-center gap-2 mb-6 text-aura-neonPurple">
							<Terminal className="w-6 h-6" />
							<h2 className="text-xl font-bold tracking-tight text-white uppercase">
								Execution Log
							</h2>
						</div>

						<ScrollArea className="h-[400px] pr-4">
							<AnimatePresence initial={false}>
								{history.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-aura-textSecondary opacity-50 space-y-4">
										<Activity className="w-12 h-12" />
										<p>No commands executed yet.</p>
									</div>
								) : (
									<div className="space-y-4">
										{history.map((item, i) => (
											<motion.div
												key={i}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												className="p-4 rounded-lg bg-aura-darkBgLight/30 border border-aura-accent/20 space-y-2 group"
											>
												<div className="flex items-center justify-between">
													<span className="text-sm font-semibold text-aura-neonBlue font-mono">{`> ${item.prompt}`}</span>
													<span className="text-xs text-aura-textSecondary">
														{item.timestamp}
													</span>
												</div>
												<div className="text-sm text-white/90 font-mono whitespace-pre-wrap pl-4 border-l-2 border-aura-neonPurple/30">
													{item.result}
												</div>
											</motion.div>
										))}
									</div>
								)}
							</AnimatePresence>
						</ScrollArea>
					</Card>
				</div>

				{/* Status Sidebar */}
				<div className="space-y-6">
					<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl hover:shadow-neon-green transition-all duration-300">
						<h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
							<Sparkles className="w-5 h-5 text-aura-neonGreen" />
							Orchestrator Status
						</h3>
						<div className="space-y-4">
							<div className="flex justify-between items-center text-sm">
								<span className="text-aura-textSecondary">Engine</span>
								<span className="text-white font-mono">Claude-Sonnet-4.5</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<span className="text-aura-textSecondary">Execution Node</span>
								<Badge className="bg-aura-neonBlue/10 text-aura-neonBlue border-aura-neonBlue/30">
									Sidecar Active
								</Badge>
							</div>
							<div className="flex justify-between items-center text-sm">
								<span className="text-aura-textSecondary">System Access</span>
								<Badge className="bg-aura-neonGreen/10 text-aura-neonGreen border-aura-neonGreen/30">
									Granted
								</Badge>
							</div>
						</div>
					</Card>

					<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl">
						<h3 className="text-lg font-bold text-white mb-4 uppercase">
							Capabilities
						</h3>
						<ul className="space-y-3 text-sm text-aura-textSecondary">
							<li className="flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-aura-neonBlue" />
								File Management
							</li>
							<li className="flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-aura-neonPurple" />
								Shell Command Execution
							</li>
							<li className="flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-aura-neonPink" />
								Browser Automation
							</li>
							<li className="flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-aura-neonGreen" />
								Workspace Orchestration
							</li>
						</ul>
					</Card>
				</div>
			</div>
		</PageLayout>
	);
};

export default Orchestrator;
