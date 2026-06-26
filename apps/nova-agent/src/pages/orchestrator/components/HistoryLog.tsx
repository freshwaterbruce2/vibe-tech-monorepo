import { AnimatePresence, motion } from "framer-motion";
import { Activity, Keyboard, MousePointer, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryItem } from "../../nova-hands/types";

interface HistoryLogProps {
	history: HistoryItem[];
}

export const HistoryLog = ({ history }: HistoryLogProps) => {
	return (
		<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl">
			<div className="flex items-center gap-2 mb-4 text-aura-neonPurple">
				<Terminal className="w-6 h-6" />
				<h2 className="text-xl font-bold tracking-tight text-white uppercase">
					History Log
				</h2>
			</div>

			<ScrollArea className="h-[250px] pr-4">
				<AnimatePresence initial={false}>
					{history.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-aura-textSecondary opacity-50 py-12">
							<Activity className="w-12 h-12 mb-2" />
							<p>No actions recorded yet.</p>
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
										<div className="flex items-center gap-2">
											{item.type === "mouse" ? (
												<MousePointer className="w-4 h-4 text-cyan-400" />
											) : (
												<Keyboard className="w-4 h-4 text-purple-400" />
											)}
											<span className="text-sm font-semibold text-white font-mono">{item.detail}</span>
										</div>
										<span className="text-xs text-aura-textSecondary">
											{item.timestamp}
										</span>
									</div>
									<p className="text-xs text-aura-textSecondary italic">
										{item.thought}
									</p>
								</motion.div>
							))}
						</div>
					)}
				</AnimatePresence>
			</ScrollArea>
		</Card>
	);
};
