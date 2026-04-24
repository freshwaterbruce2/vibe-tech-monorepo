import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FsCache } from "./analysis-fs-cache";
import {
	DEFAULT_REVIEW_ARTIFACT_DIR,
	INVALID_PATH_REGEX,
	MAX_RELEVANT_ENTRIES,
	REVIEW_VERSION,
	TOP_LEVEL_DIRS,
	VALID_FEATURE_NAME_REGEX,
	type BuildSignal,
	type DependencySummary,
	type ProjectReviewArtifact,
	type RepoType,
} from "./analysis-types";
import {
	collectTopRisks,
	collectUnknowns,
	createEvidenceRecorder,
	formatReviewSummary,
} from "./analysis-utils";

export type { BuildSignal, DependencySummary, ProjectReviewArtifact, ReviewEvidence } from "./analysis-types";

export class AnalysisManager {
	private validateCwd(cwd: string): string {
		if (!cwd || INVALID_PATH_REGEX.test(cwd)) throw new Error("Invalid project path");
		const resolvedCwd = path.resolve(cwd);
		let stat: fs.Stats;
		try { stat = fs.statSync(resolvedCwd); } catch { throw new Error(`Project path does not exist: ${resolvedCwd}`); }
		if (!stat.isDirectory()) throw new Error(`Project path is not a directory: ${resolvedCwd}`);
		return resolvedCwd;
	}

	private validateFeatureName(featureName: string): string {
		const trimmed = featureName.trim();
		if (!trimmed || !VALID_FEATURE_NAME_REGEX.test(trimmed)) throw new Error("Invalid feature name");
		return trimmed;
	}

	private getArtifactDirectory(): string {
		return path.resolve(process.env.NOVA_REVIEW_ARTIFACT_DIR ?? DEFAULT_REVIEW_ARTIFACT_DIR);
	}

