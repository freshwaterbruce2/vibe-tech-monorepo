// Nx workspace data fetching service

import type { AffectedProjects, Project, ProjectGraph } from "../types";
import { mcpClient } from "./mcpClient";

export const nxService = {
	/**
	 * Get all workspace projects with optional filtering
	 */
	async getWorkspaceProjects(
		filter?: string,
	): Promise<Record<string, Project>> {
		try {
			const workspace = await mcpClient.callNxWorkspace(filter);
			return workspace.projects;
		} catch (error) {
			console.error("[NxService] getWorkspaceProjects failed:", error);
			throw error;
		}
	},

	/**
	 * Get affected projects based on Git changes
	 */
	async getAffectedProjects(base: string = "main"): Promise<AffectedProjects> {
		try {
			const result = await window.mcp.call("nx_affected", { base });
			return {
				projects: result.projects ?? [],
				tasks: result.tasks ?? [],
			};
		} catch (error) {
			console.error("[NxService] getAffectedProjects failed:", error);
			// Return empty arrays if failed (graceful degradation)
			return {
				projects: [],
				tasks: [],
			};
		}
	},

	/**
	 * Get project graph for visualization
	 */
	async getProjectGraph(): Promise<ProjectGraph | null> {
		try {
			const result = await window.mcp.call("nx_graph", {});
			return result as ProjectGraph;
		} catch (error) {
			console.error("[NxService] getProjectGraph failed:", error);
			return null;
		}
	},

	/**
	 * Get Nx cache statistics
	 */
	async getCacheStats(): Promise<{
		hitRate: number;
		size: number;
		fileCount: number;
	}> {
		try {
			// Query .nx/cache directory via filesystem MCP
			const cacheDir = await mcpClient.callFilesystem("C:\\dev\\.nx\\cache", {
				recursive: true,
				withSizes: true,
			});

			const files = cacheDir.files ?? [];
			const totalSize = files.reduce(
				(sum: number, file: any) => sum + (file.size ?? 0),
				0,
			);

			// Estimate hit rate from recent builds (would need Nx Cloud API for real data)
			// For now, return placeholder
			return {
				hitRate: 75, // Placeholder - integrate with Nx Cloud later
				size: totalSize,
				fileCount: files.length,
			};
		} catch (error) {
			console.error("[NxService] getCacheStats failed:", error);
			return {
				hitRate: 0,
				size: 0,
				fileCount: 0,
			};
		}
	},

	/**
	 * Get project details by name
	 */
	async getProjectDetails(projectName: string): Promise<Project | null> {
		try {
			const result = await window.mcp.call("nx_project_details", {
				projectName,
			});
			return result as Project;
		} catch (error) {
			console.error(
				`[NxService] getProjectDetails ${projectName} failed:`,
				error,
			);
			return null;
		}
	},

	/**
	 * Categorize projects by type (AI, Desktop, Trading, Web, etc.)
	 */
	categorizeProjects(
		projects: Record<string, Project>,
	): Record<string, Project[]> {
		const categories = {
			AI: [] as Project[],
			Desktop: [] as Project[],
			Trading: [] as Project[],
			Web: [] as Project[],
			Mobile: [] as Project[],
			Backend: [] as Project[],
			Libs: [] as Project[],
			External: [] as Project[],
		};

		for (const [name, project] of Object.entries(projects)) {
			// Determine category based on tags, name, or path
			const tags = project.tags ?? [];
			const root = project.root.toLowerCase();

			if (
				tags.includes("type:ai") ||
				name.includes("nova") ||
				name.includes("ai")
			) {
				categories.AI.push({ ...project, name });
			} else if (tags.includes("type:desktop") || root.includes("desktop")) {
				categories.Desktop.push({ ...project, name });
			} else if (tags.includes("scope:trading") || name.includes("crypto")) {
				categories.Trading.push({ ...project, name });
			} else if (
				tags.includes("type:app") ||
				(root.includes("apps") && !root.includes("backend"))
			) {
				categories.Web.push({ ...project, name });
			} else if (
				tags.includes("type:mobile") ||
				name.includes("tutor") ||
				name.includes("mobile")
			) {
				categories.Mobile.push({ ...project, name });
			} else if (root.includes("backend")) {
				categories.Backend.push({ ...project, name });
			} else if (
				root.includes("packages") ||
				project.projectType === "library"
			) {
				categories.Libs.push({ ...project, name });
			} else {
				categories.External.push({ ...project, name });
			}
		}

		// Remove empty categories
		return Object.fromEntries(
			Object.entries(categories).filter(([_, projects]) => projects.length > 0),
		);
	},
};
