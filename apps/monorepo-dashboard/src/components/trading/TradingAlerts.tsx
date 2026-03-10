// Trading system alerts component
import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { TradingAlert } from "../../types";

interface TradingAlertsProps {
	alerts: TradingAlert[];
}

export function TradingAlerts({ alerts }: TradingAlertsProps) {
	if (alerts.length === 0) {
		return null;
	}

	// Group alerts by severity
	const criticalAlerts = alerts.filter((a) => a.level === "critical");
	const warningAlerts = alerts.filter((a) => a.level === "warning");
	const infoAlerts = alerts.filter((a) => a.level === "info");

	return (
		<div className="space-y-3">
			{/* Critical Alerts */}
			{criticalAlerts.length > 0 && (
				<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-semibold text-red-400 mb-2">
								Critical Alerts
							</h3>
							<ul className="space-y-1">
								{criticalAlerts.map((alert, index) => (
									<li key={index} className="text-sm text-red-300">
										• {alert.message}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Warning Alerts */}
			{warningAlerts.length > 0 && (
				<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-semibold text-amber-400 mb-2">Warnings</h3>
							<ul className="space-y-1">
								{warningAlerts.map((alert, index) => (
									<li key={index} className="text-sm text-amber-300">
										• {alert.message}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Info Alerts */}
			{infoAlerts.length > 0 && (
				<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-semibold text-blue-400 mb-2">Information</h3>
							<ul className="space-y-1">
								{infoAlerts.map((alert, index) => (
									<li key={index} className="text-sm text-blue-300">
										• {alert.message}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Alert Summary Footer */}
			<div className="flex items-center justify-between text-xs text-muted-foreground px-2">
				<span>
					{alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
				</span>
				<span>
					{criticalAlerts.length > 0 && (
						<span className="text-red-400 font-medium">
							{criticalAlerts.length} critical
						</span>
					)}
					{warningAlerts.length > 0 && criticalAlerts.length > 0 && " • "}
					{warningAlerts.length > 0 && (
						<span className="text-amber-400 font-medium">
							{warningAlerts.length} warning
							{warningAlerts.length !== 1 ? "s" : ""}
						</span>
					)}
				</span>
			</div>
		</div>
	);
}
