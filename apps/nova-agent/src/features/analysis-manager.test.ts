import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalysisManager } from "./analysis-manager";

describe("AnalysisManager grounded review", () => {
	let tempRoot = "";
	let artifactRoot = "";

	beforeEach(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nova-review-project-"));
		artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nova-review-artifacts-"));
		process.env.NOVA_REVIEW_ARTIFACT_DIR = artifactRoot;
	});

	afterEach(() => {
		delete process.env.NOVA_REVIEW_ARTIFACT_DIR;
		fs.rmSync(tempRoot, { recursive: true, force: true });
		fs.rmSync(artifactRoot, { recursive: true, force: true });
	});

	it("creates a grounded artifact for an Nx workspace", async () => {
		fs.writeFileSync(path.join(tempRoot, "nx.json"), "{}");
		fs.writeFileSync(
			path.join(tempRoot, "package.json"),
			JSON.stringify(
				{
					name: "workspace-root",
					scripts: { test: "vitest run", build: "nx build" },
					dependencies: { react: "^19.0.0" },
					devDependencies: { vitest: "^4.0.0", nx: "^22.0.0" },
				},
				null,
				2,
			),
		);
		fs.writeFileSync(path.join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
		fs.mkdirSync(path.join(tempRoot, "apps", "demo"), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, "apps", "demo", "project.json"),
			JSON.stringify({ name: "demo" }, null, 2),
		);

		const manager = new AnalysisManager();
		const review = await manager.reviewProject(tempRoot);

		expect(review.repoType).toBe("nx-workspace");
		expect(review.relevantEntries).toContain(path.join("apps", "demo"));
		expect(review.keyConfigFiles).toContain("nx.json");
		expect(review.evidenceCount).toBeGreaterThan(2);
		expect(review.evidence.some((item) => item.relativePath === "nx.json")).toBe(true);
		expect(fs.existsSync(review.artifactPath)).toBe(true);
	});

	it("creates a minimal grounded artifact for a non-Nx node project", async () => {
		fs.writeFileSync(
			path.join(tempRoot, "package.json"),
			JSON.stringify(
				{
					name: "plain-node-app",
					scripts: { dev: "node index.js" },
					dependencies: { express: "^5.0.0" },
				},
				null,
				2,
			),
		);
		fs.writeFileSync(path.join(tempRoot, "README.md"), "# plain-node-app\n");

		const manager = new AnalysisManager();
		const review = await manager.reviewProject(tempRoot);
		const summary = manager.formatReviewSummary(review);

		expect(review.repoType).toBe("node-project");
		expect(review.dependencySummary.packageName).toBe("plain-node-app");
		expect(summary).toContain("Artifact Path:");
		expect(summary).toContain("Repo Type: node-project");
	});

	it("fails on a missing path instead of guessing", async () => {
		const manager = new AnalysisManager();

		await expect(
			manager.reviewProject(path.join(tempRoot, "missing-project")),
		).rejects.toThrow("does not exist");
	});
});
