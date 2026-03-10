// Overview dashboard tab with workspace metrics
import { Activity, AlertTriangle, FolderGit2, Package } from "lucide-react";
import type { ReactNode } from "react";
import { useProjects } from "../../hooks/useProjects";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { StatusBadge } from "../shared/StatusBadge";

export function OverviewTab() {
	const { metrics, categorizedProjects, cacheStats, isLoading, error } =
		useProjects();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading workspace data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Data
				</h2>
				<p className="text-red-300">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
			</div>
		);
	}

	// Calculate health score
	const healthScore =
		metrics.totalProjects > 0
			? Math.round((metrics.healthyProjects / metrics.totalProjects) * 100)
			: 0;

	return (
		<div className="space-y-6">
			{/* Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Health Score Card */}
				<MetricCard
					title="Health Score"
					icon={Activity}
					value={healthScore}
					suffix="%"
					color="emerald"
					glow={healthScore > 80}
				/>

				{/* Total Projects Card */}
				<MetricCard
					title="Total Projects"
					icon={FolderGit2}
					value={metrics.totalProjects}
					color="blue"
				/>

				{/* Total Dependencies Card */}
				<MetricCard
					title="Dependencies"
					icon={Package}
					value={metrics.totalDependencies}
					color="purple"
				/>

				{/* Config Issues Card */}
				<MetricCard
					title="Config Issues"
					icon={AlertTriangle}
					value={metrics.configIssues}
					color="amber"
				/>
			</div>

			{/* Project Categories */}
			<div className="bg-secondary/20 rounded-lg p-6">
				<h2 className="text-xl font-semibold mb-4">Project Categories</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{Object.entries(categorizedProjects).map(([category, projects]) => (
						<div
							key={category}
							className="bg-background/50 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
						>
							<div className="flex items-center justify-between mb-2">
								<h3 className="font-semibold">{category}</h3>
								<span className="text-2xl font-bold text-primary">
									{projects.length}
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								{projects
									.map((p) => p.name)
									.slice(0, 3)
									.join(", ")}
								{projects.length > 3 && ` +${projects.length - 3} more`}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Cache Statistics */}
			{cacheStats && (
				<div className="bg-secondary/20 rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">Nx Cache Statistics</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<p className="text-sm text-muted-foreground mb-1">Hit Rate</p>
							<p className="text-2xl font-bold text-emerald-400">
								{cacheStats.hitRate}%
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground mb-1">Cache Size</p>
							<p className="text-2xl font-bold text-blue-400">
								{formatBytes(cacheStats.size)}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground mb-1">Files Cached</p>
							<p className="text-2xl font-bold text-purple-400">
								<AnimatedCounter value={cacheStats.fileCount} />
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Health Status */}
			<div className="bg-secondary/20 rounded-lg p-6">
				<h2 className="text-xl font-semibold mb-4">Workspace Health</h2>
				<div className="flex flex-wrap gap-4">
					<div className="flex items-center gap-2">
						<StatusBadge status="healthy" />
						<span className="text-muted-foreground">
							<AnimatedCounter value={metrics.healthyProjects} /> projects
						</span>
					</div>
					{metrics.warningProjects > 0 && (
						<div className="flex items-center gap-2">
							<StatusBadge status="warning" />
							<span className="text-muted-foreground">
								<AnimatedCounter value={metrics.warningProjects} /> projects
							</span>
						</div>
					)}
					{metrics.criticalProjects > 0 && (
						<div className="flex items-center gap-2">
							<StatusBadge status="critical" />
							<span className="text-muted-foreground">
								<AnimatedCounter value={metrics.criticalProjects} /> projects
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Metric Card Component
interface MetricCardProps {
	title: string;
	icon: any;
	value: number;
	suffix?: string;
	color: "emerald" | "blue" | "purple" | "amber";
	glow?: boolean;
}

function MetricCard({
	title,
	icon: Icon,
	value,
	suffix = "",
	color,
	glow = false,
}: MetricCardProps): ReactNode {
	const colorClasses = {
		emerald:
			"from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30",
		blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30",
		purple:
			"from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30",
		amber:
			"from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30",
	};

	return (
		<div
			className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6 ${
				glow ? "ring-2 ring-emerald-500/30" : ""
			}`}
			role="region"
			aria-label={`${title}: ${value}${suffix}`}
		>
			<div className="flex items-center justify-between mb-2">
				<p className="text-sm font-medium text-muted-foreground">{title}</p>
				<Icon className="w-5 h-5" aria-hidden="true" />
			</div>
			<p className="text-3xl font-bold">
				<AnimatedCounter value={value} suffix={suffix} />
			</p>
		</div>
	);
}

// Format bytes helper
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}
