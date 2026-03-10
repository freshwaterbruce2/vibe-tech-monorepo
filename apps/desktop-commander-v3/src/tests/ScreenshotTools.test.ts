/**
 * ScreenshotTools Tests
 * Test suite for screenshot capture operations
 */

import * as child_process from "child_process";
import * as fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as PathValidator from "../PathValidator";
import * as Screenshot from "../ScreenshotTools";

// Mock dependencies
vi.mock("child_process");
vi.mock("fs");
vi.mock("../PathValidator", async () => {
	const actual = await vi.importActual("../PathValidator");
	return {
		...actual,
		validatePath: vi.fn(),
	};
});

describe("ScreenshotTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(PathValidator.validatePath).mockReturnValue(
			"D:\\screenshots\\test.png",
		);
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
	});

	describe("takeScreenshot", () => {
		it("should take a screenshot and save to D:\\ path", async () => {
			const mockPath = "D:\\screenshots\\test.png";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				expect(cmd).toContain("powershell");
				expect(cmd).toContain("System.Drawing");
				callback(null, { stdout: mockPath, stderr: "" });
				return {} as any;
			});

			const result = await Screenshot.takeScreenshot("test.png");

			expect(result).toBe(mockPath);
			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				expect.stringContaining("D:\\screenshots"),
				"write",
			);
			expect(fs.promises.mkdir).toHaveBeenCalled();
		});

		it("should generate timestamp-based filename if not provided", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, {
					stdout: "D:\\screenshots\\screenshot-2024-01-01.png",
					stderr: "",
				});
				return {} as any;
			});

			const result = await Screenshot.takeScreenshot();

			expect(result).toContain("screenshot-");
			expect(result).toContain(".png");
		});

		it("should accept custom directory", async () => {
			const customDir = "D:\\custom";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\custom\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.takeScreenshot("test.png", { directory: customDir });

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				customDir,
				"write",
			);
		});

		it("should throw error if screenshot fails", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("Screenshot failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			});

			await expect(Screenshot.takeScreenshot()).rejects.toThrow(
				"Failed to take screenshot",
			);
		});

		it("should validate output path", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\screenshots\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.takeScreenshot("test.png");

			// Should validate both directory and full path
			expect(PathValidator.validatePath).toHaveBeenCalledTimes(2);
		});

		it("should create directory if it does not exist", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\screenshots\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.takeScreenshot("test.png");

			expect(fs.promises.mkdir).toHaveBeenCalledWith(
				expect.stringContaining("screenshots"),
				{ recursive: true },
			);
		});

		it("should handle backslashes in path correctly", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				// Should escape backslashes in PowerShell command
				expect(cmd).toContain("\\\\");
				callback(null, { stdout: "D:\\screenshots\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.takeScreenshot("test.png");

			expect(execMock).toHaveBeenCalled();
		});
	});

	describe("screenshotWindow", () => {
		it("should take screenshot of specific window", async () => {
			const mockPath = "D:\\screenshots\\window.png";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				expect(cmd).toContain("Get-Process");
				expect(cmd).toContain("Chrome"); // Window title
				callback(null, { stdout: mockPath, stderr: "" });
				return {} as any;
			});

			const result = await Screenshot.screenshotWindow("Chrome", "window.png");

			expect(result).toBe(mockPath);
		});

		it("should generate timestamp-based filename for window screenshot", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, {
					stdout: "D:\\screenshots\\window-2024-01-01.png",
					stderr: "",
				});
				return {} as any;
			});

			const result = await Screenshot.screenshotWindow("Chrome");

			expect(result).toContain("window-");
		});

		it("should throw error if window not found", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("Window not found: NonExistent"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			});

			await expect(Screenshot.screenshotWindow("NonExistent")).rejects.toThrow(
				"Failed to screenshot window",
			);
		});

		it("should accept custom directory for window screenshot", async () => {
			const customDir = "D:\\windows";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\windows\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.screenshotWindow("Chrome", "test.png", {
				directory: customDir,
			});

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				customDir,
				"write",
			);
		});

		it("should validate window screenshot path", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\screenshots\\window.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.screenshotWindow("Chrome", "window.png");

			expect(PathValidator.validatePath).toHaveBeenCalledTimes(2);
		});

		it("should use timeout for window screenshot", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				expect(options.timeout).toBe(30000);
				callback(null, { stdout: "D:\\screenshots\\window.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.screenshotWindow("Chrome", "window.png");

			expect(execMock).toHaveBeenCalled();
		});
	});

	describe("security validation", () => {
		it("should block screenshot to unauthorized path", async () => {
			vi.mocked(PathValidator.validatePath).mockImplementation(() => {
				throw new Error("Access denied");
			});

			await expect(
				Screenshot.takeScreenshot("test.png", { directory: "C:\\Windows" }),
			).rejects.toThrow("Access denied");
		});

		it("should only allow D:\\ drive for screenshots", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "D:\\screenshots\\test.png", stderr: "" });
				return {} as any;
			});

			await Screenshot.takeScreenshot("test.png");

			// Path validator should have been called with D:\ path
			const calls = vi.mocked(PathValidator.validatePath).mock.calls;
			expect(calls.some((call) => call[0].startsWith("D:"))).toBe(true);
		});
	});
});
