// Individual service status card with health check and restart

import {
	Activity,
	AlertCircle,
	CheckCircle2,
	Clock,
	ExternalLink,
	RefreshCw,
	Server,
} from "lucide-react";
import { useState } from "react";
import type { Service } from "../../types";
import { StatusBadge } from "../shared/StatusBadge";

interface ServiceCardProps {
	service: Service;
	onRestart: (serviceName: string) => void;
}

export function ServiceCard({ service, onRestart }: ServiceCardProps) {
	const [isRestarting, setIsRestarting] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const handleRestart = async () => {
		if (!showConfirm) {
			setShowConfirm(true);
			return;
		}

		setIsRestarting(true);
		setShowConfirm(false);

		try {
			onRestart(service.name);
			// Wait for restart confirmation (simulated)
			await new Promise((resolve) => setTimeout(resolve, 2000));
		} finally {
			setIsRestarting(false);
		}
	};

	const isRunning = service.status === "running";
	const isHealthy = service.health === "healthy";
	const hasHealthCheck = service.healthCheckUrl !== undefined;

	return (
		<div
			className={`bg-secondary/20 border rounded-lg p-5 transition-all ${
				isRunning
					? "border-emerald-500/30 hover:border-emerald-500/50"
					: "border-border hover:border-border/80"
			}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-lg ${isRunning ? "bg-emerald-500/20" : "bg-gray-500/20"}`}
					>
						<Server
							className={`w-5 h-5 ${isRunning ? "text-emerald-400" : "text-gray-400"}`}
						/>
					</div>
					<div>
						<h3 className="font-semibold text-lg">{service.name}</h3>
						<p className="text-sm text-muted-foreground">Port {service.port}</p>
					</div>
				</div>
				<StatusBadge status={service.status} size="sm" />
			</div>

			{/* Service Details Grid */}
			<div className="grid grid-cols-2 gap-3 mb-4">
				{/* Process ID */}
				{service.pid && (
					<div className="flex items-center gap-2 text-sm">
						<Activity className="w-4 h-4 text-muted-foreground" />
						<span className="text-muted-foreground">PID:</span>
						<span className="font-mono">{service.pid}</span>
					</div>
				)}

				{/* Uptime */}
				{service.uptime && (
					<div className="flex items-center gap-2 text-sm">
						<Clock className="w-4 h-4 text-muted-foreground" />
						<span className="text-muted-foreground">Uptime:</span>
						<span className="font-mono">{formatUptime(service.uptime)}</span>
					</div>
				)}
			</div>

			{/* Health Check Status */}
			{hasHealthCheck && service.health && (
				<div
					className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
						isHealthy
							? "bg-emerald-500/10 border border-emerald-500/20"
							: "bg-red-500/10 border border-red-500/20"
					}`}
				>
					{isHealthy ? (
						<CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
					) : (
						<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
					)}
					<span
						className={`text-sm ${isHealthy ? "text-emerald-300" : "text-red-300"}`}
					>
						{isHealthy ? "Health check passing" : "Health check failing"}
					</span>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex items-center gap-2">
				{/* Restart Button */}
				{showConfirm ? (
					<div className="flex items-center gap-2 flex-1">
						<button
							onClick={handleRestart}
							disabled={isRestarting}
							className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isRestarting ? "Restarting..." : "Confirm Restart"}
						</button>
						<button
							onClick={() => setShowConfirm(false)}
							className="px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors"
						>
							Cancel
						</button>
					</div>
				) : (
					<>
						<button
							onClick={handleRestart}
							disabled={isRestarting}
							className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<RefreshCw
								className={`w-4 h-4 ${isRestarting ? "animate-spin" : ""}`}
							/>
							<span className="text-sm font-medium">Restart</span>
						</button>

						{/* Open URL Button */}
						{isRunning && (
							<a
								href={`http://localhost:${service.port}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors"
							>
								<ExternalLink className="w-4 h-4" />
								<span className="text-sm font-medium">Open</span>
							</a>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// Helper function to format uptime
function formatUptime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}