	private detectPackageManager(cwd: string, fc: FsCache): string | null {
		if (fc.exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
		if (fc.exists(path.join(cwd, "package-lock.json"))) return "npm";
		if (fc.exists(path.join(cwd, "yarn.lock"))) return "yarn";
		return null;
	}

	private collectRelevantEntries(
		cwd: string,
		evidence: ReturnType<typeof createEvidenceRecorder>,
		fc: FsCache,
	): string[] {
		const relevant = new Set<string>();

		for (const dirName of TOP_LEVEL_DIRS) {
			const dirPath = path.join(cwd, dirName);
			if (!fc.isDirectory(dirPath)) continue;
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
			relevant.add(packageJson?.name ?? path.basename(cwd));
			evidence.add(packageJsonPath, "package manifest");
		}

		const projectJsonPath = path.join(cwd, "project.json");
		if (fc.exists(projectJsonPath)) {
			const projectJson = fc.readJson<{ name?: string }>(projectJsonPath);
			if (projectJson?.name) relevant.add(projectJson.name);
			evidence.add(projectJsonPath, "Nx project definition");
		}

		const srcTauriPath = path.join(cwd, "src-tauri");
		if (fc.isDirectory(srcTauriPath)) {
			relevant.add(`${path.basename(cwd)}/src-tauri`);
			evidence.add(srcTauriPath, "Tauri backend");
		}

		return Array.from(relevant).slice(0, MAX_RELEVANT_ENTRIES);
	}

	private collectKeyConfigFiles(
		cwd: string,
		evidence: ReturnType<typeof createEvidenceRecorder>,
		fc: FsCache,
	): string[] {
		const candidates = [
			".git", "AGENTS.md", "CLAUDE.md", "README.md", "package.json",
			"project.json", "nx.json", "pnpm-workspace.yaml", "tsconfig.json",
			"tsconfig.base.json", "vite.config.ts", "vitest.config.ts", "Cargo.toml",
			path.join("src-tauri", "Cargo.toml"),
			path.join("src-tauri", "tauri.conf.json"),
		];

		return candidates.filter((candidate) => {
			const candidatePath = path.join(cwd, candidate);
			if (!fc.exists(candidatePath)) return false;
			evidence.add(candidatePath, "key config or documentation file");
			return true;
		});
	}

	private collectBuildSignals(
		cwd: string,
		evidence: ReturnType<typeof createEvidenceRecorder>,
		fc: FsCache,
	): BuildSignal[] {
		const signals: BuildSignal[] = [];
		const addSignal = (type: string, relativePath: string, details?: string) => {
			const absolutePath = path.join(cwd, relativePath);
			if (!fc.exists(absolutePath)) return;
			evidence.add(absolutePath, `${type} signal`);
			signals.push({ type, path: absolutePath, details });
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
		evidence: ReturnType<typeof createEvidenceRecorder>,
		fc: FsCache,
	): DependencySummary {
		const summary: DependencySummary = {
			packageManager: this.detectPackageManager(cwd, fc),
			packageName: null, dependencyCount: 0, devDependencyCount: 0,
			scripts: [], cargoPackageName: null,
		};

		const packageJsonPath = path.join(cwd, "package.json");
		if (fc.exists(packageJsonPath)) {
			const pkg = fc.readJson<{
				name?: string; dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>; scripts?: Record<string, string>;
			}>(packageJsonPath);
			if (pkg) {
				summary.packageName = pkg.name ?? null;
				summary.dependencyCount = Object.keys(pkg.dependencies ?? {}).length;
				summary.devDependencyCount = Object.keys(pkg.devDependencies ?? {}).length;
				summary.scripts = Object.keys(pkg.scripts ?? {}).slice(0, 10);
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
				summary.cargoPackageName = match?.[1] ?? null;
				evidence.add(cargoTomlPath, "cargo manifest");
			}
		}

		return summary;
	}

	private determineRepoType(cwd: string, fc: FsCache): RepoType {
		if (fc.exists(path.join(cwd, "nx.json"))) return "nx-workspace";
		if (fc.exists(path.join(cwd, "src-tauri", "tauri.conf.json"))) return "tauri-project";
		if (fc.exists(path.join(cwd, "Cargo.toml"))) return "rust-project";
		if (fc.exists(path.join(cwd, "package.json"))) return "node-project";
		return "directory";
	}

	private static artifactDirCreated = false;

	private createArtifactFilePath(cwd: string): string {
		const artifactDir = this.getArtifactDirectory();
		if (!AnalysisManager.artifactDirCreated) {
			fs.mkdirSync(artifactDir, { recursive: true });
			AnalysisManager.artifactDirCreated = true;
		}
		const hash = crypto.createHash("sha1").update(cwd.toLowerCase()).digest("hex");
		const safeName = path.basename(cwd).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return path.join(artifactDir, `${safeName || "project"}-${hash}-${timestamp}.json`);
	}

	private writeArtifact(artifact: Omit<ProjectReviewArtifact, "artifactPath">): ProjectReviewArtifact {
		const artifactPath = this.createArtifactFilePath(artifact.reviewedPath);
		const complete: ProjectReviewArtifact = { ...artifact, artifactPath };
		fs.writeFileSync(artifactPath, JSON.stringify(complete, null, 2), "utf-8");
		return complete;
	}

	formatReviewSummary = formatReviewSummary;

	async reviewProject(cwd: string): Promise<ProjectReviewArtifact> {
		const resolvedCwd = this.validateCwd(cwd);
		const fc = new FsCache();
		const evidence = createEvidenceRecorder(resolvedCwd, fc);
		evidence.add(resolvedCwd, "review root");

		const buildSignals = this.collectBuildSignals(resolvedCwd, evidence, fc);
		const relevantEntries = this.collectRelevantEntries(resolvedCwd, evidence, fc);
		const keyConfigFiles = this.collectKeyConfigFiles(resolvedCwd, evidence, fc);
		const dependencySummary = this.collectDependencySummary(resolvedCwd, evidence, fc);
		const repoType = this.determineRepoType(resolvedCwd, fc);
		const topRisks = collectTopRisks(resolvedCwd, buildSignals, keyConfigFiles, dependencySummary, fc);
		const unknowns = collectUnknowns(buildSignals, dependencySummary);
		const collectedEvidence = evidence.list();

		if (collectedEvidence.length === 0) {
			throw new Error("Project review produced no evidence. Review is not grounded.");
		}

		return this.writeArtifact({
			reviewVersion: REVIEW_VERSION, reviewedAt: new Date().toISOString(),
			workspaceName: path.basename(resolvedCwd), reviewedPath: resolvedCwd,
			repoType, buildSignals, relevantEntries, keyConfigFiles, dependencySummary,
			topRisks, unknowns, evidence: collectedEvidence, evidenceCount: collectedEvidence.length,
		});
	}

	async analyzeProject(cwd: string): Promise<string> {
		const review = await this.reviewProject(cwd);
		return formatReviewSummary(review);
	}

	async scaffoldFeature(cwd: string, featureName: string, type: "react-component"): Promise<string> {
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
