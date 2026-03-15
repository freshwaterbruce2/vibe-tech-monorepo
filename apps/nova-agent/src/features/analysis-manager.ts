import crypto from "crypto";
import fs from "fs";
import path from "path";

const REVIEW_VERSION = "grounded-review-v1";
const DEFAULT_REVIEW_ARTIFACT_DIR = "D:\\databases\\nova-agent\\reviews";
const MAX_RELEVANT_ENTRIES = 24;
const TOP_LEVEL_DIRS = ["apps", "libs", "packages", "backend", "plugins", "projects"] as const;

const INVALID_PATH_REGEX = /[\0\r\n]/;
const VALID_FEATURE_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** Per-review filesystem cache to eliminate redundant syscalls. */
class FsCache {
	private existsCache = new Map<string, boolean>();
	private statCache = new Map<string, fs.Stats | null>();
	private readCache = new Map<string, string | null>();
	private readdirCache = new Map<string, fs.Dirent[]>();
	private jsonCache = new Map<string, unknown>();

	exists(p: string): boolean {
		let v = this.existsCache.get(p);
		if (v === undefined) {
			v = fs.existsSync(p);
			this.existsCache.set(p, v);
		}
		return v;
	}

	stat(p: string): fs.Stats | null {
		let v = this.statCache.get(p);
		if (v === undefined) {
			try {
				v = fs.statSync(p);
			} catch {
				v = null;
			}
			this.statCache.set(p, v);
		}
		return v;
	}

	isDirectory(p: string): boolean {
		return this.stat(p)?.isDirectory() === true;
	}

	readFile(p: string): string | null {
		let v = this.readCache.get(p);
		if (v === undefined) {
			try {
				v = fs.readFileSync(p, "utf-8");
			} catch {
				v = null;
			}
			this.readCache.set(p, v);
		}
		return v;
	}

	readdir(p: string): fs.Dirent[] {
		let v = this.readdirCache.get(p);
		if (v === undefined) {
			try {
				v = fs.readdirSync(p, { withFileTypes: true });
			} catch {
				v = [];
			}
			this.readdirCache.set(p, v);
		}
		return v;
	}

	readJson<T>(p: string): T | null {
		if (this.jsonCache.has(p)) return this.jsonCache.get(p) as T | null;
		const text = this.readFile(p);
		if (text === null) {
			this.jsonCache.set(p, null);
			return null;
		}
		try {
			const parsed = JSON.parse(text) as T;
			this.jsonCache.set(p, parsed);
			return parsed;
		} catch {
			this.jsonCache.set(p, null);
			return null;
		}
	}
}

type RepoType =
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

export class AnalysisManager {
	private validateCwd(cwd: string): string {
		if (!cwd || INVALID_PATH_REGEX.test(cwd)) {
			throw new Error("Invalid project path");
		}

		const resolvedCwd = path.resolve(cwd);
		let stat: fs.Stats;
		try {
			stat = fs.statSync(resolvedCwd);
		} catch {
			throw new Error(`Project path does not exist: ${resolvedCwd}`);
		}
		if (!stat.isDirectory()) {
			throw new Error(`Project path is not a directory: ${resolvedCwd}`);
		}

		return resolvedCwd;
	}

	private validateFeatureName(featureName: string): string {
		const trimmed = featureName.trim();
		if (!trimmed || !VALID_FEATURE_NAME_REGEX.test(trimmed)) {
			throw new Error("Invalid feature name");
		}
		return trimmed;
	}

	private getArtifactDirectory(): string {
		return path.resolve(
			process.env.NOVA_REVIEW_ARTIFACT_DIR || DEFAULT_REVIEW_ARTIFACT_DIR,
		);
	}

	private toRelative(basePath: string, candidatePath: string): string {
		const relative = path.relative(basePath, candidatePath);
		return relative && relative !== "" ? relative : ".";
	}

	private createEvidenceRecorder(basePath: string, fc: FsCache) {
		const seen = new Map<string, ReviewEvidence>();

		return {
			add: (candidatePath: string, reason: string) => {
				if (!candidatePath || !fc.exists(candidatePath)) {
					return;
				}
				const resolved = path.resolve(candidatePath);
				if (!resolved.startsWith(basePath)) {
					return;
				}
				if (!seen.has(resolved)) {
					seen.set(resolved, {
						path: resolved,
						relativePath: this.toRelative(basePath, resolved),
						reason,
					});
				}
			},
			list: () => Array.from(seen.values()).sort((a, b) => a.path.localeCompare(b.path)),
		};
	}

