import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecFile = vi.fn();

vi.mock("child_process", () => ({
	__esModule: true,
	execFile: (...args: unknown[]) => mockExecFile(...args),
	default: {
		execFile: (...args: unknown[]) => mockExecFile(...args),
	},
}));

describe("frontend command hardening", () => {
	beforeEach(() => {
		mockExecFile.mockReset();
		mockExecFile.mockImplementation(
			(
				_file: string,
				_args: string[],
				_options: unknown,
				callback: (error: Error | null, stdout: string, stderr: string) => void,
			) => {
				callback(null, "ok", "");
			},
		);
	});

	it("git manager uses structured args for branch creation", async () => {
		const { GitManager } = await import("./git-manager");
		await new GitManager().createBranch("C:\\dev\\repo", "feature/safe-branch");

		expect(mockExecFile).toHaveBeenCalledWith(
			"git",
			["switch", "-c", "feature/safe-branch"],
			expect.objectContaining({
				cwd: path.resolve("C:\\dev\\repo"),
				timeout: 15000,
			}),
			expect.any(Function),
		);
	});

	it("git manager rejects unsafe branch names", async () => {
		const { GitManager } = await import("./git-manager");
		const result = await new GitManager().createBranch("C:\\dev\\repo", "bad && branch");

		expect(result).toContain("Invalid branch name");
		expect(mockExecFile).not.toHaveBeenCalled();
	});

	it("project manager rejects paths outside its base root", async () => {
		const { ProjectManager } = await import("./project-manager");
		const manager = new ProjectManager("C:\\dev\\workspace");

		await expect(manager.getState("C:\\Windows")).rejects.toThrow(
			"Project path escapes base directory",
		);
	});
});
