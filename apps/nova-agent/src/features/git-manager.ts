import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const toErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

export class GitManager {
	private validateCwd(cwd: string): string {
		if (!cwd || cwd.includes("\0")) {
			throw new Error("Invalid working directory");
		}
		return path.resolve(cwd);
	}

	private validateCommitMessage(message: string): string {
		const trimmed = message.trim();
		if (!trimmed || trimmed.length > 200 || /[\r\n\0]/.test(trimmed)) {
			throw new Error("Invalid commit message");
		}
		return trimmed;
	}

	private validateBranchName(branchName: string): string {
		const trimmed = branchName.trim();
		if (
			!trimmed ||
			trimmed.length > 120 ||
			trimmed.includes("..") ||
			trimmed.startsWith("-") ||
			!/^[A-Za-z0-9._/-]+$/.test(trimmed)
		) {
			throw new Error("Invalid branch name");
		}
		return trimmed;
	}

	async status(cwd: string): Promise<string> {
		try {
			const { stdout } = await execFileAsync(
				"git",
				["status", "--short", "--branch"],
				{ cwd: this.validateCwd(cwd), timeout: 15000 },
			);
			return stdout;
		} catch (error: unknown) {
			return `Error: ${toErrorMessage(error)}`;
		}
	}

	async init(cwd: string): Promise<string> {
		try {
			const { stdout } = await execFileAsync("git", ["init"], {
				cwd: this.validateCwd(cwd),
				timeout: 15000,
			});
			return stdout;
		} catch (error: unknown) {
			throw new Error(`Git init failed: ${toErrorMessage(error)}`);
		}
	}

	async commit(cwd: string, message: string): Promise<string> {
		try {
			const validatedCwd = this.validateCwd(cwd);
			const validatedMessage = this.validateCommitMessage(message);
			await execFileAsync("git", ["add", "--all"], {
				cwd: validatedCwd,
				timeout: 15000,
			});
			const { stdout } = await execFileAsync(
				"git",
				["commit", "-m", validatedMessage],
				{ cwd: validatedCwd, timeout: 15000 },
			);
			return stdout;
		} catch (error: unknown) {
			return `Commit failed: ${toErrorMessage(error)}`;
		}
	}

	async createBranch(cwd: string, branchName: string): Promise<string> {
		try {
			const { stdout } = await execFileAsync(
				"git",
				["switch", "-c", this.validateBranchName(branchName)],
				{
					cwd: this.validateCwd(cwd),
					timeout: 15000,
				},
			);
			return stdout;
		} catch (error: unknown) {
			return `Branch creation failed: ${toErrorMessage(error)}`;
		}
	}
}
