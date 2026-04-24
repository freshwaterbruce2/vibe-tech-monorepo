export interface GuidanceItem {
	id: string;
	category: "next_steps" | "doing_right" | "at_risk";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	action?: {
		action_type: string;
		payload: Record<string, unknown>;
	};
	created_at: number;
}

export interface GuidanceResponse {
	next_steps: GuidanceItem[];
	doing_right: GuidanceItem[];
	at_risk: GuidanceItem[];
	generated_at: number;
	context_summary: string;
}

interface GuidancePanelProps {
	title: string;
	items: GuidanceItem[];
	type?: "default" | "success" | "warning";
	onAction?: (item: GuidanceItem) => void;
}

export function GuidancePanel({
	title,
	items,
	type = "default",
	onAction,
}: GuidancePanelProps) {
	const typeColors = {
		default: "border-blue-500/30 bg-blue-500/10",
		success: "border-green-500/30 bg-green-500/10",
		warning: "border-yellow-500/30 bg-yellow-500/10",
	};

	const priorityBadge = (priority: string) => {
		const colors: Record<string, string> = {
			low: "bg-gray-500/20 text-gray-300 border-gray-500/30",
			medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
			high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
			critical: "bg-red-500/20 text-red-300 border-red-500/30",
		};
		return (
			<span
				className={`text-xs px-2 py-0.5 rounded border ${colors[priority] ?? colors.low}`}
			>
				{priority}
			</span>
		);
	};

	return (
		<div className={`border rounded-lg p-4 ${typeColors[type]}`}>
			<h3
				className={`text-lg font-semibold mb-3 ${type === "warning" ? "text-yellow-400" : type === "success" ? "text-green-400" : "text-blue-400"}`}
			>
				{title}
			</h3>
			{items.length === 0 ? (
				<p className="text-white/40 italic">No items</p>
			) : (
				<ul className="space-y-3">
					{items.map((item) => (
						<li key={item.id} className="flex items-start gap-2">
							<span className="mt-1 text-white/50">•</span>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-1">
									<span className="font-medium text-white/90">
										{item.title}
									</span>
									{priorityBadge(item.priority)}
								</div>
								<p className="text-sm text-gray-300">{item.description}</p>
								{item.action && onAction && (
									<button
										onClick={() => onAction(item)}
										className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 border border-white/10"
									>
										Take action →
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
