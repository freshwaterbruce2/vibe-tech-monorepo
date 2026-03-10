// Bundle size monitoring tab with trend analysis and regression alerts
import { AlertTriangle, Package, RefreshCw, TrendingUp } from "lucide-react";
import { useBundleSizes, useBundleTrends } from "../../hooks/useBundles";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { MetricCard } from "../shared/MetricCard";
import type { TableColumn } from "../shared/MetricTable";
import { MetricTable } from "../shared/MetricTable";
import { TrendChart } from "../shared/TrendChart";

interface BundleRow {
	project_name: string;
	total_size: number;
	gzip_size: number;
	chunk_count: number;
	size_change_percent?: number;
	regression: boolean;
}

export function BundlesTab() {
	const { data: bundles, isLoading, error, refetch } = useBundleSizes();
	const { data: trends } = useBundleTrends(30);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading bundle sizes..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Bundle Sizes
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

	if (!bundles || bundles.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
				<p className="text-lg font-medium">No Bundle Data Available</p>
				<p className="text-sm mt-2">
					Bundle size tracking is not configured for this workspace.
				</p>
			</div>
		);
	}

	// Calculate metrics
	const totalSize = bundles.reduce((sum, bundle) => sum + bundle.total_size, 0);
	const avgGzipSize =
		bundles.reduce((sum, bundle) => sum + bundle.gzip_size, 0) / bundles.length;
	const projectCount = bundles.length;
	const regressionsCount = bundles.filter((bundle) => bundle.regression).length;

	// Calculate trend (comparing to average)
	const avgSizeChange =
		bundles
			.filter((b) => b.size_change_percent !== undefined)
			.reduce((sum, b) => sum + (b.size_change_percent ?? 0), 0) /
		bundles.length;

	// Prepare trend chart data
	const firstTrend = trends && trends.length > 0 ? trends[0] : null;
	const trendChartData = firstTrend
		? firstTrend.snapshots.map((snapshot) => ({
				timestamp: snapshot.timestamp,
				value: snapshot.total_size / 1024 / 1024, // Convert to MB
			}))
		: [];

	// Table columns
	const columns: TableColumn[] = [
		{
			header: "Project",
			accessor: "project_name",
			sortable: true,
			render: (value: string) => <span className="font-medium">{value}</span>,
		},
		{
			header: "Total Size",
			accessor: "total_size",
			sortable: true,
			render: (value: number) => (
				<span className="font-mono">{(value / 1024 / 1024).toFixed(2)} MB</span>
			),
		},
		{
			header: "Gzip Size",
			accessor: "gzip_size",
			sortable: true,
			render: (value: number) => (
				<span className="font-mono text-muted-foreground">
					{(value / 1024 / 1024).toFixed(2)} MB
				</span>
			),
		},
		{
			header: "Chunk Count",
			accessor: "chunk_count",
			sortable: true,
			render: (value: number) => (
				<span className="text-muted-foreground">{value}</span>
			),
		},
		{
			header: "Change",
			accessor: "size_change_percent",
			sortable: true,
			render: (value: number | undefined, row: BundleRow) => {
				if (value === undefined || value === null) {
					return <span className="text-muted-foreground">—</span>;
				}

				const isRegression = row.regression;
				const changePercent = value;

				return (
					<span
						className={
							isRegression
								? "text-red-600 font-semibold"
								: changePercent > 0
									? "text-amber-500"
									: "text-green-600"
						}
					>
						{changePercent > 0 ? "+" : ""}
						{changePercent.toFixed(1)}%
					</span>
				);
			},
		},
		{
			header: "Status",
			accessor: "regression",
			sortable: true,
			render: (value: boolean) =>
				value ? (
					<span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded">
						<AlertTriangle className="w-3 h-3" />
						Regression
					</span>
				) : (
					<span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
						✓ OK
					</span>
				),
		},
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2">Bundle Size Monitor</h1>
					<p className="text-muted-foreground">
						Tracking bundle sizes across {projectCount} project
						{projectCount !== 1 ? "s" : ""} with regression detection
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

			{/* Metric Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<MetricCard
					title="Total Size"
					value={totalSize / 1024 / 1024}
					icon={Package}
					suffix=" MB"
					decimals={2}
					variant="default"
					trend={
						avgSizeChange > 0 ? "up" : avgSizeChange < 0 ? "down" : "stable"
					}
					trendValue={
						avgSizeChange !== 0 ? `${avgSizeChange.toFixed(1)}%` : undefined
					}
				/>

				<MetricCard
					title="Avg Gzip Size"
					value={avgGzipSize / 1024 / 1024}
					icon={Package}
					suffix=" MB"
					decimals={2}
					variant="success"
					subtitle="Compressed average"
				/>

				<MetricCard
					title="Projects Tracked"
					value={projectCount}
					icon={TrendingUp}
					variant="default"
				/>

				<MetricCard
					title="Regressions"
					value={regressionsCount}
					icon={AlertTriangle}
					variant={regressionsCount > 0 ? "danger" : "success"}
					subtitle={regressionsCount > 0 ? "Requires attention" : "All good"}
					glow={regressionsCount > 0}
				/>
			</div>

			{/* Regressions Alert */}
			{regressionsCount > 0 && (
				<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
						<div>
							<h3 className="font-semibold text-red-400 mb-1">
								{regressionsCount} Bundle Size Regression
								{regressionsCount !== 1 ? "s" : ""} Detected
							</h3>
							<p className="text-sm text-red-300">
								The following projects have bundle sizes that increased
								significantly. Review and optimize before deploying.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Trend Chart */}
			{trendChartData.length > 0 && (
				<TrendChart
					data={trendChartData}
					title="Bundle Size Trends (30 days)"
					yAxisLabel="Size (MB)"
					color="#f59e0b" // amber-500
					valueFormatter={(value) => `${value.toFixed(2)} MB`}
					height={300}
				/>
			)}

			{/* Bundles Table */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Bundle Details</h2>
				<MetricTable
					columns={columns}
					data={bundles}
					emptyMessage="No bundle data available"
				/>
			</div>
		</div>
	);
}
