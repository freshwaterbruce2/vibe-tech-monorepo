/**
 * Permission Manager for Desktop Commander
 *
 * Implements auto-approval system similar to Claude Code's permission whitelist.
 * Reads from MCP_CONFIG.json's autoApprove array.
 */

import fs from "fs";
import path from "path";
import { logger } from "./Logger.js";

export interface PermissionConfig {
	autoApprove: string[];
	alwaysAsk?: string[];
}

export class PermissionManager {
	private autoApproved = new Set<string>();
	private alwaysAsk = new Set<string>();
	private configPath: string;

	constructor(configPath?: string) {
		// Default to MCP_CONFIG.json in project root
		this.configPath = configPath ?? path.join(process.cwd(), "MCP_CONFIG.json");
		this.loadConfig();
	}

	/**
	 * Load permission config from MCP_CONFIG.json
	 */
	private loadConfig(): void {
		try {
			if (!fs.existsSync(this.configPath)) {
				logger.warn(
					`Permission config not found at ${this.configPath}, using defaults`,
				);
				return;
			}

			const configData = fs.readFileSync(this.configPath, "utf-8");
			const config = JSON.parse(configData);

			// Extract autoApprove from mcpServers.desktop-commander
			const dcConfig = config.mcpServers?.["desktop-commander"];
			if (!dcConfig) {
				logger.warn("No desktop-commander config found in MCP_CONFIG.json");
				return;
			}

			// Load auto-approved commands
			if (Array.isArray(dcConfig.autoApprove)) {
				dcConfig.autoApprove.forEach((cmd: string) => {
					// Support wildcards
					if (cmd === "*") {
						logger.warn(
							"⚠️  WILDCARD AUTO-APPROVAL ENABLED - ALL COMMANDS WILL RUN WITHOUT PERMISSION!",
						);
					}
					this.autoApproved.add(cmd);
				});
				logger.info(
					`✓ Loaded ${this.autoApproved.size} auto-approved commands`,
				);
			}

			// Load always-ask commands (overrides autoApprove)
			if (Array.isArray(dcConfig.alwaysAsk)) {
				dcConfig.alwaysAsk.forEach((cmd: string) => this.alwaysAsk.add(cmd));
				logger.info(`✓ Loaded ${this.alwaysAsk.size} always-ask commands`);
			}
		} catch (error) {
			logger.error("Failed to load permission config:", error);
		}
	}

	/**
	 * Check if a command should be auto-approved
	 */
	public isAutoApproved(commandName: string): boolean {
		// Always-ask takes precedence
		if (this.alwaysAsk.has(commandName)) {
			return false;
		}

		// Check for wildcard
		if (this.autoApproved.has("*")) {
			return true;
		}

		// Check for exact match
		if (this.autoApproved.has(commandName)) {
			return true;
		}

		// Check for pattern match (e.g., "dc_*")
		for (const pattern of this.autoApproved) {
			if (pattern.includes("*")) {
				const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
				if (regex.test(commandName)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Get list of auto-approved commands
	 */
	public getAutoApproved(): string[] {
		return Array.from(this.autoApproved);
	}

	/**
	 * Get list of always-ask commands
	 */
	public getAlwaysAsk(): string[] {
		return Array.from(this.alwaysAsk);
	}

	/**
	 * Reload config from disk
	 */
	public reload(): void {
		this.autoApproved.clear();
		this.alwaysAsk.clear();
		this.loadConfig();
	}
}

// Singleton instance
let permissionManager: PermissionManager | null = null;

/**
 * Get or create the permission manager singleton
 */
export function getPermissionManager(): PermissionManager {
	if (!permissionManager) {
		permissionManager = new PermissionManager();
	}
	return permissionManager;
}
