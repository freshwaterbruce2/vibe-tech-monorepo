/**
 * FileSystemTools - Path-restricted filesystem operations for Desktop Commander V3
 * All operations validate paths against the allow-list before execution.
 */

import fs from "fs";
import path from "path";
import {
	isDirectory,
	isFile,
	normalizePath,
	validatePath,
} from "./PathValidator.js";

export {
	copyDirectoryRobocopy,
	getAcl,
	getFileHash,
	getItemAttributes,
	getLongPathsStatus,
} from "./WindowsFileSystemTools.js";

export interface FileInfo {
	name: string;
	path: string;
	isDirectory: boolean;
	isFile: boolean;
	size: number;
	created: string;
	modified: string;
	accessed: string;
}

export interface DirectoryEntry {
	name: string;
	type: "file" | "directory";
	size?: number;
}

export interface SearchResult {
	path: string;
	name: string;
	type: "file" | "directory";
}

export interface ContentSearchResult {
	path: string;
	line: number;
	content: string;
}

/**
 * Read file contents with path validation
 */
export async function readFile(filePath: string): Promise<string> {
	validatePath(filePath, "read");

	if (!(await isFile(filePath))) {
		throw new Error(`Not a file or does not exist: ${filePath}`);
	}

	const content = await fs.promises.readFile(filePath, "utf-8");
	return content;
}

/**
 * Read file as base64 (for binary files)
 */
export async function readFileBase64(filePath: string): Promise<string> {
	validatePath(filePath, "read");

	if (!(await isFile(filePath))) {
		throw new Error(`Not a file or does not exist: ${filePath}`);
	}

	const content = await fs.promises.readFile(filePath);
	return content.toString("base64");
}

/**
 * Write content to a file with path validation
 */
export async function writeFile(
	filePath: string,
	content: string,
	options: { append?: boolean; createDirs?: boolean } = {},
): Promise<void> {
	validatePath(filePath, "write");

	if (options.createDirs) {
		const dir = path.dirname(filePath);
		await fs.promises.mkdir(dir, { recursive: true });
	}

	if (options.append) {
		await fs.promises.appendFile(filePath, content, "utf-8");
	} else {
		await fs.promises.writeFile(filePath, content, "utf-8");
	}
}

/**
 * List directory contents with path validation
 */
export async function listDirectory(
	dirPath: string,
	options: { recursive?: boolean; maxDepth?: number } = {},
): Promise<DirectoryEntry[]> {
	validatePath(dirPath, "read");

	if (!(await isDirectory(dirPath))) {
		throw new Error(`Not a directory or does not exist: ${dirPath}`);
	}

	const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
	const results: DirectoryEntry[] = [];

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			results.push({ name: entry.name, type: "directory" });

			if (options.recursive && (!options.maxDepth || options.maxDepth > 1)) {
				try {
					const subEntries = await listDirectory(entryPath, {
						recursive: true,
						maxDepth: options.maxDepth ? options.maxDepth - 1 : undefined,
					});
					for (const sub of subEntries) {
						results.push({
							name: path.join(entry.name, sub.name),
							type: sub.type,
							size: sub.size,
						});
					}
				} catch {
					// Skip directories we can't access
				}
			}
		} else if (entry.isFile()) {
			try {
				const stats = await fs.promises.stat(entryPath);
				results.push({ name: entry.name, type: "file", size: stats.size });
			} catch {
				results.push({ name: entry.name, type: "file" });
			}
		}
	}

	return results;
}

/**
 * Search for files by name pattern
 */
export async function searchFiles(
	dirPath: string,
	pattern: string,
	options: { maxResults?: number; includeDirectories?: boolean } = {},
): Promise<SearchResult[]> {
	validatePath(dirPath, "read");

	const maxResults = options.maxResults ?? 100;
	const results: SearchResult[] = [];

	// Convert glob-like pattern to regex
	const regexPattern = pattern
		.replace(/\./g, "\\.")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	const regex = new RegExp(regexPattern, "i");

	async function search(currentPath: string): Promise<void> {
		if (results.length >= maxResults) return;

		try {
			const entries = await fs.promises.readdir(currentPath, {
				withFileTypes: true,
			});

			for (const entry of entries) {
				if (results.length >= maxResults) break;

				const fullPath = path.join(currentPath, entry.name);

				if (regex.test(entry.name)) {
					if (entry.isFile()) {
						results.push({ path: fullPath, name: entry.name, type: "file" });
					} else if (entry.isDirectory() && options.includeDirectories) {
						results.push({
							path: fullPath,
							name: entry.name,
							type: "directory",
						});
					}
				}

				if (entry.isDirectory()) {
					await search(fullPath);
				}
			}
		} catch {
			// Skip directories we can't access
		}
	}

	await search(dirPath);
	return results;
}

