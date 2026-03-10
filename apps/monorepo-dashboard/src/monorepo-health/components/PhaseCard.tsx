import { CheckCircle2 } from "lucide-react";

export function PhaseCard({
	phase,
	title,
	description,
	active,
	completed,
	items,
}: {
	phase: number;
	title: string;
	description: string;
	active: boolean;
	completed: boolean;
	items?: string[];
}) {
	return (
		<div
			className={`p-4 rounded-xl border transition-all duration-500 ${
				active
					? "bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/50 shadow-lg shadow-violet-500/20"
					: completed
						? "bg-emerald-500/10 border-emerald-500/30"
						: "bg-white/5 border-white/10"
			}`}
		>
			<div className="flex items-center gap-3 mb-3">
				<div
					className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
						active
							? "bg-violet-500 text-white"
							: completed
								? "bg-emerald-500 text-white"
								: "bg-slate-600 text-slate-300"
					}`}
				>
					{completed ? <CheckCircle2 size={16} /> : phase}
				</div>
				<div>
					<h4 className="font-semibold">{title}</h4>
					<p className="text-xs text-slate-400">{description}</p>
				</div>
			</div>

			{active && items && (
				<div className="space-y-2 mt-3">
					{items.map((item) => (
						<div key={item} className="flex items-center gap-2 text-sm">
							<div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
							<span className="text-slate-300">{item}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
