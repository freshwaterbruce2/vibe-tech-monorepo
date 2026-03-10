// Services monitoring tab with health checks and restart capability
import { Activity, AlertCircle, RefreshCw, Server } from "lucide-react";
import { useServices } from "../../hooks/useServices";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ServiceCard } from "./ServiceCard";

export function ServicesTab() {
	const { services, metrics, isLoading, error, restartService, refetch } =
		useServices();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading services data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Services
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

	const runningServices = services.filter((s) => s.status === "running");
	const stoppedServices = services.filter((s) => s.status === "stopped");
	const unhealthyServices = services.filter((s) => s.health === "unhealthy");

	return (
		<div className="space-y-6">
			{/* Header with Metrics */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2">Service Monitor</h1>
					<p className="text-muted-foreground">
						Real-time monitoring of {services.length} development services
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
				{/* Total Services */}
				<div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Total Services
						</p>
						<Server className="w-5 h-5 text-blue-400" />
					</div>
					<p className="text-3xl font-bold text-blue-400">
						{metrics.totalServices}
					</p>
				</div>

				{/* Running Services */}
				<div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">Running</p>
						<Activity className="w-5 h-5 text-emerald-400" />
					</div>
					<p className="text-3xl font-bold text-emerald-400">
						{metrics.runningServices}
					</p>
				</div>

				{/* Stopped Services */}
				<div className="bg-gradient-to-br from-gray-500/20 to-gray-600/5 border border-gray-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">Stopped</p>
						<Server className="w-5 h-5 text-gray-400" />
					</div>
					<p className="text-3xl font-bold text-gray-400">
						{metrics.stoppedServices}
					</p>
				</div>

				{/* Unhealthy Services */}
				<div className="bg-gradient-to-br from-red-500/20 to-red-600/5 border border-red-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Unhealthy
						</p>
						<AlertCircle className="w-5 h-5 text-red-400" />
					</div>
					<p className="text-3xl font-bold text-red-400">
						{metrics.unhealthyServices}
					</p>
				</div>
			</div>

			{/* Alert Banner */}
			{unhealthyServices.length > 0 && (
				<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-amber-400 mb-1">
								Service Health Warning
							</h3>
							<p className="text-sm text-amber-300">
								{unhealthyServices.length} service
								{unhealthyServices.length !== 1 ? "s" : ""} reporting health
								check failures. Check individual service cards for details.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Running Services Section */}
			{runningServices.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
						<Activity className="w-5 h-5 text-emerald-400" />
						Running Services ({runningServices.length})
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{runningServices.map((service) => (
							<ServiceCard
								key={service.name}
								service={service}
								onRestart={restartService}
							/>
						))}
					</div>
				</div>
			)}

			{/* Stopped Services Section */}
			{stoppedServices.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
						<Server className="w-5 h-5 text-gray-400" />
						Stopped Services ({stoppedServices.length})
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{stoppedServices.map((service) => (
							<ServiceCard
								key={service.name}
								service={service}
								onRestart={restartService}
							/>
						))}
					</div>
				</div>
			)}

			{/* Empty State */}
			{services.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p className="text-lg font-medium">No Services Detected</p>
					<p className="text-sm mt-2">
						Start development servers to see them here
					</p>
				</div>
			)}
		</div>
	);
}
