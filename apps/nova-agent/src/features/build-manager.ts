import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const readFile = promisify(fs.readFile);

export class BuildManager {
	private validateCwd(cwd: string): string {
		if (!cwd || /[\0\r\n]/.test(cwd)) {
			throw new Error("Invalid project path");
		}
		return path.resolve(cwd);
	}

	async runBuild(cwd: string): Promise<string> {
		const resolvedCwd = this.validateCwd(cwd);
		const packageJsonPath = path.join(resolvedCwd, "package.json");
		if (fs.existsSync(packageJsonPath)) {
			try {
				const { stdout } = await execFileAsync(
					"npm",
					["run", "build"],
					{ cwd: resolvedCwd, timeout: 120000 },
				);
				return stdout;
			} catch (e: any) {
				return `Build failed: ${e.message}`;
			}
		}
		return "Unknown project type, cannot build.";
	}

	async analyzeDeps(cwd: string): Promise<string[]> {
		const packageJsonPath = path.join(this.validateCwd(cwd), "package.json");
		if (fs.existsSync(packageJsonPath)) {
			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			const deps = { ...content.dependencies, ...content.devDependencies };

			const suggestions = [];
			if (!deps["typescript"])
				suggestions.push("Consider adding TypeScript for type safety.");
			if (!deps["jest"] && !deps["vitest"])
				suggestions.push("No test runner found. Consider adding Vitest.");
			if (!deps["eslint"]) suggestions.push("Linting is missing. Add ESLint.");

			return suggestions;
		}
		return [];
	}
}
