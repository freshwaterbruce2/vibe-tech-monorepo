import { Pause, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ControlConsoleProps {
	goal: string;
	setGoal: (goal: string) => void;
	isLoopRunning: boolean;
	isAutoMode: boolean;
	setIsAutoMode: (val: boolean) => void;
	startAgentLoop: () => void;
	stopAgentLoop: () => void;
}

export const ControlConsole = ({
	goal,
	setGoal,
	isLoopRunning,
	isAutoMode,
	setIsAutoMode,
	startAgentLoop,
	stopAgentLoop,
}: ControlConsoleProps) => {
	return (
		<Card className="p-6 border-aura-accent/30 bg-aura-darkBg/90 backdrop-blur-xl hover:shadow-neon-green transition-all duration-300">
			<h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
				<Sparkles className="w-5 h-5 text-aura-neonGreen" />
				Control Console
			</h3>

			<div className="space-y-4">
				<div className="space-y-2">
					<span className="text-xs text-aura-textSecondary uppercase tracking-widest block">Goal Instruction</span>
					<Input
						value={goal}
						onChange={(e) => setGoal(e.target.value)}
						placeholder="e.g. 'Open Notepad and type hello world'"
						className="bg-aura-darkBgLight/50 border-aura-accent/30 text-white placeholder:text-aura-textSecondary focus:border-aura-neonBlue focus:ring-1 focus:ring-aura-neonBlue"
						disabled={isLoopRunning}
					/>
				</div>

				<div className="flex items-center justify-between border-t border-white/10 pt-4">
					<span className="text-xs text-aura-textSecondary uppercase tracking-widest">Auto Mode</span>
					<Button 
						variant="outline" 
						size="sm" 
						onClick={() => setIsAutoMode(!isAutoMode)}
						className={`text-xs ${isAutoMode ? "border-aura-neonGreen text-aura-neonGreen bg-aura-neonGreen/10" : "border-white/20 text-white"}`}
					>
						{isAutoMode ? "ENABLED (AUTO)" : "DISABLED (STEP)"}
					</Button>
				</div>

				<div className="flex gap-2 border-t border-white/10 pt-4">
					{isLoopRunning ? (
						<Button onClick={stopAgentLoop} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
							<Pause className="w-4 h-4 mr-2" /> Stop Loop
						</Button>
					) : (
						<Button onClick={startAgentLoop} disabled={!goal.trim()} className="flex-1 bg-aura-neonGreen hover:bg-aura-neonGreen/80 text-aura-darkBg font-semibold">
							<Play className="w-4 h-4 mr-2" /> Run Loop
						</Button>
					)}
				</div>
			</div>
		</Card>
	);
};
