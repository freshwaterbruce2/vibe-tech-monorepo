// PowerShell-based process monitoring service
// Checks which ports are in use on Windows 11

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ServiceStatus {
	name: string;
	port: number;
	status: "running" | "stopped";
	pid: number | null;
	health: "healthy" | "degraded" | "unhealthy";
	httpStatus: number | null;
	responseTimeMs: number | null;
}

// Known services in the monorepo
const KNOWN_SERVICES = [
	{ name: "root", port: 5173, url: "http://localhost:5173" },
	{
		name: "backend",
		port: 3001,
		url: "http://localhost:3001",
		healthCheckUrl: "http://localhost:3001/health",
	},
	{ name: "crypto-enhanced", port: 8000, url: "http://localhost:8000" },
	{ name: "nova-agent", port: 3000, url: "http://localhost:3000" },
	{
		name: "business-booking-platform",
		port: 5174,
		url: "http://localhost:5174",
	},
	{ name: "digital-content-builder", port: 3002, url: "http://localhost:3002" },
	{ name: "shipping-pwa", port: 5175, url: "http://localhost:5175" },
	{ name: "memory-bank", port: 8765, url: "http://localhost:8765" },
	{ name: "monorepo-dashboard", port: 5176, url: "http://localhost:5176" },
	{
		name: "monorepo-dashboard-backend",
		port: 5177,
		url: "http://localhost:5177",
		healthCheckUrl: "http://localhost:5177/api/health",
	},
];

async function checkHttp(
	url: string,
): Promise<{ httpStatus: number; responseTimeMs: number; ok: boolean } | null> {
	const start = Date.now();

	try {
		const res = await fetch(url, {
			method: "GET",
			signal: AbortSignal.timeout(1500),
		});

		return {
			httpStatus: res.status,
			responseTimeMs: Date.now() - start,
			ok: res.status >= 200 && res.status < 400,
		};
	} catch {
		return null;
	}
}

/**
 * Check if a specific port is in use using PowerShell
 */
async function checkPort(
	port: number,
): Promise<{ isRunning: boolean; pid: number | null }> {
	try {
		const { stdout } = await execAsync(
			`powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1"`,
		);

		const pidStr = stdout.trim();
		if (pidStr && !isNaN(Number(pidStr))) {
			return {
				isRunning: true,
				pid: Number(pidStr),
			};
		}

		return {
			isRunning: false,
			pid: null,
		};
	} catch (error) {
		// PowerShell command failed or port not in use
		return {
			isRunning: false,
			pid: null,
		};
	}
}

/**
 * Get status of all known services
 */
export async function getServicesStatus(): Promise<ServiceStatus[]> {
	console.log("[ServicesService] Checking status of all services...");

	const services: ServiceStatus[] = [];

	// Check each service sequentially (PowerShell commands don't parallelize well)
	for (const service of KNOWN_SERVICES) {
		const { isRunning, pid } = await checkPort(service.port);

		let health: ServiceStatus["health"] = "unhealthy";
		let httpStatus: number | null = null;
		let responseTimeMs: number | null = null;

		if (isRunning) {
			const url = service.healthCheckUrl || service.url;

			if (url) {
				const http = await checkHttp(url);
				if (http) {
					httpStatus = http.httpStatus;
					responseTimeMs = http.responseTimeMs;
					health = http.ok ? "healthy" : "degraded";
				} else {
					health = "degraded";
				}
			} else {
				health = "healthy";
			}
		}

		services.push({
			name: service.name,
			port: service.port,
			status: isRunning ? "running" : "stopped",
			pid,
			health,
			httpStatus,
			responseTimeMs,
		});
	}

	const runningCount = services.filter((s) => s.status === "running").length;
	console.log(
		`[ServicesService] ${runningCount}/${services.length} services running`,
	);

	return services;
}

/**
 * Get status of a single service by port
 */
export async function getServiceStatus(
	port: number,
): Promise<ServiceStatus | null> {
	const service = KNOWN_SERVICES.find((s) => s.port === port);

	if (!service) {
		console.warn(`[ServicesService] Unknown port ${port}`);
		return null;
	}

	const { isRunning, pid } = await checkPort(port);

	let health: ServiceStatus["health"] = "unhealthy";
	let httpStatus: number | null = null;
	let responseTimeMs: number | null = null;

	if (isRunning) {
		const url = service.healthCheckUrl || service.url;
		if (url) {
			const http = await checkHttp(url);
			if (http) {
				httpStatus = http.httpStatus;
				responseTimeMs = http.responseTimeMs;
				health = http.ok ? "healthy" : "degraded";
			} else {
				health = "degraded";
			}
		} else {
			health = "healthy";
		}
	}

	return {
		name: service.name,
		port: service.port,
		status: isRunning ? "running" : "stopped",
		pid,
		health,
		httpStatus,
		responseTimeMs,
	};
}
