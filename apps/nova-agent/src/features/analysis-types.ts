export const REVIEW_VERSION = "grounded-review-v1";
export const DEFAULT_REVIEW_ARTIFACT_DIR = "D:\\databases\\nova-agent\\reviews";
export const MAX_RELEVANT_ENTRIES = 24;
export const TOP_LEVEL_DIRS = ["apps", "libs", "packages", "backend", "plugins", "projects"] as const;

export const INVALID_PATH_REGEX = /[\0\r\n]/;
export const VALID_FEATURE_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_-]*$/;

export type RepoType =
	| "nx-workspace"
	| "node-project"
	| "rust-project"
	| "tauri-project"
	| "directory";

export interface ReviewEvidence {
	path: string;
	relativePath: string;
	reason: string;
}

export interface BuildSignal {
	type: string;
	path: string;
	details?: string;
}

export interface DependencySummary {
	packageManager: string | null;
	packageName: string | null;
	dependencyCount: number;
	devDependencyCount: number;
	scripts: string[];
	cargoPackageName: string | null;
}

export interface ProjectReviewArtifact {
	reviewVersion: string;
	reviewedAt: string;
	workspaceName: string;
	reviewedPath: string;
	repoType: RepoType;
	buildSignals: BuildSignal[];
	relevantEntries: string[];
	keyConfigFiles: string[];
	dependencySummary: DependencySummary;
	topRisks: string[];
	unknowns: string[];
	evidence: ReviewEvidence[];
	evidenceCount: number;
	artifactPath: string;
}
