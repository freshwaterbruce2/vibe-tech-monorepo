import { format } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	FileText,
	Target,
	TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
	useActivePlanningSessions,
	usePlanningComparison,
	usePlanningMetrics,
	usePlanningSummary,
	type PlanningSession,
	type TrialComparison,
} from "../../hooks/usePlanningMetrics";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { MetricCard } from "../shared/MetricCard";
import { MetricTable, type TableColumn } from "../shared/MetricTable";
import { TrendChart } from "../shared/TrendChart";

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(timestamp: string): string {
	try {
		return format(new Date(timestamp), "MMM dd, yyyy HH:mm");
	} catch {
		return timestamp;
	}
}

function getStatusVariant(status: string): "success" | "warning" | "danger" {
	if (status === "completed") return "success";
	if (status === "in_progress") return "warning";
	return "danger";
}

function getComparisonVariant(
	status: string,
): "success" | "warning" | "default" {
	if (status === "success") return "success";
	if (status === "warning") return "warning";
	return "default";
}

// ============================================================================
// Component
// ============================================================================

export function PlanningTab() {
	// Fetch data
	const { data: summary, isLoading, isError, error } = usePlanningSummary();
	const { data: metrics = [], isLoading: metricsLoading } =
		usePlanningMetrics(30);
	const { data: comparison = [], isLoading: comparisonLoading } =
		usePlanningComparison();
	const { data: activeSessions = [] } = useActivePlanningSessions();

	// Prepare trend data for completion rate
	const trendData = useMemo(() => {
		return metrics.map((m) => ({
			timestamp: m.date,
			value: m.completionRate * 100,
		}));
	}, [metrics]);

	// Session table columns
	const sessionColumns: TableColumn<PlanningSession>[] = [
		{
			header: "Session",
			accessor: "sessionId",
			sortable: true,
			className: "font-mono text-xs",
		},
		{
			header: "Project",
			accessor: "projectName",
			sortable: true,
			className: "font-medium",
		},
		{
			header: "Status",
			accessor: "status",
			sortable: true,
			render: (value: string) => {
				const variant = getStatusVariant(value);
				const colorClasses = {
					success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
					warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
					danger: "bg-red-500/20 text-red-400 border-red-500/30",
				};
				return (
					<span
						className={
							"px-2 py-1 rounded-full text-xs border " + colorClasses[variant]
						}
					>
						{value}
					</span>
				);
			},
		},
		{
			header: "Progress",
			accessor: "phasesCompleted",
			sortable: true,
			render: (_value: number, row: PlanningSession) => {
				const percent = (row.phasesCompleted / row.totalPhases) * 100;
				return (
					<div className="flex items-center gap-2">
						<div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-500"
								style={{ width: percent + "%" }}
							/>
						</div>
						<span className="text-xs text-muted-foreground">
							{row.phasesCompleted}/{row.totalPhases}
						</span>
					</div>
				);
			},
		},
		{
			header: "Started",
			accessor: "startedAt",
			sortable: true,
			render: (value: string) => (
				<span className="text-sm text-muted-foreground">
					{formatDate(value)}
				</span>
			),
		},
	];

	// Comparison table columns
	const comparisonColumns: TableColumn<TrialComparison>[] = [
		{
			header: "Metric",
			accessor: "metric",
			sortable: false,
			className: "font-medium",
		},
		{
			header: "Baseline",
			accessor: "baseline",
			sortable: false,
			render: (value: number | null) => (
				<span className="text-muted-foreground">
					{value !== null ? value.toFixed(1) + "%" : "N/A"}
				</span>
			),
		},
		{
			header: "Current",
			accessor: "current",
			sortable: false,
			render: (value: number | null) => (
				<span className="font-semibold">
					{value !== null ? value.toFixed(1) + "%" : "N/A"}
				</span>
			),
		},
		{
			header: "Change",
			accessor: "change",
			sortable: false,
			render: (value: number | null) => {
				if (value === null)
					return <span className="text-muted-foreground">-</span>;
				const isPositive = value >= 0;
				return (
					<span className={isPositive ? "text-emerald-400" : "text-red-400"}>
						{isPositive ? "+" : ""}
						{value.toFixed(1)}%
					</span>
				);
			},
		},
		{
			header: "Target",
			accessor: "target",
			sortable: false,
			render: (value: number) => (
				<span className="text-muted-foreground">{value.toFixed(1)}%</span>
			),
		},
		{
			header: "Status",
			accessor: "status",
			sortable: false,
			render: (value: string) => {
				const variant = getComparisonVariant(value);
				const icons = {
					success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
					warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
					default: <Clock className="w-4 h-4 text-muted-foreground" />,
				};
				return icons[variant];
			},
		},
	];

	// ========================================================================
	// Loading State
	// ========================================================================

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-96">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// ========================================================================
	// Error State
	// ========================================================================

	if (isError) {
		return (
			<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
				<AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
				<h3 className="text-lg font-semibold text-red-400 mb-2">
					Failed to Load Planning Metrics
				</h3>
				<p className="text-sm text-muted-foreground">
					{error instanceof Error ? error.message : "Unknown error occurred"}
				</p>
			</div>
		);
	}

	// ========================================================================
	// Empty State
	// ========================================================================

	if (!summary || summary.totalSessions === 0) {
		return (
			<div className="bg-secondary/20 border border-border rounded-lg p-12 text-center">
				<FileText className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
				<h3 className="text-lg font-semibold mb-2">No Planning Sessions Yet</h3>
				<p className="text-sm text-muted-foreground max-w-md mx-auto">
					Start using the planning-with-files methodology to see metrics here.
					Run{" "}
					<code className="px-2 py-1 bg-secondary/40 rounded text-xs">
						/planning-with-files:start
					</code>{" "}
					to begin a new session.
				</p>
			</div>
		);
	}

	// ========================================================================
	// Main Content
	// ========================================================================

	return (
		<div className="space-y-6">
			{/* Trial Status Banner */}
			{summary.trialStartDate && (
				<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Target className="w-5 h-5 text-blue-400" />
						<div>
							<span className="font-medium text-blue-400">
								Trial in Progress
							</span>
							<span className="text-sm text-muted-foreground ml-2">
								Day {summary.daysElapsed} of 30
							</span>
						</div>
					</div>
					<div className="text-sm text-muted-foreground">
						{summary.trialStartDate} to {summary.trialEndDate}
					</div>
				</div>
			)}

			{/* Metric Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<MetricCard
					title="Completion Rate"
					value={summary.avgCompletionRate * 100}
					icon={CheckCircle}
					variant={summary.avgCompletionRate >= 0.85 ? "success" : "warning"}
					suffix="%"
					decimals={1}
					subtitle="Goals achieved"
					glow={summary.avgCompletionRate >= 0.85}
				/>

				<MetricCard
					title="Active Sessions"
					value={summary.activeSessions}
					icon={Clock}
					variant="default"
					subtitle="Currently in progress"
				/>

				<MetricCard
					title="Total Sessions"
					value={summary.totalSessions}
					icon={FileText}
					variant="default"
					subtitle="All time"
				/>

				<MetricCard
					title="Context Recovery"
					value={summary.avgContextRecovery * 100}
					icon={TrendingUp}
					variant={summary.avgContextRecovery >= 0.9 ? "success" : "warning"}
					suffix="%"
					decimals={1}
					subtitle="Successful recoveries"
				/>
			</div>

			{/* Trend Chart */}
			{metricsLoading ? (
				<div className="bg-secondary/20 rounded-lg p-6 flex items-center justify-center h-[300px]">
					<LoadingSpinner />
				</div>
			) : trendData.length > 0 ? (
				<TrendChart
					data={trendData}
					title="Completion Rate Trend (30 days)"
					color="#10b981"
					yAxisLabel="Rate %"
					valueFormatter={(value) => value.toFixed(1) + "%"}
					height={300}
				/>
			) : (
				<div className="bg-secondary/20 rounded-lg p-6 text-center">
					<p className="text-sm text-muted-foreground">
						No trend data available yet. Complete a few sessions to see trends.
					</p>
				</div>
			)}

			{/* Trial Comparison Table */}
			{!comparisonLoading && comparison.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-lg font-semibold">Trial vs Baseline</h3>
					<MetricTable
						columns={comparisonColumns}
						data={comparison}
						emptyMessage="No comparison data available"
						stickyHeader={false}
					/>
				</div>
			)}

			{/* Active Sessions Table */}
			{activeSessions.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-lg font-semibold">Active Sessions</h3>
					<MetricTable
						columns={sessionColumns}
						data={activeSessions}
						emptyMessage="No active sessions"
						stickyHeader={false}
					/>
				</div>
			)}
		</div>
	);
}
