import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ActiveWindowInfo } from "@/services/computerUseService";

interface StatusPanelProps {
	loopStatus: string;
	focusedWindow: ActiveWindowInfo | null;
	error: string | null;
}

export const StatusPanel = ({
	loopStatus,
	focusedWindow,
	error,
}: StatusPanelProps) => {
	return (
		<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl">
			<h3 className="text-lg font-bold text-white mb-4 uppercase">
				Agent Status
			</h3>

			<div className="space-y-4">
				<div className="flex justify-between items-center text-sm">
					<span className="text-aura-textSecondary">Active Loop State</span>
					<Badge className={`uppercase ${
						loopStatus === "observing" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
						loopStatus === "analyzing" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
						loopStatus === "awaiting_consent" ? "bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse" :
						loopStatus === "simulating" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
						"bg-white/10 text-white border-white/20"
					}`}>
						{loopStatus}
					</Badge>
				</div>
				
				{focusedWindow && (
					<div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
						<span className="text-aura-textSecondary uppercase tracking-widest block">Focused Window</span>
						<div className="flex justify-between">
							<span className="text-aura-textSecondary">Process</span>
							<span className="text-white font-mono">{focusedWindow.process_name}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-aura-textSecondary">Title</span>
							<span className="text-white truncate max-w-[150px] font-mono">{focusedWindow.title || "untitled"}</span>
						</div>
					</div>
				)}

				{error && (
					<div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
						<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
						<span className="break-all">{error}</span>
					</div>
				)}
			</div>
		</Card>
	);
};
