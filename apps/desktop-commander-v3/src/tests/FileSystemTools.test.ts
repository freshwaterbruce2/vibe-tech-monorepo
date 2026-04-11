/**
 * FileSystemTools Tests
 * Comprehensive test suite for file system operations
 */

import fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as FileSystem from "../FileSystemTools";
import * as PathValidator from "../PathValidator";

// Mock PathValidator
vi.mock("../PathValidator", async () => {
	const actual = await vi.importActual("../PathValidator");
	return {
		...actual,
		validatePath: vi.fn(),
		isFile: vi.fn(),
		isDirectory: vi.fn(),
		pathExists: vi.fn(),
	};
});

describe("FileSystemTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Spy on fs.promises methods (CommonJS object — spyOn works fine)
		vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("file contents") as any);
		vi.spyOn(fs.promises, "writeFile").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "readdir").mockResolvedValue([] as any);
		vi.spyOn(fs.promises, "mkdir").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "stat").mockResolvedValue({
			isFile: () => true,
			isDirectory: () => false,
			size: 100,
			mtime: new Date(),
			birthtime: new Date(),
			atime: new Date(),
			mode: 0o644,
		} as any);
		vi.spyOn(fs.promises, "appendFile").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "rename").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "copyFile").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "rm").mockResolvedValue(undefined);
		vi.spyOn(fs.promises, "unlink").mockResolvedValue(undefined);

		// Default PathValidator mocks
		vi.mocked(PathValidator.validatePath).mockReturnValue("C:\\dev\\test.txt");
		vi.mocked(PathValidator.isFile).mockResolvedValue(true);
		vi.mocked(PathValidator.isDirectory).mockResolvedValue(false);
		vi.mocked(PathValidator.pathExists).mockResolvedValue(true);
	});

	describe("readFile", () => {
		it("should read file contents successfully", async () => {
			const mockContent = "file contents";
			vi.mocked(fs.promises.readFile).mockResolvedValue(mockContent);
			vi.mocked(PathValidator.isFile).mockResolvedValue(true);

			const result = await FileSystem.readFile("C:\\dev\\test.txt");

			expect(result).toBe(mockContent);
			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"read",
			);
			expect(fs.promises.readFile).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"utf-8",
			);
		});

		it("should throw error if path is not a file", async () => {
			vi.mocked(PathValidator.isFile).mockResolvedValue(false);

			await expect(FileSystem.readFile("C:\\dev\\directory")).rejects.toThrow(
				"Not a file or does not exist",
			);
		});

		it("should validate path before reading", async () => {
			vi.mocked(PathValidator.validatePath).mockImplementation(() => {
				throw new Error("Access denied");
			});

			await expect(
				FileSystem.readFile("C:\\Windows\\test.txt"),
			).rejects.toThrow("Access denied");
		});
	});

	describe("readFileBase64", () => {
		it("should read file as base64", async () => {
			const mockBuffer = Buffer.from("test data");
			vi.mocked(fs.promises.readFile).mockResolvedValue(mockBuffer);
			vi.mocked(PathValidator.isFile).mockResolvedValue(true);

			const result = await FileSystem.readFileBase64("C:\\dev\\image.png");

			expect(result).toBe(mockBuffer.toString("base64"));
			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\image.png",
				"read",
			);
		});
	});

	describe("writeFile", () => {
		it("should write file contents successfully", async () => {
			vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

			await FileSystem.writeFile("C:\\dev\\test.txt", "content");

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"write",
			);
			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"content",
				"utf-8",
			);
		});

		it("should create directories when createDirs option is true", async () => {
			vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
			vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

			await FileSystem.writeFile("C:\\dev\\new\\test.txt", "content", {
				createDirs: true,
			});

			expect(fs.promises.mkdir).toHaveBeenCalledWith("C:\\dev\\new", {
				recursive: true,
			});
		});

		it("should append to file when append option is true", async () => {
			vi.mocked(fs.promises.appendFile).mockResolvedValue(undefined);

			await FileSystem.writeFile("C:\\dev\\test.txt", "more content", {
				append: true,
			});

			expect(fs.promises.appendFile).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"more content",
				"utf-8",
			);
		});
	});

	describe("listDirectory", () => {
		it("should list directory contents", async () => {
			vi.mocked(PathValidator.isDirectory).mockResolvedValue(true);
			vi.mocked(fs.promises.readdir).mockResolvedValue([
				{
					name: "file1.txt",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
				{ name: "folder", isDirectory: () => true, isFile: () => false } as any,
			]);
			vi.mocked(fs.promises.stat).mockResolvedValue({ size: 100 } as any);

			const result = await FileSystem.listDirectory("C:\\dev");

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ name: "file1.txt", type: "file", size: 100 });
			expect(result[1]).toEqual({ name: "folder", type: "directory" });
		});

		it("should throw error if path is not a directory", async () => {
			vi.mocked(PathValidator.isDirectory).mockResolvedValue(false);

			await expect(
				FileSystem.listDirectory("C:\\dev\\test.txt"),
			).rejects.toThrow("Not a directory");
		});

		it("should recursively list subdirectories when recursive option is true", async () => {
			vi.mocked(PathValidator.isDirectory).mockResolvedValue(true);
			vi.mocked(fs.promises.readdir)
				.mockResolvedValueOnce([
					{
						name: "folder",
						isDirectory: () => true,
						isFile: () => false,
					} as any,
				])
				.mockResolvedValueOnce([
					{
						name: "nested.txt",
						isDirectory: () => false,
						isFile: () => true,
					} as any,
				]);
			vi.mocked(fs.promises.stat).mockResolvedValue({ size: 50 } as any);

			const result = await FileSystem.listDirectory("C:\\dev", {
				recursive: true,
			});

			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("createDirectory", () => {
		it("should create directory successfully", async () => {
			vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

			await FileSystem.createDirectory("C:\\dev\\newdir");

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\newdir",
				"write",
			);
			expect(fs.promises.mkdir).toHaveBeenCalledWith("C:\\dev\\newdir", {
				recursive: true,
			});
		});

		it("should create directory with recursive option disabled", async () => {
			vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

			await FileSystem.createDirectory("C:\\dev\\newdir", { recursive: false });

			expect(fs.promises.mkdir).toHaveBeenCalledWith("C:\\dev\\newdir", {
				recursive: false,
			});
		});
	});

	describe("deleteFile", () => {
		it("should delete a file", async () => {
			vi.mocked(fs.promises.stat).mockResolvedValue({
				isDirectory: () => false,
			} as any);
			vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

			await FileSystem.deleteFile("C:\\dev\\test.txt");

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\test.txt",
				"write",
			);
			expect(fs.promises.unlink).toHaveBeenCalledWith("C:\\dev\\test.txt");
		});

		it("should delete directory recursively", async () => {
			vi.mocked(fs.promises.stat).mockResolvedValue({
				isDirectory: () => true,
			} as any);
			vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

			await FileSystem.deleteFile("C:\\dev\\folder", { recursive: true });

			expect(fs.promises.rm).toHaveBeenCalledWith("C:\\dev\\folder", {
				recursive: true,
			});
		});

		it("should throw error when trying to delete directory without recursive flag", async () => {
			vi.mocked(fs.promises.stat).mockResolvedValue({
				isDirectory: () => true,
			} as any);

			await expect(FileSystem.deleteFile("C:\\dev\\folder")).rejects.toThrow(
				"Cannot delete directory without recursive flag",
			);
		});
	});

	describe("moveFile", () => {
		it("should move file successfully", async () => {
			vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

			await FileSystem.moveFile("C:\\dev\\src.txt", "C:\\dev\\dest.txt");

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"write",
			);
			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\dest.txt",
				"write",
			);
			expect(fs.promises.rename).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"C:\\dev\\dest.txt",
			);
		});
	});

	describe("copyFile", () => {
		it("should copy file successfully", async () => {
			vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);

			await FileSystem.copyFile("C:\\dev\\src.txt", "C:\\dev\\dest.txt");

			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"read",
			);
			expect(PathValidator.validatePath).toHaveBeenCalledWith(
				"C:\\dev\\dest.txt",
				"write",
			);
			expect(fs.promises.copyFile).toHaveBeenCalledWith(
				"C:\\dev\\src.txt",
				"C:\\dev\\dest.txt",
			);
		});
	});

	describe("getFileInfo", () => {
		it("should return file information", async () => {
			const mockStats = {
				isDirectory: () => false,
				isFile: () => true,
				size: 1024,
				birthtime: new Date("2024-01-01"),
				mtime: new Date("2024-01-02"),
				atime: new Date("2024-01-03"),
			};
			vi.mocked(fs.promises.stat).mockResolvedValue(mockStats as any);

			const result = await FileSystem.getFileInfo("C:\\dev\\test.txt");

			expect(result.name).toBe("test.txt");
			expect(result.size).toBe(1024);
			expect(result.isFile).toBe(true);
			expect(result.isDirectory).toBe(false);
		});
	});

	describe("searchFiles", () => {
		it("should search for files by pattern", async () => {
			vi.mocked(fs.promises.readdir).mockResolvedValueOnce([
				{
					name: "test.txt",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
				{
					name: "test.md",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
				{
					name: "other.js",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
			]);

			const result = await FileSystem.searchFiles("C:\\dev", "*.txt");

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].type).toBe("file");
		});

		it("should respect maxResults limit", async () => {
			vi.mocked(fs.promises.readdir).mockResolvedValue(
				Array(200).fill({
					name: "test.txt",
					isDirectory: () => false,
					isFile: () => true,
				}),
			);

			const result = await FileSystem.searchFiles("C:\\dev", "*.txt", {
				maxResults: 10,
			});

			expect(result.length).toBeLessThanOrEqual(10);
		});
	});

	describe("searchContent", () => {
		it("should search file contents by query", async () => {
			vi.mocked(fs.promises.readdir).mockResolvedValue([
				{
					name: "test.txt",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
			]);
			vi.mocked(fs.promises.readFile).mockResolvedValue(
				"line 1\nfoo bar\nline 3",
			);

			const result = await FileSystem.searchContent("C:\\dev", "foo");

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].line).toBe(2);
			expect(result[0].content).toContain("foo");
		});

		it("should filter by file extensions", async () => {
			vi.mocked(fs.promises.readdir).mockResolvedValue([
				{
					name: "test.txt",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
				{
					name: "test.md",
					isDirectory: () => false,
					isFile: () => true,
				} as any,
			]);
			vi.mocked(fs.promises.readFile).mockResolvedValue("content");

			await FileSystem.searchContent("C:\\dev", "content", {
				extensions: ["txt"],
			});

			// Should only read .txt files
			expect(fs.promises.readFile).toHaveBeenCalled();
		});
	});

	describe("readFiles (batch operation)", () => {
		it("should read multiple files successfully", async () => {
			vi.mocked(PathValidator.isFile).mockResolvedValue(true);
			vi.mocked(fs.promises.stat).mockResolvedValue({ size: 100 } as any);
			vi.mocked(fs.promises.readFile).mockResolvedValue("content");

			const result = await FileSystem.readFiles([
				"C:\\dev\\file1.txt",
				"C:\\dev\\file2.txt",
			]);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("content", "content");
			expect(result[1]).toHaveProperty("content", "content");
		});

		it("should handle errors gracefully in batch read", async () => {
			vi.mocked(PathValidator.isFile).mockResolvedValue(true);
			vi.mocked(fs.promises.stat).mockResolvedValue({ size: 100 } as any);
			vi.mocked(fs.promises.readFile)
				.mockResolvedValueOnce("content1")
				.mockRejectedValueOnce(new Error("Read failed"));

			const result = await FileSystem.readFiles([
				"C:\\dev\\file1.txt",
				"C:\\dev\\file2.txt",
			]);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("content", "content1");
			expect(result[1]).toHaveProperty("error");
		});

		it("should respect maxBytes limit", async () => {
			vi.mocked(PathValidator.isFile).mockResolvedValue(true);
			vi.mocked(fs.promises.stat).mockResolvedValue({ size: 2000000 } as any);

			const result = await FileSystem.readFiles(["C:\\dev\\large.txt"], {
				maxBytes: 1000000,
			});

			expect(result[0]).toHaveProperty("error");
			expect(result[0].error).toContain("exceeds maxBytes");
		});
	});

	describe("writeFiles (batch operation)", () => {
		it("should write multiple files successfully", async () => {
			vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
			vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

			const files = [
				{ path: "C:\\dev\\file1.txt", content: "content1" },
				{ path: "C:\\dev\\file2.txt", content: "content2" },
			];

			const result = await FileSystem.writeFiles(files);

			expect(result).toHaveLength(2);
			expect(result[0].written).toBe(true);
			expect(result[1].written).toBe(true);
		});

		it("should support atomic writes with rollback on failure", async () => {
			vi.mocked(PathValidator.pathExists).mockResolvedValue(true);
			vi.mocked(fs.promises.readFile).mockResolvedValue("original");
			vi.mocked(fs.promises.writeFile)
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error("Write failed"));

			const files = [
				{ path: "C:\\dev\\file1.txt", content: "new1" },
				{ path: "C:\\dev\\file2.txt", content: "new2" },
			];

			await expect(
				FileSystem.writeFiles(files, { atomic: true }),
			).rejects.toThrow("Write failed");

			// Should have attempted rollback
			expect(fs.promises.writeFile).toHaveBeenCalled();
		});
	});

	describe("applyEdits", () => {
		it("should apply literal edits successfully", async () => {
			vi.mocked(fs.promises.readFile).mockResolvedValue("Hello world");
			vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

			const edits = [
				{
					path: "C:\\dev\\test.txt",
					mode: "literal" as const,
					needle: "world",
					replacement: "universe",
				},
			];

			const result = await FileSystem.applyEdits(edits);

			expect(result.results[0].changes).toBe(1);
			expect(result.dryRun).toBe(false);
		});

		it("should apply regex edits successfully", async () => {
			vi.mocked(fs.promises.readFile).mockResolvedValue("foo bar foo");
			vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

			const edits = [
				{
					path: "C:\\dev\\test.txt",
					mode: "regex" as const,
					needle: "foo",
					replacement: "baz",
					allowMultiple: true,
				},
			];

			const result = await FileSystem.applyEdits(edits);

			expect(result.results[0].changes).toBe(2);
		});

		it("should throw error if needle not found", async () => {
			vi.mocked(fs.promises.readFile).mockResolvedValue("Hello world");

			const edits = [
				{
					path: "C:\\dev\\test.txt",
					mode: "literal" as const,
					needle: "missing",
					replacement: "new",
				},
			];

			await expect(FileSystem.applyEdits(edits)).rejects.toThrow(
				"Needle not found",
			);
		});

		it("should support dry run mode", async () => {
			vi.mocked(fs.promises.readFile).mockResolvedValue("Hello world");

			const edits = [
				{
					path: "C:\\dev\\test.txt",
					mode: "literal" as const,
					needle: "world",
					replacement: "universe",
				},
			];

			const result = await FileSystem.applyEdits(edits, { dryRun: true });

			expect(result.dryRun).toBe(true);
			expect(fs.promises.writeFile).not.toHaveBeenCalled();
		});
	});
});
