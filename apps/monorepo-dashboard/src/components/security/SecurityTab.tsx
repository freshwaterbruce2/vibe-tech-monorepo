// Security/Vulnerabilities tab - Display npm audit results

import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import {
	useVulnerabilities,
	type Vulnerability,
} from "../../hooks/useVulnerabilities";
import { MetricCard } from "../shared/MetricCard";
import { MetricTable, type TableColumn } from "../shared/MetricTable";

export function SecurityTab() {
	const { report, loading, error } = useVulnerabilities();

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">
						Scanning for vulnerabilities...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
				<AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
				<p className="text-red-400 font-medium">{error}</p>
				<p className="text-sm text-muted-foreground mt-2">
					Unable to fetch vulnerability data. Check if backend is running.
				</p>
			</div>
		);
	}

	// Helper function to get severity color classes
	const getSeverityColor = (severity: Vulnerability["severity"]) => {
		switch (severity) {
			case "critical":
				return "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
			case "high":
				return "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
			case "moderate":
				return "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
			case "low":
				return "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
			case "info":
				return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
			default:
				return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/30 px-2 py-1 rounded font-semibold text-xs uppercase";
		}
	};

	// No vulnerabilities - success state
	if (report.totalVulnerabilities === 0) {
		return (
			<div className="space-y-6">
				{/* Metric Cards */}
				<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
					<MetricCard
						title="Total"
						value={0}
						icon={Shield}
						variant="success"
						subtitle="No vulnerabilities detected"
					/>
					<MetricCard
						title="Critical"
						value={0}
						icon={AlertTriangle}
						variant="default"
					/>
					<MetricCard
						title="High"
						value={0}
						icon={AlertTriangle}
						variant="default"
					/>
					<MetricCard
						title="Moderate"
						value={0}
						icon={Shield}
						variant="default"
					/>
					<MetricCard title="Low" value={0} icon={Shield} variant="default" />
				</div>

				{/* Success Message */}
				<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-12 text-center">
					<CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
					<h3 className="text-xl font-semibold text-emerald-400 mb-2">
						All Clear!
					</h3>
					<p className="text-muted-foreground">
						No security vulnerabilities detected in your dependencies.
					</p>
				</div>
			</div>
		);
	}

	// Define table columns
	const columns: TableColumn<Vulnerability>[] = [
		{
			header: "Package",
			accessor: "packageName",
			sortable: true,
			className: "font-mono text-xs",
		},
		{
			header: "Severity",
			accessor: "severity",
			sortable: true,
			render: (value: Vulnerability["severity"]) => (
				<span className={getSeverityColor(value)}>{value}</span>
			),
		},
		{
			header: "Title",
			accessor: "title",
			className: "max-w-md",
		},
		{
			header: "Vulnerable",
			accessor: "vulnerable_versions",
			className: "font-mono text-xs",
		},
		{
			header: "Patched",
			accessor: "patched_versions",
			className: "font-mono text-xs",
		},
		{
			header: "Fix",
			accessor: "recommendation",
			className: "text-sm",
			render: (value: string) => (
				<span className="text-muted-foreground">{value}</span>
			),
		},
	];

	return (
		<div className="space-y-6">
			{/* Severity Metric Cards */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<MetricCard
					title="Total"
					value={report.totalVulnerabilities}
					icon={Shield}
					variant={report.totalVulnerabilities > 0 ? "warning" : "success"}
					subtitle={`${report.totalVulnerabilities} vulnerabilities found`}
				/>
				<MetricCard
					title="Critical"
					value={report.critical}
					icon={AlertTriangle}
					variant={report.critical > 0 ? "danger" : "default"}
					glow={report.critical > 0}
				/>
				<MetricCard
					title="High"
					value={report.high}
					icon={AlertTriangle}
					variant={report.high > 0 ? "warning" : "default"}
				/>
				<MetricCard
					title="Moderate"
					value={report.moderate}
					icon={Shield}
					variant="default"
				/>
				<MetricCard
					title="Low"
					value={report.low}
					icon={Shield}
					variant="success"
				/>
			</div>

			{/* Vulnerabilities Table */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">Vulnerability Details</h2>
					<p className="text-sm text-muted-foreground">
						Sorted by severity (critical first)
					</p>
				</div>

				<MetricTable
					columns={columns}
					data={report.vulnerabilities}
					emptyMessage="No vulnerabilities found"
					stickyHeader
				/>
			</div>

			{/* Info Box */}
			<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
				<div className="flex items-start gap-3">
					<Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
					<div className="text-sm">
						<p className="font-medium text-blue-400 mb-1">
							Security Recommendations
						</p>
						<ul className="text-muted-foreground space-y-1 list-disc list-inside">
							<li>Review and update vulnerable packages as soon as possible</li>
							<li>
								Critical and high severity issues should be addressed
								immediately
							</li>
							<li>
								Run{" "}
								<code className="bg-secondary/50 px-1.5 py-0.5 rounded text-xs">
									pnpm audit --fix
								</code>{" "}
								to automatically fix some issues
							</li>
							<li>Check release notes for breaking changes before updating</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
