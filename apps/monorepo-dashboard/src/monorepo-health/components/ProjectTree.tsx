import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import type { ProjectItem } from "../data";
import { StatusBadge } from "./StatusBadge";

export function ProjectTree({
	category,
	icon: Icon,
	items,
	color,
	expanded,
	onToggle,
}: {
	category: string;
	icon: LucideIcon;
	items: ProjectItem[];
	color: string;
	expanded: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="mb-3">
			<button
				onClick={onToggle}
				className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${color} hover:brightness-110 transition-all`}
				type="button"
			>
				{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
				<Icon size={16} />
				<span className="font-medium">{category}</span>
				<span className="ml-auto text-xs opacity-70">
					{items.length} projects
				</span>
			</button>

			{expanded && (
				<div className="mt-1 ml-4 space-y-1">
					{items.map((item) => (
						<div
							key={item.name}
							className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
							title={item.path}
						>
							<div className="flex items-center gap-2">
								<Folder
									size={14}
									className="text-slate-400 group-hover:text-white transition-colors"
								/>
								<span className="text-sm">{item.name}</span>
								<span className="text-xs text-slate-500">{item.type}</span>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-xs text-slate-400">{item.deps} deps</span>
								<StatusBadge status={item.status} />
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
