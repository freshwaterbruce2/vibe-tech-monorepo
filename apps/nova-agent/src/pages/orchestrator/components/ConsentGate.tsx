import { Check, Keyboard, MousePointer, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AgentAction } from "../../nova-hands/types";

interface ConsentGateProps {
	nextAction: AgentAction;
	currentThought: string;
	handleRejectAction: () => void;
	handleApproveAction: (action: AgentAction) => void;
}

export const ConsentGate = ({
	nextAction,
	currentThought,
	handleRejectAction,
	handleApproveAction,
}: ConsentGateProps) => {
	return (
		<Card className="p-6 border-aura-neonPurple bg-aura-darkBg/95 backdrop-blur-xl shadow-neon-purple animate-pulse-glow">
			<div className="flex items-center gap-2 mb-4 text-aura-neonPurple">
				<Shield className="w-5 h-5" />
				<h3 className="text-lg font-bold text-white uppercase">
					Pending Consent
				</h3>
			</div>

			<div className="space-y-4">
				<div className="p-3 rounded bg-white/5 border border-white/10 space-y-2">
					<span className="text-xs text-aura-textSecondary uppercase tracking-widest block">Agent Thought</span>
					<p className="text-xs text-white/90 italic">"{currentThought}"</p>
				</div>

				<div className="p-3 rounded bg-white/5 border border-white/10 space-y-2">
					<span className="text-xs text-aura-textSecondary uppercase tracking-widest block">Action Intent</span>
					<div className="flex items-center gap-2 text-sm font-mono text-aura-neonPurple">
						{nextAction.type === "mouse" ? (
							<>
								<MousePointer className="w-4 h-4" />
								<span>{nextAction.action} at ({nextAction.x}, {nextAction.y})</span>
							</>
						) : nextAction.type === "keyboard" ? (
							<>
								<Keyboard className="w-4 h-4" />
								<span>{nextAction.action}: {nextAction.text ?? nextAction.key}</span>
							</>
						) : (
							<span>Complete Task</span>
						)}
					</div>
				</div>

				<div className="flex gap-2 pt-2">
					<Button onClick={handleRejectAction} className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10" variant="outline">
						<X className="w-4 h-4 mr-1" /> Reject
					</Button>
					<Button onClick={() => handleApproveAction(nextAction)} className="flex-1 bg-aura-neonPurple hover:bg-aura-neonPurple/80 text-white font-semibold">
						<Check className="w-4 h-4 mr-1" /> Approve
					</Button>
				</div>
			</div>
		</Card>
	);
};
