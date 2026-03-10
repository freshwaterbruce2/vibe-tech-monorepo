import type { Severity } from "../data";

export function SeverityBadge({ severity }: { severity: Severity }) {
	const colors: Record<Severity, string> = {
		patch: "bg-slate-500/20 text-slate-300",
		minor: "bg-blue-500/20 text-blue-400",
		major: "bg-orange-500/20 text-orange-400",
	};

	return (
		<span
			className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}
		>
			{severity}
		</span>
	);
}
