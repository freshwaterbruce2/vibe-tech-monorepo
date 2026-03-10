// Type-safe MCP client for dashboard data fetching
import { z } from "zod";

// Schemas for validation
const ProjectSchema = z.object({
	name: z.string(),
	root: z.string(),
	sourceRoot: z.string().optional(),
	projectType: z.string().optional(),
	tags: z.array(z.string()).optional(),
	targets: z.record(z.string(), z.any()).optional(),
});

const WorkspaceSchema = z.object({
	projects: z.record(z.string(), ProjectSchema),
	version: z.number().optional(),
	nxJson: z.any().optional(), // Nx workspace configuration
});

// MCP Client class for type-safe communication via REST API
export class MCPClient {
	private apiBaseUrl = "http://localhost:5177/api";

	/**
	 * Call Nx workspace MCP tool via REST API
	 */
	async callNxWorkspace(
		filter?: string,
	): Promise<z.infer<typeof WorkspaceSchema>> {
		try {
			const response = await fetch(
				`${this.apiBaseUrl}/workspace?filter=${encodeURIComponent(filter ?? "")}`,
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			return WorkspaceSchema.parse(result);
		} catch (error) {
			console.error("[MCP] nx_workspace failed:", error);
			throw new Error(
				`Failed to fetch workspace: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Call SQLite MCP tool for trading database queries (via REST API)
	 * Note: Trading endpoints are pre-configured in the backend
	 */
	async callSQLite(query: string, dbPath: string): Promise<any[]> {
		// Trading queries are handled by specific endpoints in the backend
		// This method is kept for compatibility but routes to backend
		try {
			// Route trading queries to appropriate endpoint
			if (dbPath.includes("trading.db")) {
				if (query.includes("balance_history")) {
					const response = await fetch(`${this.apiBaseUrl}/trading/balance`);
					const data = await response.json();
					return data ? [data] : [];
				} else if (query.includes("positions")) {
					const response = await fetch(`${this.apiBaseUrl}/trading/positions`);
					return await response.json();
				} else if (query.includes("total_trades")) {
					// Check total_trades BEFORE trades (since "total_trades" contains "trades")
					const response = await fetch(`${this.apiBaseUrl}/trading/metrics`);
					const data = await response.json();
					return data ? [data] : [];
				} else if (query.includes("trades")) {
					const response = await fetch(
						`${this.apiBaseUrl}/trading/trades?limit=10`,
					);
					return await response.json();
				}
			}

			console.warn(
				"[MCP] Generic SQLite queries not yet supported via REST API",
			);
			return [];
		} catch (error) {
			console.error("[MCP] sqlite query failed:", error);
			throw new Error(
				`SQLite query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Call Filesystem MCP tool for directory listings (via REST API)
	 */
	async callFilesystem(
		path: string,
		_options?: { recursive?: boolean; withSizes?: boolean },
	): Promise<any> {
		try {
			// Databases endpoint for D:\databases path
			if (path.toLowerCase().includes("databases")) {
				const response = await fetch(`${this.apiBaseUrl}/databases`);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return await response.json();
			}

			console.warn(
				"[MCP] Filesystem MCP not yet fully integrated via REST API",
			);
			return [];
		} catch (error) {
			console.error("[MCP] filesystem failed:", error);
			throw new Error(
				`Filesystem operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Call Desktop Commander MCP tool for process monitoring (via REST API)
	 */
	async callDesktopCommander(
		command: string,
		_args?: Record<string, any>,
	): Promise<any> {
		try {
			// Services endpoint for process monitoring
			if (command === "dc_list_processes") {
				const response = await fetch(`${this.apiBaseUrl}/services`);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return await response.json();
			}

			console.warn(
				`[MCP] Desktop Commander command ${command} not yet integrated via REST API`,
			);
			return null;
		} catch (error) {
			console.error(`[MCP] desktop-commander ${command} failed:`, error);
			throw new Error(
				`Desktop Commander ${command} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Fetch URL via Desktop Commander (for health checks)
	 */
	async fetchUrl(
		url: string,
		method: "GET" | "HEAD" = "GET",
		timeoutMs: number = 5000,
	): Promise<any> {
		try {
			// Direct fetch for health checks (browser can do this)
			const response = await fetch(url, {
				method,
				signal: AbortSignal.timeout(timeoutMs),
			});

			return {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
			};
		} catch (error) {
			console.error(`[MCP] fetch_url ${url} failed:`, error);
			throw error;
		}
	}

	/**
	 * List running processes via Desktop Commander
	 */
	async listProcesses(limit: number = 50): Promise<any> {
		try {
			return await this.callDesktopCommander("dc_list_processes", { limit });
		} catch (error) {
			console.error("[MCP] list_processes failed:", error);
			throw error;
		}
	}

	/**
	 * Get system info via Desktop Commander
	 */
	async getSystemInfo(): Promise<any> {
		try {
			return await this.callDesktopCommander("dc_get_system_info");
		} catch (error) {
			console.error("[MCP] get_system_info failed:", error);
			throw error;
		}
	}
}

// Singleton instance
export const mcpClient = new MCPClient();

// Global type augmentation for window.mcp
declare global {
	interface Window {
		mcp: {
			call: (tool: string, args: Record<string, any>) => Promise<any>;
		};
	}
}
