import fs from "fs";
import path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

export interface ProjectState {
	current_phase: string;
	next_steps: string[];
	blockers: string[];
	decisions: string[];
	last_updated: string;
}

export class ProjectManager {
	constructor(private basePath: string) {}

	private ensureWithinBase(candidatePath: string): string {
		const baseRoot = path.resolve(this.basePath);
		const projectPath = path.resolve(candidatePath);
		if (projectPath !== baseRoot && !projectPath.startsWith(`${baseRoot}${path.sep}`)) {
			throw new Error("Project path escapes base directory");
		}
		return projectPath;
	}

	private resolveProjectPath(projectName: string): string {
		const trimmed = projectName.trim();
		if (!trimmed || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
			throw new Error("Invalid project name");
		}

		return this.ensureWithinBase(path.resolve(this.basePath, trimmed));
	}

	async initProject(
		projectName: string,
		type: "react" | "node" | "python",
	): Promise<string> {
		const projectPath = this.resolveProjectPath(projectName);

		if (await exists(projectPath)) {
			throw new Error(
				`Project ${projectName} already exists at ${projectPath}`,
			);
		}

		await mkdir(projectPath, { recursive: true });

		// Create README.md
		const readmeContent = `# ${projectName}

## Goals
- Build a ${type} application.

## Tech Stack
- ${type === "react" ? "React, Vite" : type === "node" ? "Node.js, Express" : "Python"}

## Next Steps
- [ ] Initialize dependencies
- [ ] Set up version control
`;
		await writeFile(path.join(projectPath, "README.md"), readmeContent);

		// Create project_state.json
		const initialState: ProjectState = {
			current_phase: "setup",
			next_steps: [
				type === "node"
					? "Run: npm init -y"
					: type === "python"
						? "Create virtualenv"
						: "Run: npm create vite@latest .",
				"Initialize Git repository",
			],
			blockers: [],
			decisions: [`Selected ${type} as the primary technology.`],
			last_updated: new Date().toISOString(),
		};
		await this.writeState(projectPath, initialState);

		// Create .gitignore
		const gitignore =
			type === "node" || type === "react"
				? "node_modules/\n.env\ndist/"
				: "__pycache__/\nvenv/\n.env";
		await writeFile(path.join(projectPath, ".gitignore"), gitignore);

		return projectPath;
	}

	async getState(projectPath: string): Promise<ProjectState> {
		const statePath = path.join(
			this.ensureWithinBase(path.resolve(projectPath)),
			"project_state.json",
		);
		if (!(await exists(statePath))) {
			throw new Error(`No project state found at ${statePath}`);
		}
		const content = await readFile(statePath, "utf-8");
		return JSON.parse(content);
	}

	async updateState(
		projectPath: string,
		updates: Partial<ProjectState>,
	): Promise<ProjectState> {
		const resolvedProjectPath = this.ensureWithinBase(path.resolve(projectPath));
		const currentState = await this.getState(resolvedProjectPath);
		const newState = {
			...currentState,
			...updates,
			last_updated: new Date().toISOString(),
		};
		await this.writeState(resolvedProjectPath, newState);
		return newState;
	}

	private async writeState(
		projectPath: string,
		state: ProjectState,
	): Promise<void> {
		await writeFile(
			path.join(projectPath, "project_state.json"),
			JSON.stringify(state, null, 2),
		);
	}

	async suggestNextSteps(projectPath: string): Promise<string[]> {
		const state = await this.getState(projectPath);
		// specific logic based on phase
		if (state.current_phase === "setup") {
			return [
				"Install dependencies",
				"Configure linting",
				"Create first component/route",
			];
		}
		return ["Check project status", "Review recent changes"];
	}
}