	private detectPackageManager(cwd: string, fc: FsCache): string | null {
		if (fc.exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
		if (fc.exists(path.join(cwd, "package-lock.json"))) return "npm";
		if (fc.exists(path.join(cwd, "yarn.lock"))) return "yarn";
		return null;
	}

	private collectRelevantEntries(cwd: string, evidence: ReturnType<AnalysisManager["createEvidenceRecorder"]>, fc: FsCache): string[] {
		const relevant = new Set<string>();

		for (const dirName of TOP_LEVEL_DIRS) {
			const dirPath = path.join(cwd, dirName);
			if (!fc.isDirectory(dirPath)) {
				continue;
			}
			evidence.add(dirPath, `top-level ${dirName} directory`);

			const children = fc.readdir(dirPath)
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(dirName, entry.name))
				.slice(0, MAX_RELEVANT_ENTRIES);

			for (const child of children) {
				relevant.add(child);
				evidence.add(path.join(cwd, child), `relevant ${dirName} entry`);
			}
		}

		const packageJsonPath = path.join(cwd, "package.json");
		if (fc.exists(packageJsonPath)) {
			const packageJson = fc.readJson<{ name?: string }>(packageJsonPath);
			if (packageJson?.name) {
				relevant.add(packageJson.name);
			} else {
				relevant.add(path.basename(cwd));
			}
			evidence.add(packageJsonPath, "package manifest");
		}

		const projectJsonPath = path.join(cwd, "project.json");
		if (fc.exists(projectJsonPath)) {
			const projectJson = fc.readJson<{ name?: string }>(projectJsonPath);
			if (projectJson?.name) {
				relevant.add(projectJson.name);
			}
			evidence.add(projectJsonPath, "Nx project definition");
		}

		const srcTauriPath = path.join(cwd, "src-tauri");
		if (fc.isDirectory(srcTauriPath)) {
			relevant.add(`${path.basename(cwd)}/src-tauri`);
			evidence.add(srcTauriPath, "Tauri backend");
		}

		return Array.from(relevant).slice(0, MAX_RELEVANT_ENTRIES);
	}

	private collectKeyConfigFiles(cwd: string, evidence: ReturnType<AnalysisManager["createEvidenceRecorder"]>, fc: FsCache): string[] {
		const candidates = [
			".git",
			"AGENTS.md",
			"CLAUDE.md",
			"README.md",
			"package.json",
			"project.json",
			"nx.json",
			"pnpm-workspace.yaml",
			"tsconfig.json",
			"tsconfig.base.json",
			"vite.config.ts",
			"vitest.config.ts",
			"Cargo.toml",
			path.join("src-tauri", "Cargo.toml"),
			path.join("src-tauri", "tauri.conf.json"),
		];

		return candidates.filter((candidate) => {
			const candidatePath = path.join(cwd, candidate);
			if (!fc.exists(candidatePath)) {
				return false;
			}
			evidence.add(candidatePath, "key config or documentation file");
			return true;
		});
	}

	private collectBuildSignals(
		cwd: string,
		evidence: ReturnType<AnalysisManager["createEvidenceRecorder"]>,
		fc: FsCache,
	): BuildSignal[] {
		const signals: BuildSignal[] = [];

		const addSignal = (type: string, relativePath: string, details?: string) => {
			const absolutePath = path.join(cwd, relativePath);
			if (!fc.exists(absolutePath)) {
				return;
			}
			evidence.add(absolutePath, `${type} signal`);
			signals.push({
				type,
				path: absolutePath,
				details,
			});
		};

		addSignal("git", ".git");
		addSignal("nx", "nx.json");
		addSignal("pnpm-workspace", "pnpm-workspace.yaml");
		addSignal("node-package", "package.json");
		addSignal("nx-project", "project.json");
		addSignal("vite", "vite.config.ts");
		addSignal("vitest", "vitest.config.ts");
		addSignal("cargo", "Cargo.toml");
		addSignal("cargo", path.join("src-tauri", "Cargo.toml"));
		addSignal("tauri", path.join("src-tauri", "tauri.conf.json"));

		return signals;
	}

