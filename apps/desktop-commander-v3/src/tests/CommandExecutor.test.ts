import open from "open";
import si from "systeminformation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandExecutor } from "../CommandExecutor";
import * as FileSystem from "../FileSystemTools";

// Mock dependencies
vi.mock("systeminformation");
vi.mock("open");
vi.mock("../FileSystemTools");
vi.mock("../Logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("CommandExecutor", () => {
	let executor: CommandExecutor;

	beforeEach(() => {
		vi.clearAllMocks();
		executor = new CommandExecutor();
	});

	describe("open-url", () => {
		it("should open valid HTTPS URLs", async () => {
			const validUrl = "https://google.com";
			await executor.execute({
				text: `open-url ${validUrl}`,
				context: {},
			} as any);
			expect(open).toHaveBeenCalledWith(validUrl);
		});

		it("should throw error for non-http protocols", async () => {
			const invalidUrl = "file:///etc/passwd";
			await expect(
				executor.execute({
					text: `open-url ${invalidUrl}`,
					context: {},
				} as any),
			).rejects.toThrow("Only HTTP/HTTPS URLs allowed");
			expect(open).not.toHaveBeenCalled();
		});

		it("should throw error for invalid URL format", async () => {
			const invalidUrl = "not-a-url";
			await expect(
				executor.execute({
					text: `open-url ${invalidUrl}`,
					context: {},
				} as any),
			).rejects.toThrow("Invalid URL format");
		});
	});

	describe("list-processes", () => {
		it("should return sanitized process list", async () => {
			const mockProcesses = {
				list: [
					{
						pid: 1,
						name: "node",
						mem: 100,
						cpu: 5,
						user: "root",
						command: "node secret.js",
					},
					{
						pid: 2,
						name: "chrome",
						mem: 200,
						cpu: 10,
						user: "user",
						command: "chrome --key=secret",
					},
				],
			};

			(si.processes as any).mockResolvedValue(mockProcesses);

			const result = await executor.execute({
				text: "list-processes",
				context: {},
			} as any);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ pid: 1, name: "node", mem: 100, cpu: 5 });
			expect(result[0]).not.toHaveProperty("command");
			expect(result[0]).not.toHaveProperty("user");
		});
	});

	describe("file-manager", () => {
		it("should execute dc_move_file", async () => {
			(FileSystem.moveFile as any).mockResolvedValue(undefined);
			const result = await executor.execute({
				text: 'dc_move_file source="C:\\dev\\src.txt" destination="C:\\dev\\dest.txt"',
				context: {},
			} as any);

			expect(FileSystem.moveFile).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"C:\\dev\\dest.txt",
			);
			expect(result).toEqual({
				moved: true,
				from: "C:\\dev\\src.txt",
				to: "C:\\dev\\dest.txt",
			});
		});

		it("should execute dc_copy_file", async () => {
			(FileSystem.copyFile as any).mockResolvedValue(undefined);
			const result = await executor.execute({
				text: 'dc_copy_file source="C:\\dev\\src.txt" destination="C:\\dev\\copy.txt"',
				context: {},
			} as any);

			expect(FileSystem.copyFile).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"C:\\dev\\copy.txt",
			);
			expect(result).toEqual({
				copied: true,
				from: "C:\\dev\\src.txt",
				to: "C:\\dev\\copy.txt",
			});
		});

		it("should execute dc_get_file_info", async () => {
			const mockInfo = { size: 100, type: "file" };
			(FileSystem.getFileInfo as any).mockResolvedValue(mockInfo);

			const result = await executor.execute({
				text: 'dc_get_file_info path="C:\\dev\\file.txt"',
				context: {},
			} as any);

			expect(FileSystem.getFileInfo).toHaveBeenCalledWith("C:\\dev\\file.txt");
			expect(result).toEqual(mockInfo);
		});
	});
});
