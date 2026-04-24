import path from "path";
import type { FsCache } from "./analysis-fs-cache";
import type {
	BuildSignal,
	DependencySummary,
	ProjectReviewArtifact,
	ReviewEvidence,
} from "./analysis-types";

export function createEvidenceRecorder(basePath: string, fc: FsCache) {
	const seen = new Map<string, ReviewEvidence>();

	return {
		add: (candidatePath: string, reason: string) => {
			if (!candidatePath || !fc.exists(candidatePath)) return;
			const resolved = path.resolve(candidatePath);
			if (!resolved.startsWith(basePath)) return;
			if (!seen.has(resolved)) {
				seen.set(resolved, {
					path: resolved,
					relativePath: toRelative(basePath, resolved),
					reason,
				});
			}
		},
		list: () => Array.from(seen.values()).sort((a, b) => a.path.localeCompare(b.path)),
	};
}

export function toRelative(basePath: string, candidatePath: string): string {
	const relative = path.relative(basePath, candidatePath);
	return relative && relative !== "" ? relative : ".";
}

export function collectTopRisks(
	cwd: string,
	buildSignals: BuildSignal[],
	keyConfigFiles: string[],
	dependencySummary: DependencySummary,
	fc: FsCache,
): string[] {
	const risks: string[] = [];
	const signalTypes = new Set(buildSignals.map((s) => s.type));

	if (!signalTypes.has("node-package") && !signalTypes.has("cargo")) {
		risks.push("No standard Node or Cargo manifest was found in the reviewed path.");
	}
	if (!signalTypes.has("git")) {
		risks.push("The reviewed path is not a Git repository root.");
	}
	if (
		!signalTypes.has("vitest") &&
		!fc.exists(path.join(cwd, "jest.config.js")) &&
		!fc.exists(path.join(cwd, "jest.config.ts"))
	) {
		risks.push("No obvious automated test configuration was found.");
	}
	if (dependencySummary.packageManager === null && dependencySummary.packageName !== null) {
		risks.push("package.json exists, but no lockfile or package-manager signal was found.");
	}
	if (
		!keyConfigFiles.includes("README.md") &&
		!keyConfigFiles.includes("AGENTS.md") &&
		!keyConfigFiles.includes("CLAUDE.md")
	) {
		risks.push("No local README/AGENTS/CLAUDE guidance file was found.");
	}

	return risks;
}

export function collectUnknowns(
	buildSignals: BuildSignal[],
	dependencySummary: DependencySummary,
): string[] {
	const unknowns: string[] = [];

	if (dependencySummary.packageName === null && dependencySummary.cargoPackageName === null) {
		unknowns.push("Unable to determine a package or crate name from manifests.");
	}
	if (!buildSignals.some((s) => s.type === "git")) {
		unknowns.push("Git history and branch context are unavailable from this path.");
	}
	if (buildSignals.length === 0) {
		unknowns.push("No build-system signals were detected in the reviewed path.");
	}

	return unknowns;
}

export function formatReviewSummary(
	review: ProjectReviewArtifact,
	dependencySuggestions: string[] = [],
): string {
	const lines = [
		`Project Review for ${review.workspaceName}`,
		`- Path: ${review.reviewedPath}`,
		`- Repo Type: ${review.repoType}`,
		`- Build Signals: ${review.buildSignals.length > 0 ? review.buildSignals.map((s) => s.type).join(", ") : "none detected"}`,
		`- Relevant Entries: ${review.relevantEntries.length > 0 ? review.relevantEntries.join(", ") : "none detected"}`,
		`- Key Config Files: ${review.keyConfigFiles.length > 0 ? review.keyConfigFiles.join(", ") : "none detected"}`,
		`- Dependency Summary: package=${review.dependencySummary.packageName ?? "n/a"}, deps=${review.dependencySummary.dependencyCount}, devDeps=${review.dependencySummary.devDependencyCount}, scripts=${review.dependencySummary.scripts.length}`,
		`- Top Risks: ${review.topRisks.length > 0 ? review.topRisks.join(" | ") : "none"}`,
		`- Unknowns: ${review.unknowns.length > 0 ? review.unknowns.join(" | ") : "none"}`,
		`- Evidence Count: ${review.evidenceCount}`,
		`- Artifact Path: ${review.artifactPath}`,
	];

	if (dependencySuggestions.length > 0) {
		lines.push(`- Dependency Suggestions: ${dependencySuggestions.join(" | ")}`);
	}

	return lines.join("\n");
}
