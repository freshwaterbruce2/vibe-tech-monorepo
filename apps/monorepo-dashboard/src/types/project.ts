// Project type definitions for Nx workspace projects

export type ProjectType = "application" | "library" | "e2e" | (string & {});

export type ProjectCategory =
	| "AI"
	| "Desktop"
	| "Trading"
	| "Web"
	| "Mobile"
	| "Libs"
	| "External"
	| "Backend";

export type ProjectStatus = "healthy" | "warning" | "critical";

export interface Project {
	name: string;
	root: string;
	sourceRoot?: string;
	projectType?: ProjectType;
	tags?: string[];
	targets?: Record<string, ProjectTarget>;
	implicitDependencies?: string[];
	category?: ProjectCategory;
	status?: ProjectStatus;
	dependencyCount?: number;
	issueCount?: number;
}

export interface ProjectTarget {
	executor: string;
	options?: Record<string, unknown>;
	configurations?: Record<string, Record<string, unknown>>;
	dependsOn?: string[];
	outputs?: string[];
}

export interface ProjectGraph {
	nodes: Record<string, ProjectGraphNode>;
	dependencies: Record<string, ProjectGraphDependency[]>;
	version: string;
}

export interface ProjectGraphNode {
	name: string;
	type: ProjectType;
	data: Project;
}

export interface ProjectGraphDependency {
	source: string;
	target: string;
	type: "static" | "dynamic" | "implicit";
}

export interface AffectedProjects {
	projects: string[];
	tasks: string[];
}

export interface ProjectHealth {
	projectName: string;
	status: ProjectStatus;
	issues: ProjectIssue[];
	lastChecked: Date;
}

export interface ProjectIssue {
	severity: "error" | "warning" | "info";
	message: string;
	file?: string;
	line?: number;
}

export interface WorkspaceMetrics {
	totalProjects: number;
	healthyProjects: number;
	warningProjects: number;
	criticalProjects: number;
	totalDependencies: number;
	configIssues: number;
}
