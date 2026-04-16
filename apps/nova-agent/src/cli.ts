#!/usr/bin/env node
import { Command } from "commander";
import { AnalysisManager } from "./features/analysis-manager";
import { BuildManager } from "./features/build-manager";
import { EditorIntegration } from "./features/editor-integration";
import { GitManager } from "./features/git-manager";
import { ProjectManager } from "./features/project-manager";

const program = new Command();
const projectManager = new ProjectManager(process.cwd()); // Defaults to current dir, or use --path
const gitManager = new GitManager();
const buildManager = new BuildManager();
const analysisManager = new AnalysisManager();
const editorIntegration = new EditorIntegration();

program
	.name("nova")
	.description("Nova Agent CLI - Project Management & Automation")
	.version("1.0.0");

program
	.command("project-init <name>")
	.description("Initialize a new project workspace")
	.option("-t, --type <type>", "Project type (react, node, python)", "node")
	.action(async (name, options) => {
		try {
			const projectPath = await projectManager.initProject(name, options.type);
			console.log(`✅ Project initialized at: ${projectPath}`);
			const steps = await projectManager.suggestNextSteps(projectPath);
			console.log("\nNext Steps:");
			steps.forEach((step) => console.log(`- ${step}`));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error(`Error: ${message}`);
		}
	});

program
	.command("git-status")
	.description("Check git status of current project")
	.action(async () => {
		console.log(await gitManager.status(process.cwd()));
	});

program
	.command("git-init")
	.description("Initialize git repository")
	.action(async () => {
		try {
			console.log(await gitManager.init(process.cwd()));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error(message);
		}
	});

program
	.command("build")
	.description("Run build process")
	.action(async () => {
		console.log(await buildManager.runBuild(process.cwd()));
	});

program
	.command("analyze")
	.description("Analyze project structure and persist a grounded review artifact")
	.option("-p, --path <path>", "Path to analyze", process.cwd())
	.option("--json", "Print the structured review artifact after the summary", false)
	.option("--json-only", "Print only the structured review artifact", false)
	.action(async (options) => {
		try {
			const targetPath = options.path ?? process.cwd();
			const review = await analysisManager.reviewProject(targetPath);
			const deps = await buildManager.analyzeDeps(targetPath);

			if (options.jsonOnly) {
				console.log(JSON.stringify(review, null, 2));
				return;
			}

			console.log(analysisManager.formatReviewSummary(review, deps));
			if (options.json) {
				console.log("\nReview Artifact:");
				console.log(JSON.stringify(review, null, 2));
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error(`Error: ${message}`);
		}
	});

program
	.command("scaffold <feature>")
	.description("Scaffold a new feature (e.g. react component)")
	.action(async (feature) => {
		console.log(
			await analysisManager.scaffoldFeature(
				process.cwd(),
				feature,
				"react-component",
			),
		);
	});

program
	.command("open <file>")
	.description("Open file in Vibe Code Studio or VS Code")
	.option("-l, --line <number>", "Line number")
	.action(async (file, options) => {
		console.log(await editorIntegration.openFile(file, options.line));
	});

program.parse(process.argv);