	private collectDependencySummary(
		cwd: string,
		evidence: ReturnType<AnalysisManager["createEvidenceRecorder"]>,
		fc: FsCache,
	): DependencySummary {
		const dependencySummary: DependencySummary = {
			packageManager: this.detectPackageManager(cwd, fc),
			packageName: null,
			dependencyCount: 0,
			devDependencyCount: 0,
			scripts: [],
			cargoPackageName: null,
		};

		const packageJsonPath = path.join(cwd, "package.json");
		if (fc.exists(packageJsonPath)) {
			const packageJson = fc.readJson<{
				name?: string;
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
				scripts?: Record<string, string>;
			}>(packageJsonPath);

			if (packageJson) {
				dependencySummary.packageName = packageJson.name || null;
				dependencySummary.dependencyCount = Object.keys(
					packageJson.dependencies || {},
				).length;
				dependencySummary.devDependencyCount = Object.keys(
					packageJson.devDependencies || {},
				).length;
				dependencySummary.scripts = Object.keys(packageJson.scripts || {}).slice(
					0,
					10,
				);
				evidence.add(packageJsonPath, "dependency summary source");
			}
		}

		const cargoTomlPath = fc.exists(path.join(cwd, "Cargo.toml"))
			? path.join(cwd, "Cargo.toml")
			: path.join(cwd, "src-tauri", "Cargo.toml");
		if (fc.exists(cargoTomlPath)) {
			const cargoText = fc.readFile(cargoTomlPath);
			if (cargoText) {
				const match = cargoText.match(/^\s*name\s*=\s*"([^"]+)"/m);
				dependencySummary.cargoPackageName = match?.[1] || null;
				evidence.add(cargoTomlPath, "cargo manifest");
			}
		}

