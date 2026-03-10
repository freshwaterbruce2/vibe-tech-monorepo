// Dependency type definitions for dependency management

export type UpdateSeverity = "patch" | "minor" | "major";

export interface DependencyUpdate {
	packageName: string;
	currentVersion: string;
	latestVersion: string;
	severity: UpdateSeverity;
	breaking: boolean;
	securityVulnerability: boolean;
	affectedProjects: string[];
	changelog?: string;
}

export interface DependencyMetrics {
	totalDependencies: number;
	outdatedDependencies: number;
	patchUpdates: number;
	minorUpdates: number;
	majorUpdates: number;
	securityVulnerabilities: number;
}

export interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}