/**
 * Search file contents (grep-like)
 */
export async function searchContent(
	dirPath: string,
	query: string,
	options: {
		maxResults?: number;
		extensions?: string[];
		caseSensitive?: boolean;
	} = {},
): Promise<ContentSearchResult[]> {
	validatePath(dirPath, "read");

	const maxResults = options.maxResults ?? 50;
	const results: ContentSearchResult[] = [];
	const flags = options.caseSensitive ? "" : "i";
	const regex = new RegExp(query, flags);

	async function search(currentPath: string): Promise<void> {
		if (results.length >= maxResults) return;

		try {
			const entries = await fs.promises.readdir(currentPath, {
				withFileTypes: true,
			});

			for (const entry of entries) {
				if (results.length >= maxResults) break;

				const fullPath = path.join(currentPath, entry.name);

				if (entry.isDirectory()) {
					await search(fullPath);
				} else if (entry.isFile()) {
					// Check extension filter
					if (options.extensions && options.extensions.length > 0) {
						const ext = path.extname(entry.name).toLowerCase().slice(1);
						if (!options.extensions.includes(ext)) continue;
					}

					try {
						const content = await fs.promises.readFile(fullPath, "utf-8");
						const lines = content.split("\n");

						for (
							let i = 0;
							i < lines.length && results.length < maxResults;
							i++
						) {
							if (regex.test(lines[i])) {
								results.push({
									path: fullPath,
									line: i + 1,
									content: lines[i].trim().slice(0, 200),
								});
							}
						}
					} catch {
						// Skip files we can't read (binary, etc.)
					}
				}
			}
		} catch {
			// Skip directories we can't access
		}
	}

	await search(dirPath);
	return results;
}

/**
 * Create a directory with path validation
 */
export async function createDirectory(
	dirPath: string,
	options: { recursive?: boolean } = {},
): Promise<void> {
	validatePath(dirPath, "write");
	await fs.promises.mkdir(dirPath, { recursive: options.recursive ?? true });
}

/**
 * Move/rename a file or directory
 */
export async function moveFile(
	sourcePath: string,
	destPath: string,
): Promise<void> {
	validatePath(sourcePath, "write"); // Need write to remove from source
	validatePath(destPath, "write");

	await fs.promises.rename(sourcePath, destPath);
}

/**
 * Copy a file
 */
export async function copyFile(
	sourcePath: string,
	destPath: string,
): Promise<void> {
	validatePath(sourcePath, "read");
	validatePath(destPath, "write");

	await fs.promises.copyFile(sourcePath, destPath);
}

/**
 * Delete a file or directory
 */
export async function deleteFile(
	filePath: string,
	options: { recursive?: boolean } = {},
): Promise<void> {
	validatePath(filePath, "write");

	const stats = await fs.promises.stat(filePath);

	if (stats.isDirectory()) {
		if (!options.recursive) {
			throw new Error(
				`Cannot delete directory without recursive flag: ${filePath}`,
			);
		}
		await fs.promises.rm(filePath, { recursive: true });
	} else {
		await fs.promises.unlink(filePath);
	}
}

/**
 * Get file/directory information
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
	validatePath(filePath, "read");

	const stats = await fs.promises.stat(filePath);

	return {
		name: path.basename(filePath),
		path: normalizePath(filePath),
		isDirectory: stats.isDirectory(),
		isFile: stats.isFile(),
		size: stats.size,
		created: stats.birthtime.toISOString(),
		modified: stats.mtime.toISOString(),
		accessed: stats.atime.toISOString(),
	};
}
