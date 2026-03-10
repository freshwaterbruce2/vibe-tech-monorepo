/**
 * WindowTools Tests
 * Test suite for window management operations
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Window from "../WindowTools";

// Mock child_process with proper promisify support
vi.mock("child_process", () => ({
	exec: vi.fn((cmd: string, options: any, callback: any) => {
		if (typeof callback === "function") {
			callback(null, { stdout: "", stderr: "" });
		}
		return {} as any;
	}),
}));

import { exec } from "child_process";

describe("WindowTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listWindows", () => {
		it("should list all open windows", async () => {
			const mockWindows = [
				{
					ProcessId: 1234,
					ProcessName: "chrome",
					Title: "Google Chrome",
					Handle: "12345",
				},
				{
					ProcessId: 5678,
					ProcessName: "code",
					Title: "VS Code",
					Handle: "67890",
				},
			];

			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: JSON.stringify(mockWindows), stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.listWindows();

			expect(result).toHaveLength(2);
			expect(result[0].processName).toBe("chrome");
			expect(result[0].title).toBe("Google Chrome");
		});

		it("should handle single window (not array)", async () => {
			const mockWindow = {
				ProcessId: 1234,
				ProcessName: "notepad",
				Title: "Notepad",
				Handle: "12345",
			};

			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: JSON.stringify(mockWindow), stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.listWindows();

			expect(result).toHaveLength(1);
			expect(result[0].processName).toBe("notepad");
		});

		it("should return empty array if no windows found", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.listWindows();

			expect(result).toHaveLength(0);
		});

		it("should throw error on PowerShell failure", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(new Error("PowerShell failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			}) as any);

			await expect(Window.listWindows()).rejects.toThrow(
				"Failed to list windows",
			);
		});
	});

	describe("getActiveWindow", () => {
		it("should get the currently active window", async () => {
			const mockWindow = {
				ProcessId: 1234,
				ProcessName: "chrome",
				Title: "Google Chrome",
				Handle: "12345",
			};

			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: JSON.stringify(mockWindow), stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.getActiveWindow();

			expect(result).not.toBeNull();
			expect(result?.processName).toBe("chrome");
			expect(result?.title).toBe("Google Chrome");
		});

		it("should return null if no active window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.getActiveWindow();

			expect(result).toBeNull();
		});

		it("should return null on error", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(new Error("Failed"), { stdout: "", stderr: "error" });
				return {} as any;
			}) as any);

			const result = await Window.getActiveWindow();

			expect(result).toBeNull();
		});
	});

	describe("windowAction", () => {
		it("should minimize window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("6"); // Minimize action code
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("Test", "minimize");

			expect(result.success).toBe(true);
			expect(result.window).toBe("Test Window");
		});

		it("should maximize window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("3"); // Maximize action code
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("Test", "maximize");

			expect(result.success).toBe(true);
		});

		it("should restore window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("9"); // Restore action code
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("Test", "restore");

			expect(result.success).toBe(true);
		});

		it("should close window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("CloseMainWindow");
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("Test", "close");

			expect(result.success).toBe(true);
		});

		it("should focus window", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("SetForegroundWindow");
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("Test", "focus");

			expect(result.success).toBe(true);
		});

		it("should return false if window not found", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.windowAction("NonExistent", "minimize");

			expect(result.success).toBe(false);
			expect(result.window).toBeUndefined();
		});

		it("should throw error for invalid action", async () => {
			await expect(
				Window.windowAction("Test", "invalid" as any),
			).rejects.toThrow("Unknown window action");
		});

		it("should handle special characters in title pattern", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				// Should escape quotes
				expect(cmd).not.toContain('Test"Window');
				callback(null, { stdout: "Test Window", stderr: "" });
				return {} as any;
			}) as any);

			await Window.windowAction('Test"Window', "minimize");

			expect(vi.mocked(exec)).toHaveBeenCalled();
		});
	});

	describe("launchApp", () => {
		it("should launch allowed app", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("notepad.exe");
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.launchApp("notepad");

			expect(result.launched).toBe(true);
			expect(result.app).toBe("notepad.exe");
		});

		it("should launch app with arguments", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("notepad.exe");
				expect(cmd).toContain("test.txt");
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.launchApp("notepad", "test.txt");

			expect(result.launched).toBe(true);
		});

		it("should throw error for disallowed app", async () => {
			await expect(Window.launchApp("malicious.exe")).rejects.toThrow(
				"not in allow-list",
			);
		});

		it("should be case-insensitive for app names", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.launchApp("NOTEPAD");

			expect(result.launched).toBe(true);
			expect(result.app).toBe("notepad.exe");
		});

		it("should handle launch failure", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(new Error("Launch failed"), { stdout: "", stderr: "error" });
				return {} as any;
			}) as any);

			await expect(Window.launchApp("notepad")).rejects.toThrow(
				"Failed to launch",
			);
		});
	});

	describe("terminateApp", () => {
		it("should terminate process by name", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "2", stderr: "" }); // 2 processes terminated
				return {} as any;
			}) as any);

			const result = await Window.terminateApp("notepad");

			expect(result.terminated).toBe(true);
			expect(result.count).toBe(2);
		});

		it("should return false if process not found", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(null, { stdout: "0", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.terminateApp("nonexistent");

			expect(result.terminated).toBe(false);
			expect(result.count).toBe(0);
		});

		it("should use force flag when requested", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).toContain("-Force");
				callback(null, { stdout: "1", stderr: "" });
				return {} as any;
			}) as any);

			const result = await Window.terminateApp("stubborn", { force: true });

			expect(result.terminated).toBe(true);
		});

		it("should not use force flag by default", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				expect(cmd).not.toContain("-Force");
				callback(null, { stdout: "1", stderr: "" });
				return {} as any;
			}) as any);

			await Window.terminateApp("notepad");

			expect(vi.mocked(exec)).toHaveBeenCalled();
		});

		it("should handle termination failure", async () => {
			vi.mocked(exec).mockImplementation(((
				cmd: string,
				options: any,
				callback: any,
			) => {
				callback(new Error("Termination failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			}) as any);

			await expect(Window.terminateApp("process")).rejects.toThrow(
				"Failed to terminate",
			);
		});
	});
});
