import { Bot, Code2, PenTool } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface AgentSelectorProps {
	currentAgent: string;
	onAgentChange: (agentId: string) => void;
}

export const AgentSelector = ({
	currentAgent,
	onAgentChange,
}: AgentSelectorProps) => {
	return (
		<Select value={currentAgent} onValueChange={onAgentChange}>
			<SelectTrigger className="w-[180px] bg-black/50 border-purple-500/30 text-purple-100">
				<SelectValue placeholder="Select Agent" />
			</SelectTrigger>
			<SelectContent className="bg-black/90 border-purple-500/30 text-purple-100">
				<SelectItem value="nova">
					<div className="flex items-center gap-2">
						<Bot className="w-4 h-4 text-purple-400" />
						<span>NOVA (General)</span>
					</div>
				</SelectItem>
				<SelectItem value="architect">
					<div className="flex items-center gap-2">
						<PenTool className="w-4 h-4 text-blue-400" />
						<span>Architect</span>
					</div>
				</SelectItem>
				<SelectItem value="coder">
					<div className="flex items-center gap-2">
						<Code2 className="w-4 h-4 text-green-400" />
						<span>Coder</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
};
