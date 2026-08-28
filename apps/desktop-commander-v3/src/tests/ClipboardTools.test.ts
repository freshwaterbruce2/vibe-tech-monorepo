/**
 * ClipboardTools Tests
 * Test suite for clipboard operations
 */

import * as child_process from "child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Clipboard from "../ClipboardTools";

// Factory mock: exec gets a plain vi.fn() with no util.promisify.custom,
// so promisify uses the standard (err, result) callback convention.
vi.mock("child_process", () => ({
	exec: vi.fn(),
}));

describe("ClipboardTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getClipboard", () => {
		it("should get clipboard text content", async () => {
			const mockText = "clipboard content";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: mockText + "\n", stderr: "" });
				return {} as any;
			});

			const result = await Clipboard.getClipboard();

			expect(result).toBe(mockText);
			expect(execMock).toHaveBeenCalled();
			const command = execMock.mock.calls[0][0] as string;
			expect(command).toContain("Get-Clipboard");
		});

		it("should handle empty clipboard", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			const result = await Clipboard.getClipboard();

			expect(result).toBe("");
		});

		it("should handle multiline clipboard content", async () => {
			const mockText = "line 1\nline 2\nline 3";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: mockText + "\n", stderr: "" });
				return {} as any;
			});

			const result = await Clipboard.getClipboard();

			expect(result).toBe(mockText);
		});

		it("should throw error on PowerShell failure", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("PowerShell failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			});

			await expect(Clipboard.getClipboard()).rejects.toThrow(
				"Failed to get clipboard",
			);
		});
	});

	describe("setClipboard", () => {
		it("should set clipboard text content", async () => {
			const testText = "new clipboard content";
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				expect(cmd).toContain("Set-Clipboard");
				expect(cmd).toContain(testText);
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			await Clipboard.setClipboard(testText);

			expect(execMock).toHaveBeenCalled();
		});

		it("should escape special characters", async () => {
			const testText = 'text with $variables and "quotes" and `backticks`';
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				// Should contain escaped versions
				expect(cmd).toContain("`$");
				expect(cmd).toContain('`"');
				expect(cmd).toContain("``");
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			await Clipboard.setClipboard(testText);

			expect(execMock).toHaveBeenCalled();
		});

		it("should handle empty string", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			await Clipboard.setClipboard("");

			expect(execMock).toHaveBeenCalled();
		});

		it("should throw error on PowerShell failure", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("PowerShell failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			});

			await expect(Clipboard.setClipboard("test")).rejects.toThrow(
				"Failed to set clipboard",
			);
		});
	});

	describe("clearClipboard", () => {
		it("should clear clipboard", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				expect(cmd).toContain("Set-Clipboard");
				expect(cmd).toContain("$null");
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			await Clipboard.clearClipboard();

			expect(execMock).toHaveBeenCalled();
		});

		it("should throw error on PowerShell failure", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("PowerShell failed"), {
					stdout: "",
					stderr: "error",
				});
				return {} as any;
			});

			await expect(Clipboard.clearClipboard()).rejects.toThrow(
				"Failed to clear clipboard",
			);
		});
	});

	describe("hasClipboardText", () => {
		it("should return true if clipboard has text", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "some text", stderr: "" });
				return {} as any;
			});

			const result = await Clipboard.hasClipboardText();

			expect(result).toBe(true);
		});

		it("should return false if clipboard is empty", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(null, { stdout: "", stderr: "" });
				return {} as any;
			});

			const result = await Clipboard.hasClipboardText();

			expect(result).toBe(false);
		});

		it("should return false on error", async () => {
			const execMock = vi.mocked(child_process.exec);
			execMock.mockImplementation((cmd: any, options: any, callback: any) => {
				callback(new Error("Failed"), { stdout: "", stderr: "error" });
				return {} as any;
			});

			const result = await Clipboard.hasClipboardText();

			expect(result).toBe(false);
		});
	});
});
