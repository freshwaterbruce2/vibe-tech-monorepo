// Nx Cloud CI/CD monitoring tab with build analytics and performance metrics

import { clsx } from "clsx";
import { format } from "date-fns";
import {
	Activity,
	AlertCircle,
	CheckCircle2,
	Cloud,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import {
	useNxCloudBuilds,
	useNxCloudPerformance,
	useNxCloudStatus,
} from "../../hooks/useNxCloud";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { MetricCard } from "../shared/MetricCard";
import { MetricTable } from "../shared/MetricTable";
import { TrendChart, type TrendDataPoint } from "../shared/TrendChart";

export function NxCloudTab() {
	const {
		data: status,
		isLoading: statusLoading,
		error: statusError,
		refetch: refetchStatus,
	} = useNxCloudStatus();
	const {
		data: builds = [],
		isLoading: buildsLoading,
		error: buildsError,
		refetch: refetchBuilds,
	} = useNxCloudBuilds(20);
	const {
		data: performance,
		isLoading: perfLoading,
		error: perfError,
		refetch: refetchPerformance,
	} = useNxCloudPerformance(7);

	// Combined loading state
	const isLoading = statusLoading || buildsLoading || perfLoading;

	// Combined error state
	const error = statusError ?? buildsError ?? perfError;

	// Refetch all data
	const refetchAll = () => {
		refetchStatus();
		refetchBuilds();
		refetchPerformance();
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading Nx Cloud data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Nx Cloud Data
				</h2>
				<p className="text-red-300 mb-4">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
				<button
					onClick={refetchAll}
					className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	// Connection status banner class
	const statusBannerClass = clsx(
		"p-4 rounded-lg border flex items-center gap-3 font-semibold mb-6",
		status?.connected
			? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
			: "bg-red-500/10 border-red-500/30 text-red-400",
	);

	// Format build status with color
	const getStatusColor = (buildStatus: string) => {
		switch (buildStatus) {
			case "success":
				return "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-2 py-1 rounded font-semibold";
			case "failure":
				return "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 px-2 py-1 rounded font-semibold";
			case "running":
				return "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 px-2 py-1 rounded font-semibold";
			default:
				return "text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 px-2 py-1 rounded font-semibold";
		}
	};

	// Format date
	const formatDate = (timestamp: string) => {
		try {
			return format(new Date(timestamp), "MMM dd, HH:mm");
		} catch {
			return timestamp;
		}
	};

	// Transform builds data for trend chart (last 7 days)
	const trendData: TrendDataPoint[] = builds
		.slice(0, 7)
		.reverse()
		.map((build) => ({
			timestamp: build.timestamp,
			value: build.cacheHitRate,
		}));

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
						<Cloud className="w-7 h-7 text-blue-400" />
						Nx Cloud CI/CD Monitor
					</h1>
					<p className="text-muted-foreground">
						Real-time build analytics and performance metrics
					</p>
				</div>
				<button
					onClick={refetchAll}
					className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
				>
					<RefreshCw className="w-4 h-4" />
					Refresh
				</button>
			</div>

			{/* Connection Status Banner */}
			<div className={statusBannerClass}>
				{status?.connected ? (
					<>
						<CheckCircle2 className="w-5 h-5" />
						<div>
							<span>✅ Connected to Nx Cloud</span>
							{status.lastSync && (
								<span className="ml-2 text-sm font-normal opacity-80">
									• Last sync: {formatDate(status.lastSync)}
								</span>
							)}
						</div>
					</>
				) : (
					<>
						<AlertCircle className="w-5 h-5" />
						<div>
							<span>❌ Not connected to Nx Cloud</span>
							<p className="text-sm font-normal mt-1 opacity-90">
								Run{" "}
								<code className="px-2 py-0.5 bg-black/20 rounded">
									pnpm nx-cloud login
								</code>{" "}
								to connect
							</p>
						</div>
					</>
				)}
			</div>

			{/* Performance Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<MetricCard
					title="Avg Build Time"
					value={
						performance?.avgBuildTimeMs ? performance.avgBuildTimeMs / 1000 : 0
					}
					icon={Activity}
					suffix="s"
					decimals={1}
					variant="default"
					subtitle="Average across all builds"
				/>

				<MetricCard
					title="Cache Hit Rate"
					value={performance?.avgCacheHitRate ?? 0}
					icon={TrendingUp}
					suffix="%"
					decimals={1}
					variant="success"
					glow={
						performance?.avgCacheHitRate
							? performance.avgCacheHitRate > 80
							: false
					}
					subtitle="Tasks served from cache"
				/>

				<MetricCard
					title="Tasks Cached"
					value={builds.reduce((sum, b) => sum + (b.tasksCached || 0), 0)}
					icon={CheckCircle2}
					variant="success"
					subtitle="Total cached tasks"
				/>

				<MetricCard
					title="Total Builds"
					value={performance?.totalBuilds ?? builds.length}
					icon={Cloud}
					variant="default"
					subtitle={`${status?.buildsInDatabase ?? 0} in database`}
				/>
			</div>

			{/* Cache Hit Rate Trend Chart */}
			{trendData.length > 0 && (
				<TrendChart
					data={trendData}
					title="Cache Hit Rate (Last 7 Builds)"
					yAxisLabel="Hit Rate (%)"
					color="#10b981"
					valueFormatter={(value) => `${value.toFixed(1)}%`}
				/>
			)}

			{/* Recent Builds Table */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Recent Builds</h2>
				<MetricTable
					columns={[
						{
							header: "Build ID",
							accessor: "id",
							className: "font-mono text-xs",
							render: (val) => (
								<span className="text-blue-400" title={val}>
									{val.slice(0, 8)}...
								</span>
							),
						},
						{
							header: "Branch",
							accessor: "branch",
							sortable: true,
							render: (val) => (
								<span className="font-mono text-xs bg-secondary/40 px-2 py-0.5 rounded">
									{val}
								</span>
							),
						},
						{
							header: "Status",
							accessor: "status",
							sortable: true,
							render: (val) => (
								<span className={getStatusColor(val)}>{val.toUpperCase()}</span>
							),
						},
						{
							header: "Duration",
							accessor: "durationMs",
							sortable: true,
							render: (val) => (
								<span className="font-mono">{(val / 1000).toFixed(1)}s</span>
							),
						},
						{
							header: "Cache Rate",
							accessor: "cacheHitRate",
							sortable: true,
							render: (val) => (
								<span
									className={clsx(
										"font-semibold",
										val >= 80
											? "text-emerald-400"
											: val >= 50
												? "text-amber-400"
												: "text-red-400",
									)}
								>
									{val.toFixed(1)}%
								</span>
							),
						},
						{
							header: "Tasks",
							accessor: "tasksExecuted",
							render: (val, row) => (
								<span className="text-xs">
									{row.tasksCached}/{val}
									<span className="text-muted-foreground ml-1">cached</span>
								</span>
							),
						},
						{
							header: "Date",
							accessor: "timestamp",
							sortable: true,
							render: (val) => (
								<span className="text-xs text-muted-foreground">
									{formatDate(val)}
								</span>
							),
						},
					]}
					data={builds}
					emptyMessage="No builds found. Connect to Nx Cloud to see build history."
				/>
			</div>

			{/* Performance Insights */}
			{performance && performance.totalBuilds > 0 && (
				<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
					<h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
						<TrendingUp className="w-5 h-5" />
						Performance Insights
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground mb-1">Success Rate</p>
							<p className="text-xl font-bold text-blue-300">
								{performance.successRate.toFixed(1)}%
							</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-1">Fastest Build</p>
							<p className="text-xl font-bold text-emerald-400">
								{(performance.fastestBuildMs / 1000).toFixed(1)}s
							</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-1">Slowest Build</p>
							<p className="text-xl font-bold text-amber-400">
								{(performance.slowestBuildMs / 1000).toFixed(1)}s
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
