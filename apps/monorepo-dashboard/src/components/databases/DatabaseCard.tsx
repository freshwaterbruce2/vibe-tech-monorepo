// Individual database status card with health metrics and actions

import {
	AlertCircle,
	BarChart3,
	CheckCircle2,
	Database,
	HardDrive,
	Table,
	Wrench,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { useDatabaseHealth } from "../../hooks/useDatabases";
import type { Database as DatabaseType } from "../../types";
import { StatusBadge } from "../shared/StatusBadge";

interface DatabaseCardProps {
	database: DatabaseType;
	onVacuum: (dbPath: string) => void;
	onAnalyze: (dbPath: string) => void;
	isVacuuming: boolean;
	isAnalyzing: boolean;
}

export function DatabaseCard({
	database,
	onVacuum,
	onAnalyze,
	isVacuuming,
	isAnalyzing,
}: DatabaseCardProps) {
	const [showActions, setShowActions] = useState(false);

	const isConnected = database.status === "connected";
	const healthQuery = useDatabaseHealth(database.path);
	const hasHealth = Boolean(healthQuery.data);
	const isHealthy = Boolean(
		healthQuery.data?.walMode && healthQuery.data?.integrityCheck,
	);

	return (
		<div
			className={`bg-secondary/20 border rounded-lg p-5 transition-all ${
				isConnected
					? isHealthy
						? "border-emerald-500/30 hover:border-emerald-500/50"
						: "border-amber-500/30 hover:border-amber-500/50"
					: "border-red-500/30 hover:border-red-500/50"
			}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-lg ${
							isConnected
								? isHealthy
									? "bg-emerald-500/20"
									: "bg-amber-500/20"
								: "bg-red-500/20"
						}`}
					>
						<Database
							className={`w-5 h-5 ${
								isConnected
									? isHealthy
										? "text-emerald-400"
										: "text-amber-400"
									: "text-red-400"
							}`}
						/>
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-lg">{database.name}</h3>
						<p className="text-xs text-muted-foreground font-mono break-all">
							{database.path}
						</p>
					</div>
				</div>
				<StatusBadge status={database.status} size="sm" />
			</div>

			{/* Database Metrics Grid */}
			{isConnected && (
				<div className="grid grid-cols-2 gap-3 mb-4">
					{/* File Size */}
					<div className="flex items-center gap-2 text-sm">
						<HardDrive className="w-4 h-4 text-muted-foreground" />
						<span className="text-muted-foreground">Size:</span>
						<span className="font-mono">{formatBytes(database.size)}</span>
					</div>

					{/* Table Count */}
					<div className="flex items-center gap-2 text-sm">
						<Table className="w-4 h-4 text-muted-foreground" />
						<span className="text-muted-foreground">Tables:</span>
						<span className="font-mono">{database.tableCount}</span>
					</div>
				</div>
			)}

			{/* Health Indicators */}
			{hasHealth && (
				<div className="space-y-2 mb-4">
					{/* WAL Mode */}
					<div
						className={`flex items-center gap-2 p-2 rounded ${
							healthQuery.data?.walMode
								? "bg-emerald-500/10 text-emerald-400"
								: "bg-amber-500/10 text-amber-400"
						}`}
					>
						{healthQuery.data?.walMode ? (
							<CheckCircle2 className="w-4 h-4 flex-shrink-0" />
						) : (
							<AlertCircle className="w-4 h-4 flex-shrink-0" />
						)}
						<span className="text-xs">
							WAL Mode: {healthQuery.data?.walMode ? "Enabled" : "Disabled"}
						</span>
					</div>

					{/* Integrity Check */}
					<div
						className={`flex items-center gap-2 p-2 rounded ${
							healthQuery.data?.integrityCheck
								? "bg-emerald-500/10 text-emerald-400"
								: "bg-red-500/10 text-red-400"
						}`}
					>
						{healthQuery.data?.integrityCheck ? (
							<CheckCircle2 className="w-4 h-4 flex-shrink-0" />
						) : (
							<XCircle className="w-4 h-4 flex-shrink-0" />
						)}
						<span className="text-xs">
							Integrity: {healthQuery.data?.integrityCheck ? "OK" : "FAILED"}
						</span>
					</div>
				</div>
			)}

			{/* Connection Error */}
			{!isConnected && database.status === "error" && (
				<div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
					<p className="text-xs text-red-300">Database connection error</p>
				</div>
			)}

			{/* Action Buttons */}
			{isConnected && (
				<div className="flex items-center gap-2">
					{showActions ? (
						<div className="flex items-center gap-2 flex-1">
							<button
								onClick={() => {
									onVacuum(database.path);
									setShowActions(false);
								}}
								disabled={isVacuuming}
								className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Wrench className="w-4 h-4" />
								<span className="text-sm font-medium">
									{isVacuuming ? "Vacuuming..." : "VACUUM"}
								</span>
							</button>
							<button
								onClick={() => {
									onAnalyze(database.path);
									setShowActions(false);
								}}
								disabled={isAnalyzing}
								className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<BarChart3 className="w-4 h-4" />
								<span className="text-sm font-medium">
									{isAnalyzing ? "Analyzing..." : "ANALYZE"}
								</span>
							</button>
							<button
								onClick={() => setShowActions(false)}
								className="px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors"
							>
								<span className="text-sm font-medium">Cancel</span>
							</button>
						</div>
					) : (
						<button
							onClick={() => setShowActions(true)}
							className="w-full px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors"
						>
							<span className="text-sm font-medium">Maintenance Actions</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}
