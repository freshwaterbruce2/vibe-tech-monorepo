/**
 * PathValidator Tests
 */

import { describe, expect, it } from "vitest";
import {
	getAllowedPaths,
	getPathType,
	isPathAllowed,
	normalizePath,
	validatePath,
} from "../PathValidator";

describe("PathValidator", () => {
	describe("isPathAllowed", () => {
		// Allowed paths - READ
		it("should allow reading from C:\\dev", () => {
			expect(isPathAllowed("C:\\dev", "read")).toBe(true);
			expect(isPathAllowed("C:\\dev\\projects\\myapp", "read")).toBe(true);
		});

		it("should allow reading from D:\\", () => {
			expect(isPathAllowed("D:\\", "read")).toBe(true);
			expect(isPathAllowed("D:\\databases\\nova.db", "read")).toBe(true);
		});

		it("should allow reading from OneDrive", () => {
			expect(isPathAllowed("C:\\Users\\fresh_zxae3v6\\OneDrive", "read")).toBe(
				true,
			);
			expect(
				isPathAllowed("C:\\Users\\fresh_zxae3v6\\OneDrive\\Documents", "read"),
			).toBe(true);
		});

		// Allowed paths - WRITE
		it("should allow writing to C:\\dev", () => {
			expect(isPathAllowed("C:\\dev", "write")).toBe(true);
			expect(isPathAllowed("C:\\dev\\projects\\myapp\\src", "write")).toBe(
				true,
			);
		});

		it("should allow writing to D:\\", () => {
			expect(isPathAllowed("D:\\", "write")).toBe(true);
			expect(isPathAllowed("D:\\screenshots\\test.png", "write")).toBe(true);
		});

		// OneDrive is read-only
		it("should NOT allow writing to OneDrive", () => {
			expect(isPathAllowed("C:\\Users\\fresh_zxae3v6\\OneDrive", "write")).toBe(
				false,
			);
			expect(
				isPathAllowed(
					"C:\\Users\\fresh_zxae3v6\\OneDrive\\Documents\\file.txt",
					"write",
				),
			).toBe(false);
		});

		// Blocked paths
		it("should NOT allow access to C:\\Windows", () => {
			expect(isPathAllowed("C:\\Windows", "read")).toBe(false);
			expect(isPathAllowed("C:\\Windows\\System32", "read")).toBe(false);
		});

		it("should NOT allow access to C:\\Program Files", () => {
			expect(isPathAllowed("C:\\Program Files", "read")).toBe(false);
		});

		it("should NOT allow access to other user folders", () => {
			expect(isPathAllowed("C:\\Users\\fresh_zxae3v6\\Desktop", "read")).toBe(
				false,
			);
			expect(isPathAllowed("C:\\Users\\fresh_zxae3v6\\Documents", "read")).toBe(
				false,
			);
		});

		// Edge cases - path prefix matching
		it("should NOT match similar prefixes that are not subdirectories", () => {
			// "C:\develop" should NOT match "C:\dev"
			expect(isPathAllowed("C:\\develop", "read")).toBe(false);
			expect(isPathAllowed("C:\\developer\\projects", "read")).toBe(false);
		});
	});

	describe("getPathType", () => {
		it('should return "dev" for C:\\dev paths', () => {
			expect(getPathType("C:\\dev")).toBe("dev");
			expect(getPathType("C:\\dev\\apps\\myapp")).toBe("dev");
		});

		it('should return "data" for D:\\ paths', () => {
			expect(getPathType("D:\\")).toBe("data");
			expect(getPathType("D:\\databases")).toBe("data");
		});

		it('should return "onedrive" for OneDrive paths', () => {
			expect(getPathType("C:\\Users\\fresh_zxae3v6\\OneDrive")).toBe(
				"onedrive",
			);
		});

		it('should return "unknown" for other paths', () => {
			expect(getPathType("C:\\Windows")).toBe("unknown");
		});
	});

	describe("validatePath", () => {
		it("should return normalized path for valid paths", () => {
			const result = validatePath("C:\\dev\\test", "read");
			expect(result).toContain("dev");
		});

		it("should throw for invalid paths", () => {
			expect(() => validatePath("C:\\Windows\\System32", "read")).toThrow(
				"Access denied",
			);
		});

		it("should throw descriptive error for OneDrive write attempts", () => {
			expect(() =>
				validatePath("C:\\Users\\fresh_zxae3v6\\OneDrive\\test.txt", "write"),
			).toThrow("OneDrive is read-only");
		});
	});

	describe("normalizePath", () => {
		it("should normalize path separators to backslashes (case preserved)", () => {
			const result = normalizePath("C:/Dev/Test");
			expect(result).not.toContain("/");
			expect(result).toContain("\\");
		});
	});

	describe("getAllowedPaths", () => {
		it("should return the list of allowed paths", () => {
			const paths = getAllowedPaths();
			expect(paths).toHaveLength(3);
			expect(paths.some((p) => p.path.includes("dev"))).toBe(true);
			expect(paths.some((p) => p.type === "onedrive" && !p.write)).toBe(true);
		});
	});
});
