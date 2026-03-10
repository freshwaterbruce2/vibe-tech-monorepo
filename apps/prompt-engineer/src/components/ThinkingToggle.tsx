import { Brain, Sparkles, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ThinkingToggleProps {
	enabled: boolean;
	onChange: (enabled: boolean) => void;
}

export function ThinkingToggle({ enabled, onChange }: ThinkingToggleProps) {
	return (
		<div className="flex flex-col gap-2">
			<label className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
				🧠 Extended Thinking
			</label>
			<div
				className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 cursor-pointer select-none ${
					enabled
						? "bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 border-violet-200 shadow-md shadow-violet-100"
						: "bg-white/50 border-gray-200 hover:border-violet-200 hover:bg-violet-50/30"
				}`}
				onClick={() => onChange(!enabled)}
			>
				<div className="relative">
					<Switch
						checked={enabled}
						onCheckedChange={onChange}
						className={`${
							enabled
								? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-500"
								: ""
						}`}
					/>
					{enabled && (
						<Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-pulse" />
					)}
				</div>
				<div
					className={`p-2 rounded-lg transition-all duration-500 ${
						enabled
							? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 scale-110"
							: "bg-gray-100 text-gray-400"
					}`}
				>
					<Brain
						className={`h-5 w-5 transition-transform duration-500 ${enabled ? "animate-pulse" : ""}`}
					/>
				</div>
				<div className="flex flex-col">
					<span
						className={`text-sm font-medium transition-colors ${
							enabled ? "text-violet-700" : "text-gray-600"
						}`}
					>
						{enabled ? "Deep Reasoning" : "Standard Mode"}
					</span>
					<span className="text-xs text-muted-foreground flex items-center gap-1">
						{enabled ? (
							<>
								<Zap className="h-3 w-3 text-amber-500" />
								Chain-of-thought active
							</>
						) : (
							"Click to enable reasoning"
						)}
					</span>
				</div>
				{enabled && (
					<div className="ml-auto">
						<span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">
							✨ PRO
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
