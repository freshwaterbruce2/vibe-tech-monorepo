import { Brain, CheckCircle2, FileCode, Terminal, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime, type LearningEvent } from "@/hooks/useNovaData";

interface LearningMemoryProps {
	learningEvents: LearningEvent[];
}

export const LearningMemory = ({ learningEvents }: LearningMemoryProps) => {
	const getIcon = (type: string) => {
		switch (type) {
			case "build_success":
			case "test_pass":
			case "fix_applied":
				return <CheckCircle2 className="w-4 h-4 text-green-400" />;
			case "build_failure":
			case "error_recovery":
				return <XCircle className="w-4 h-4 text-red-400" />;
			case "code_edit":
				return <FileCode className="w-4 h-4 text-blue-400" />;
			default:
				return <Terminal className="w-4 h-4 text-gray-400" />;
		}
	};

	const getBadges = (event: LearningEvent) => {
		try {
			if (!event.metadata) return null;
			const meta = JSON.parse(event.metadata);
			return Object.entries(meta)
				.slice(0, 2)
				.map(([k, v]) => (
					<Badge
						variant="outline"
						className="text-xs border-zinc-800 text-zinc-500"
						key={k}
					>
						{k}: {String(v)}
					</Badge>
				));
		} catch {
			return null;
		}
	};

	return (
		<Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-6 h-[400px] flex flex-col">
			<h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
				<Brain className="w-5 h-5 text-purple-400" />
				Learning Memory Stream
			</h2>
			<ScrollArea className="flex-1 pr-4">
				<div className="space-y-4">
					{learningEvents.length === 0 ? (
						<div className="text-zinc-500 text-center py-8">
							No learning events recorded yet.
						</div>
					) : (
						learningEvents.map((event) => (
							<div
								key={event.id}
								className="relative pl-6 pb-2 border-l border-zinc-800 last:border-0"
							>
								<div className="absolute -left-[9px] top-0 bg-black">
									{getIcon(event.event_type)}
								</div>
								<div className="mb-1 flex items-center justify-between">
									<span className="text-sm font-medium text-zinc-300 font-mono">
										{event.event_type.toUpperCase()}
									</span>
									<span className="text-xs text-zinc-600">
										{formatRelativeTime(event.timestamp)}
									</span>
								</div>
								<p className="text-sm text-zinc-400 mb-2">
									{event.context ?? event.outcome}
								</p>
								<div className="flex gap-2">{getBadges(event)}</div>
							</div>
						))
					)}
				</div>
			</ScrollArea>
		</Card>
	);
};
