import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ComponentType } from "react";
import type { ConfigStatus, ProjectStatus } from "../data";

export function StatusBadge({
	status,
}: {
	status: ProjectStatus | ConfigStatus;
}) {
	const styles: Record<
		ProjectStatus | ConfigStatus,
		{ bg: string; text: string; icon: ComponentType<{ size?: number }> }
	> = {
		healthy: {
			bg: "bg-emerald-500/20",
			text: "text-emerald-400",
			icon: CheckCircle2,
		},
		warning: {
			bg: "bg-amber-500/20",
			text: "text-amber-400",
			icon: AlertTriangle,
		},
		critical: { bg: "bg-red-500/20", text: "text-red-400", icon: XCircle },
		aligned: {
			bg: "bg-emerald-500/20",
			text: "text-emerald-400",
			icon: CheckCircle2,
		},
		drift: {
			bg: "bg-amber-500/20",
			text: "text-amber-400",
			icon: AlertTriangle,
		},
	};

	const style = styles[status];
	const Icon = style.icon;

	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
		>
			<Icon size={12} />
			{status}
		</span>
	);
}
