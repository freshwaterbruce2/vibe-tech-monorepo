// Databases monitoring tab with health metrics and maintenance actions
import {
	Activity,
	AlertTriangle,
	Database,
	HardDrive,
	RefreshCw,
} from "lucide-react";
import { useDatabases } from "../../hooks/useDatabases";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { DatabaseCard } from "./DatabaseCard";

export function DatabasesTab() {
	const {
		databases,
		metrics,
		isLoading,
		error,
		refetch,
		vacuum,
		analyze,
		isVacuuming,
		isAnalyzing,
	} = useDatabases();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading database data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Databases
				</h2>
				<p className="text-red-300 mb-4">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
				<button
					onClick={async () => refetch()}
					className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	const connectedDatabases = databases.filter(
		(db) => db.status === "connected",
	);
	const disconnectedDatabases = databases.filter(
		(db) => db.status === "disconnected",
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2">Database Monitor</h1>
					<p className="text-muted-foreground">
						Monitoring {databases.length} SQLite database
						{databases.length !== 1 ? "s" : ""}
					</p>
				</div>
				<button
					onClick={async () => refetch()}
					className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
				>
					<RefreshCw className="w-4 h-4" />
					Refresh
				</button>
			</div>

			{/* Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{/* Total Databases */}
				<div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Total Databases
						</p>
						<Database className="w-5 h-5 text-blue-400" />
					</div>
					<p className="text-3xl font-bold text-blue-400">
						<AnimatedCounter value={metrics.totalDatabases} />
					</p>
				</div>

				{/* Connected */}
				<div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Connected
						</p>
						<Activity className="w-5 h-5 text-emerald-400" />
					</div>
					<p className="text-3xl font-bold text-emerald-400">
						<AnimatedCounter value={metrics.connectedDatabases} />
					</p>
				</div>

				{/* Total Size */}
				<div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Total Size
						</p>
						<HardDrive className="w-5 h-5 text-purple-400" />
					</div>
					<p className="text-3xl font-bold text-purple-400">
						{formatBytes(metrics.totalSize)}
					</p>
				</div>

				{/* Total Tables */}
				<div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Total Tables
						</p>
						<Database className="w-5 h-5 text-amber-400" />
					</div>
					<p className="text-3xl font-bold text-amber-400">
						<AnimatedCounter value={metrics.totalTables} />
					</p>
				</div>
			</div>

			{/* Alert for Disconnected Databases */}
			{disconnectedDatabases.length > 0 && (
				<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-amber-400 mb-1">
								Connection Issues
							</h3>
							<p className="text-sm text-amber-300">
								{disconnectedDatabases.length} database
								{disconnectedDatabases.length !== 1 ? "s" : ""} not accessible.
								Check paths and permissions.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Connected Databases Section */}
			{connectedDatabases.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
						<Activity className="w-5 h-5 text-emerald-400" />
						Connected Databases ({connectedDatabases.length})
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{connectedDatabases.map((database) => (
							<DatabaseCard
								key={database.path}
								database={database}
								onVacuum={vacuum}
								onAnalyze={analyze}
								isVacuuming={isVacuuming}
								isAnalyzing={isAnalyzing}
							/>
						))}
					</div>
				</div>
			)}

			{/* Disconnected Databases Section */}
			{disconnectedDatabases.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-amber-400" />
						Disconnected Databases ({disconnectedDatabases.length})
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{disconnectedDatabases.map((database) => (
							<DatabaseCard
								key={database.path}
								database={database}
								onVacuum={vacuum}
								onAnalyze={analyze}
								isVacuuming={isVacuuming}
								isAnalyzing={isAnalyzing}
							/>
						))}
					</div>
				</div>
			)}

			{/* Empty State */}
			{databases.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p className="text-lg font-medium">No Databases Detected</p>
					<p className="text-sm mt-2">
						Add databases to D:\databases\ to monitor them
					</p>
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
