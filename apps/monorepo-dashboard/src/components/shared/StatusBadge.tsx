// Status badge component for project/service/database health

import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type {
	DatabaseStatus,
	ProjectStatus,
	ServiceHealth,
	ServiceStatus,
} from "../../types";

type Status =
	| ProjectStatus
	| ServiceHealth
	| ServiceStatus
	| DatabaseStatus
	| "connected"
	| "disconnected"
	| "error";

interface StatusBadgeProps {
	status: Status;
	size?: "sm" | "md" | "lg";
	showIcon?: boolean;
	showLabel?: boolean;
}

const statusConfig = {
	healthy: {
		bg: "bg-emerald-500/20",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
		icon: CheckCircle2,
		label: "Healthy",
	},
	warning: {
		bg: "bg-amber-500/20",
		text: "text-amber-400",
		border: "border-amber-500/30",
		icon: AlertTriangle,
		label: "Warning",
	},
	critical: {
		bg: "bg-red-500/20",
		text: "text-red-400",
		border: "border-red-500/30",
		icon: XCircle,
		label: "Critical",
	},
	degraded: {
		bg: "bg-yellow-500/20",
		text: "text-yellow-400",
		border: "border-yellow-500/30",
		icon: AlertTriangle,
		label: "Degraded",
	},
	unhealthy: {
		bg: "bg-red-500/20",
		text: "text-red-400",
		border: "border-red-500/30",
		icon: XCircle,
		label: "Unhealthy",
	},
	connected: {
		bg: "bg-emerald-500/20",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
		icon: CheckCircle2,
		label: "Connected",
	},
	disconnected: {
		bg: "bg-gray-500/20",
		text: "text-gray-400",
		border: "border-gray-500/30",
		icon: XCircle,
		label: "Disconnected",
	},
	error: {
		bg: "bg-red-500/20",
		text: "text-red-400",
		border: "border-red-500/30",
		icon: XCircle,
		label: "Error",
	},
	running: {
		bg: "bg-emerald-500/20",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
		icon: CheckCircle2,
		label: "Running",
	},
	stopped: {
		bg: "bg-gray-500/20",
		text: "text-gray-400",
		border: "border-gray-500/30",
		icon: XCircle,
		label: "Stopped",
	},
	starting: {
		bg: "bg-blue-500/20",
		text: "text-blue-400",
		border: "border-blue-500/30",
		icon: AlertTriangle,
		label: "Starting",
	},
};

const sizeClasses = {
	sm: {
		container: "px-2 py-0.5 text-xs",
		icon: "w-3 h-3",
	},
	md: {
		container: "px-3 py-1 text-sm",
		icon: "w-4 h-4",
	},
	lg: {
		container: "px-4 py-1.5 text-base",
		icon: "w-5 h-5",
	},
};

export function StatusBadge({
	status,
	size = "md",
	showIcon = true,
	showLabel = true,
}: StatusBadgeProps) {
	const config = statusConfig[status as keyof typeof statusConfig];
	const Icon = config.icon;
	const sizeClass = sizeClasses[size];

	return (
		<span
			className={clsx(
				"inline-flex items-center gap-1.5 rounded-full border font-medium",
				config.bg,
				config.text,
				config.border,
				sizeClass.container,
			)}
		>
			{showIcon && <Icon className={sizeClass.icon} />}
			{showLabel && <span>{config.label}</span>}
		</span>
	);
}
