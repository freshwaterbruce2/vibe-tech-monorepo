/**
 * PathValidator - Strict path validation with allow-list for Desktop Commander V3
 *
 * Allowed paths:
 * - V:\monorepo - Development work (read/write)
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
	/** Permit soft-blocked build dirs (e.g. dist) under this root */
	allowBuildArtifacts?: boolean;
}

// Define allowed paths with their permissions
const ALLOWED_PATHS: AllowedPath[] = [
	{
		path: "V:\\monorepo",
		normalized: "V:\\monorepo",
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
		allowBuildArtifacts: true,
	},
	{
		path: "C:\\Users\\fresh_zxae3v6\\OneDrive",
		normalized: "c:\\users\\fresh_zxae3v6\\onedrive",
		allowRead: true,
		allowWrite: false, // Read-only
		type: "onedrive",
	},
	{
		path: "V:\\monorepo",
		normalized: "v:\\monorepo",
		allowBuildArtifacts: true,
		allowRead: true,
		allowWrite: true,
		type: "dev",
	},
];

/**
 * Patterns that are always blocked regardless of allowed-path membership
 */
const HARD_BLOCKED_PATTERNS = ["node_modules", ".git"];
const SOFT_BLOCKED_PATTERNS = ["dist"];

/**
 * Global override: when permission is explicitly granted via the
 * DC_ALLOW_BLOCKED_PATHS env var (set in the MCP launch env), all pattern
 * blocks are lifted. Off by default.
 */
function isBlockOverrideEnabled(): boolean {
	const v = (process.env.DC_ALLOW_BLOCKED_PATHS ?? "").toLowerCase();
	return v === "1" || v === "true" || v === "yes";
}

/**
 * Check if a path contains a blocked pattern segment
 */
export function isPathBlocked(inputPath: string): boolean {
	// Explicit permission lifts all pattern blocks
	if (isBlockOverrideEnabled()) {
		return false;
	}

	const segments = inputPath.replace(/\//g, "\\").split("\\");

	// node_modules and .git are blocked under every allowed root
	if (HARD_BLOCKED_PATTERNS.some((pattern) => segments.includes(pattern))) {
		return true;
	}

	// dist (build output) allowed only under roots flagged allowBuildArtifacts
	// (V:\monorepo, D:\); blocked elsewhere
	if (SOFT_BLOCKED_PATTERNS.some((pattern) => segments.includes(pattern))) {
		return !findAllowedPath(inputPath)?.allowBuildArtifacts;
	}

	return false;
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
			// e.g., "c:\develop" should not match "V:\monorepo"
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
			`Access denied: ${inputPath} contains a blocked path segment (node_modules/.git always; dist outside V:\\ and D:\\ (set DC_ALLOW_BLOCKED_PATHS=1 to override)).`,
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
					`Allowed: V:\\monorepo, D:\\, C:\\Users\\fresh_zxae3v6\\OneDrive (read-only)`,
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
