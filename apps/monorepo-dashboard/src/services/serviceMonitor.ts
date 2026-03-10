// Service monitoring for running development servers

import type {
	Service,
	ServiceHealth,
	ServiceHealthCheck,
	ServiceStatus,
} from "../types";
import { KNOWN_SERVICES as SERVICES } from "../types";
import { mcpClient } from "./mcpClient";

interface BackendServiceStatus {
	name: string;
	port: number;
	status: "running" | "stopped";
	pid: number | null;
	health?: "healthy" | "degraded" | "unhealthy";
	httpStatus?: number | null;
	responseTimeMs?: number | null;
}

export const serviceMonitor = {
	/**
	 * Get status of all known services
	 */
	async getAllServices(): Promise<Service[]> {
		const backend = (await mcpClient.listProcesses(
			200,
		)) as BackendServiceStatus[];
		const byPort = new Map<
			number,
			Omit<(typeof SERVICES)[number], "port"> & { port: number }
		>(SERVICES.map((s) => [s.port, s]));

		const merged: Service[] = backend.map((s) => {
			const known = byPort.get(s.port);
			const status: ServiceStatus =
				s.status === "running" ? "running" : "stopped";
			const health: ServiceHealth =
				s.health ?? (status === "running" ? "degraded" : "unhealthy");

			return {
				...(known ?? { name: s.name, port: s.port }),
				name: known?.name ?? s.name,
				port: s.port,
				pid: s.pid ?? undefined,
				status,
				health,
			};
		});

		// Include any locally-known services missing from backend output
		for (const knownService of SERVICES) {
			if (!merged.some((s) => s.port === knownService.port)) {
				merged.push({
					...knownService,
					status: "error",
					health: "unhealthy",
				});
			}
		}

		return merged;
	},

	/**
	 * Get status of a single service
	 */
	async getServiceStatus(
		serviceConfig: (typeof SERVICES)[number],
	): Promise<Service> {
		try {
			const backend = (await mcpClient.listProcesses(
				200,
			)) as BackendServiceStatus[];
			const statusRow = backend.find((s) => s.port === serviceConfig.port);

			if (!statusRow) {
				return {
					...serviceConfig,
					status: "error",
					health: "unhealthy",
				};
			}

			const status: ServiceStatus =
				statusRow.status === "running" ? "running" : "stopped";
			const health: ServiceHealth =
				statusRow.health ?? (status === "running" ? "degraded" : "unhealthy");

			return {
				...serviceConfig,
				pid: statusRow.pid ?? undefined,
				status,
				health,
			};
		} catch (error) {
			console.error(
				`[ServiceMonitor] getServiceStatus ${serviceConfig.name} failed:`,
				error,
			);
			return {
				...serviceConfig,
				status: "error",
				health: "unhealthy",
			};
		}
	},

	/**
	 * Perform health check on a service
	 */
	async performHealthCheck(url: string): Promise<ServiceHealthCheck> {
		const startTime = Date.now();

		try {
			const result = await mcpClient.fetchUrl(url, "GET", 5000);
			const responseTime = Date.now() - startTime;

			return {
				serviceName: url,
				url,
				status: result.status ?? 200,
				responseTime,
				timestamp: new Date(),
				healthy: result.status >= 200 && result.status < 400,
			};
		} catch (_error) {
			return {
				serviceName: url,
				url,
				status: 0,
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				healthy: false,
			};
		}
	},

	/**
	 * Restart a service (stub - would need actual implementation)
	 */
	async restartService(serviceName: string): Promise<boolean> {
		console.warn(
			`[ServiceMonitor] Restart service ${serviceName} - not implemented yet`,
		);
		// Would need to implement service restart logic
		// This might involve process management or Docker commands
		return false;
	},
};
