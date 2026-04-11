/**
 * PathValidator - Strict path validation with allow-list for Desktop Commander V3
 *
 * Allowed paths:
 * - C:\dev - Development work (read/write)
 * - D:\ - Databases, learning system, large files (read/write)
 * - C:\Users\fresh_zxae3v6\OneDrive - Read-only access
 */

import fs from "node:fs";
import path from "node:path";

export type PathMode = "read" | "write";
export type PathType = "dev" | "data" | "onedrive" | "unknown";

interface AllowedPath {
	path: string;
	normalized: string;
	allowRead: boolean;
	allowWrite: boolean;
	type: PathType;
}

// Define allowed paths with their permissions
const ALLOWED_PATHS: AllowedPath[] = [
	{
		path: "C:\\dev",
		normalized: "c:\\dev",
		allowRead: true,
		allowWrite: true,
		type: "dev",
	},
	{
		path: "D:\\",
		normalized: "d:\\",
		allowRead: true,
		allowWrite: true,
		type: "data",
	},
	{
		path: "C:\\Users\\fresh_zxae3v6\\OneDrive",
		normalized: "c:\\users\\fresh_zxae3v6\\onedrive",
		allowRead: true,
		allowWrite: false, // Read-only
		type: "onedrive",
	},
];

/**
 * Patterns that are always blocked regardless of allowed-path membership
 */
const BLOCKED_PATTERNS = ["node_modules", ".git", "dist"];

/**
 * Check if a path contains a blocked pattern segment
 */
export function isPathBlocked(inputPath: string): boolean {
	const normalized = inputPath.replace(/\//g, "\\");
	return BLOCKED_PATTERNS.some((pattern) =>
		normalized.split("\\").includes(pattern),
	);
}

/**
 * Normalize a path with consistent separators (case preserved)
 */
export function normalizePath(inputPath: string): string {
	// Resolve to absolute path (preserves case for display)
	return path.resolve(inputPath).replace(/\//g, "\\");
}

/**
 * Lowercase helper used only for allow-list comparisons
 */
function normalizeForComparison(inputPath: string): string {
	return normalizePath(inputPath).toLowerCase();
}

/**
 * Check if a path is under an allowed directory
 */
function findAllowedPath(inputPath: string): AllowedPath | null {
	const normalized = normalizeForComparison(inputPath);

	for (const allowed of ALLOWED_PATHS) {
		// Check if the normalized path starts with the allowed path
		if (normalized.startsWith(allowed.normalized)) {
			// Ensure it's actually a subdirectory, not just a prefix match
			// e.g., "c:\develop" should not match "c:\dev"
			const remainder = normalized.slice(allowed.normalized.length);

			// If remainder is empty, it's an exact match
			if (remainder === "") {
				return allowed;
			}

			// If remainder starts with separator, it's a subdirectory (e.g. \project)
			if (remainder.startsWith("\\")) {
				return allowed;
			}

			// If allowed path itself ends with separator (e.g. D:\), then any remainder is a child
			if (allowed.normalized.endsWith("\\")) {
				return allowed;
			}
		}
	}

	return null;
}

/**
 * Validate if a path is allowed for the specified mode
 */
export function isPathAllowed(inputPath: string, mode: PathMode): boolean {
	const allowed = findAllowedPath(inputPath);

	if (!allowed) {
		return false;
	}

	if (mode === "read") {
		return allowed.allowRead;
	}

	if (mode === "write") {
		return allowed.allowWrite;
	}

	return false;
}

/**
 * Get the type of allowed path
 */
export function getPathType(inputPath: string): PathType {
	const allowed = findAllowedPath(inputPath);
	return allowed?.type ?? "unknown";
}

/**
 * Validate path and throw descriptive error if not allowed
 */
export function validatePath(inputPath: string, mode: PathMode): string {
	const normalized = normalizePath(inputPath);

	if (isPathBlocked(inputPath)) {
		throw new Error(
			`Access denied: ${inputPath} contains a blocked path segment (${BLOCKED_PATTERNS.join(", ")}).`,
		);
	}

	if (!isPathAllowed(inputPath, mode)) {
		const pathType = getPathType(inputPath);

		if (pathType === "onedrive" && mode === "write") {
			throw new Error(
				`Write access denied to OneDrive path: ${inputPath}. OneDrive is read-only.`,
			);
		}

		if (pathType === "unknown") {
			throw new Error(
				`Access denied: ${inputPath}. Path is outside allowed directories. ` +
					`Allowed: C:\\dev, D:\\, C:\\Users\\fresh_zxae3v6\\OneDrive (read-only)`,
			);
		}

		throw new Error(`${mode} access denied to path: ${inputPath}`);
	}

	return normalized;
}

/**
 * Check if a path exists
 */
export async function pathExists(inputPath: string): Promise<boolean> {
	try {
		await fs.promises.access(inputPath, fs.constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(inputPath: string): Promise<boolean> {
	try {
		const stats = await fs.promises.stat(inputPath);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Check if a path is a file
 */
export async function isFile(inputPath: string): Promise<boolean> {
	try {
		const stats = await fs.promises.stat(inputPath);
		return stats.isFile();
	} catch {
		return false;
	}
}

/**
 * Get all allowed paths configuration (for debugging/info)
 */
export function getAllowedPaths(): Array<{
	path: string;
	type: PathType;
	read: boolean;
	write: boolean;
}> {
	return ALLOWED_PATHS.map((p) => ({
		path: p.path,
		type: p.type,
		read: p.allowRead,
		write: p.allowWrite,
	}));
}