		return dependencySummary;
	}

	private determineRepoType(cwd: string, fc: FsCache): RepoType {
		if (fc.exists(path.join(cwd, "nx.json"))) return "nx-workspace";
		if (fc.exists(path.join(cwd, "src-tauri", "tauri.conf.json")))
			return "tauri-project";
		if (fc.exists(path.join(cwd, "Cargo.toml"))) return "rust-project";
		if (fc.exists(path.join(cwd, "package.json"))) return "node-project";
		return "directory";
	}

	private collectTopRisks(
		cwd: string,
		buildSignals: BuildSignal[],
		keyConfigFiles: string[],
		dependencySummary: DependencySummary,
		fc: FsCache,
	): string[] {
		const risks: string[] = [];
		const signalTypes = new Set(buildSignals.map((signal) => signal.type));

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
		if (
			dependencySummary.packageManager === null &&
			dependencySummary.packageName !== null
		) {
			risks.push(
				"package.json exists, but no lockfile or package-manager signal was found.",
			);
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

	private collectUnknowns(
		buildSignals: BuildSignal[],
		dependencySummary: DependencySummary,
	): string[] {
		const unknowns: string[] = [];

		if (
			dependencySummary.packageName === null &&
			dependencySummary.cargoPackageName === null
		) {
			unknowns.push("Unable to determine a package or crate name from manifests.");
		}
		if (!buildSignals.some((signal) => signal.type === "git")) {
			unknowns.push("Git history and branch context are unavailable from this path.");
		}
		if (buildSignals.length === 0) {
			unknowns.push("No build-system signals were detected in the reviewed path.");
		}

		return unknowns;
	}

	private static artifactDirCreated = false;

	private createArtifactFilePath(cwd: string): string {
		const artifactDir = this.getArtifactDirectory();
		if (!AnalysisManager.artifactDirCreated) {
			fs.mkdirSync(artifactDir, { recursive: true });
			AnalysisManager.artifactDirCreated = true;
		}

		const normalizedPath = cwd.toLowerCase();
		const hash = crypto.createHash("sha1").update(normalizedPath).digest("hex");
		const safeName = path
			.basename(cwd)
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, "-")
			.replace(/^-+|-+$/g, "");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

		return path.join(artifactDir, `${safeName || "project"}-${hash}-${timestamp}.json`);
	}

	private writeArtifact(artifact: Omit<ProjectReviewArtifact, "artifactPath">): ProjectReviewArtifact {
		const artifactPath = this.createArtifactFilePath(artifact.reviewedPath);
		const completeArtifact: ProjectReviewArtifact = {
			...artifact,
			artifactPath,
		};

		fs.writeFileSync(artifactPath, JSON.stringify(completeArtifact, null, 2), "utf-8");
		return completeArtifact;
	}

	formatReviewSummary(
		review: ProjectReviewArtifact,
		dependencySuggestions: string[] = [],
	): string {
		const lines = [
			`Project Review for ${review.workspaceName}`,
			`- Path: ${review.reviewedPath}`,
			`- Repo Type: ${review.repoType}`,
			`- Build Signals: ${
				review.buildSignals.length > 0
					? review.buildSignals.map((signal) => signal.type).join(", ")
					: "none detected"
			}`,
			`- Relevant Entries: ${
				review.relevantEntries.length > 0
					? review.relevantEntries.join(", ")
					: "none detected"
			}`,
			`- Key Config Files: ${
				review.keyConfigFiles.length > 0
					? review.keyConfigFiles.join(", ")
					: "none detected"
			}`,
			`- Dependency Summary: package=${review.dependencySummary.packageName || "n/a"}, deps=${review.dependencySummary.dependencyCount}, devDeps=${review.dependencySummary.devDependencyCount}, scripts=${review.dependencySummary.scripts.length}`,
			`- Top Risks: ${
				review.topRisks.length > 0 ? review.topRisks.join(" | ") : "none"
			}`,
			`- Unknowns: ${
				review.unknowns.length > 0 ? review.unknowns.join(" | ") : "none"
			}`,
			`- Evidence Count: ${review.evidenceCount}`,
			`- Artifact Path: ${review.artifactPath}`,
		];

		if (dependencySuggestions.length > 0) {
			lines.push(
				`- Dependency Suggestions: ${dependencySuggestions.join(" | ")}`,
			);
		}

		return lines.join("\n");
	}

	async reviewProject(cwd: string): Promise<ProjectReviewArtifact> {
		const resolvedCwd = this.validateCwd(cwd);
		const fc = new FsCache();
		const evidence = this.createEvidenceRecorder(resolvedCwd, fc);

		evidence.add(resolvedCwd, "review root");

		const buildSignals = this.collectBuildSignals(resolvedCwd, evidence, fc);
		const relevantEntries = this.collectRelevantEntries(resolvedCwd, evidence, fc);
		const keyConfigFiles = this.collectKeyConfigFiles(resolvedCwd, evidence, fc);
		const dependencySummary = this.collectDependencySummary(resolvedCwd, evidence, fc);
		const repoType = this.determineRepoType(resolvedCwd, fc);
		const topRisks = this.collectTopRisks(
			resolvedCwd,
			buildSignals,
			keyConfigFiles,
			dependencySummary,
			fc,
		);
		const unknowns = this.collectUnknowns(buildSignals, dependencySummary);
		const collectedEvidence = evidence.list();

		if (collectedEvidence.length === 0) {
			throw new Error("Project review produced no evidence. Review is not grounded.");
		}

		return this.writeArtifact({
			reviewVersion: REVIEW_VERSION,
			reviewedAt: new Date().toISOString(),
			workspaceName: path.basename(resolvedCwd),
			reviewedPath: resolvedCwd,
			repoType,
			buildSignals,
			relevantEntries,
			keyConfigFiles,
			dependencySummary,
			topRisks,
			unknowns,
			evidence: collectedEvidence,
			evidenceCount: collectedEvidence.length,
		});
	}

	async analyzeProject(cwd: string): Promise<string> {
		const review = await this.reviewProject(cwd);
		return this.formatReviewSummary(review);
	}

	async scaffoldFeature(
		cwd: string,
		featureName: string,
		type: "react-component",
	): Promise<string> {
		if (type === "react-component") {
			const resolvedCwd = this.validateCwd(cwd);
			const safeFeatureName = this.validateFeatureName(featureName);
			const compDir = path.join(resolvedCwd, "src", "components");
			if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });

			const compFile = path.join(compDir, `${safeFeatureName}.tsx`);
			const content = `import React from 'react';\n\nexport const ${safeFeatureName} = () => {\n  return <div>${safeFeatureName}</div>;\n};\n`;

			fs.writeFileSync(compFile, content);
			return `Created ${compFile}`;
		}
		return "Unknown scaffold type";
	}
}
