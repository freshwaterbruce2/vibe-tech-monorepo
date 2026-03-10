// Direct Nx workspace file parsing service
// Reads nx.json and project.json files from C:\dev

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

interface NxJson {
	version?: number;
	targetDefaults?: Record<string, any>;
	namedInputs?: Record<string, any>;
	affected?: any;
	tasksRunnerOptions?: Record<string, any>;
}

interface ProjectJson {
	name?: string;
	root?: string;
	sourceRoot?: string;
	projectType?: string;
	targets?: Record<string, any>;
	tags?: string[];
}

interface WorkspaceData {
	projects: Record<string, ProjectJson>;
	version?: number;
	nxJson?: NxJson;
}

const WORKSPACE_ROOT = "C:\\dev";

export async function getWorkspaceData(
	filter?: string,
): Promise<WorkspaceData> {
	try {
		// Read nx.json for workspace configuration
		const nxJsonPath = path.join(WORKSPACE_ROOT, "nx.json");
		let nxJson: NxJson = {};

		try {
			const nxJsonContent = await fs.readFile(nxJsonPath, "utf-8");
			nxJson = JSON.parse(nxJsonContent);
		} catch (error) {
			console.warn("[WorkspaceService] nx.json not found or invalid:", error);
		}

		// Find all project.json files
		const projectFiles = await glob("**/project.json", {
			cwd: WORKSPACE_ROOT,
			ignore: ["**/node_modules/**", "**/.nx/**", "**/dist/**"],
			absolute: false,
		});

		console.log(
			`[WorkspaceService] Found ${projectFiles.length} project.json files`,
		);

		// Parse each project
		const projects: Record<string, ProjectJson> = {};

		for (const file of projectFiles) {
			try {
				const fullPath = path.join(WORKSPACE_ROOT, file);
				const content = await fs.readFile(fullPath, "utf-8");
				const projectConfig: ProjectJson = JSON.parse(content);

				// Extract project name from path (last directory before project.json)
				const projectRoot = path.dirname(file);
				const projectName = projectConfig.name || path.basename(projectRoot);

				// Apply filter if provided
				if (filter && !projectName.includes(filter)) {
					continue;
				}

				// Enrich project data
				projects[projectName] = {
					name: projectName,
					root: projectRoot,
					sourceRoot: projectConfig.sourceRoot,
					projectType: projectConfig.projectType,
					targets: projectConfig.targets || {},
					tags: projectConfig.tags || [],
					...projectConfig,
				};
			} catch (error) {
				console.warn(`[WorkspaceService] Failed to parse ${file}:`, error);
			}
		}

		console.log(
			`[WorkspaceService] Loaded ${Object.keys(projects).length} projects`,
		);

		return {
			projects,
			version: nxJson.version || 2,
			nxJson,
		};
	} catch (error) {
		console.error("[WorkspaceService] Failed to load workspace data:", error);

		// Return empty workspace on error
		return {
			projects: {},
			version: 2,
		};
	}
}

// Get list of project names only (lightweight)
export async function getProjectNames(): Promise<string[]> {
	try {
		const workspace = await getWorkspaceData();
		return Object.keys(workspace.projects);
	} catch (error) {
		console.error("[WorkspaceService] Failed to get project names:", error);
		return [];
	}
}

// Get single project details
export async function getProject(
	projectName: string,
): Promise<ProjectJson | null> {
	try {
		const workspace = await getWorkspaceData();
		return workspace.projects[projectName] || null;
	} catch (error) {
		console.error(
			`[WorkspaceService] Failed to get project ${projectName}:`,
			error,
		);
		return null;
	}
}
