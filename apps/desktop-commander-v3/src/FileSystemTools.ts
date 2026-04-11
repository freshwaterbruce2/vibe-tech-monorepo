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
	pathExists,
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

export interface BatchReadResult {
	path: string;
	content?: string;
	error?: string;
}

export interface BatchWriteResult {
	path: string;
	written: boolean;
	error?: string;
}

export interface EditSpec {
	path: string;
	mode: "literal" | "regex";
	needle: string;
	replacement: string;
	allowMultiple?: boolean;
}

export interface EditResult {
	path: string;
	changes: number;
}

export interface ApplyEditsResult {
	results: EditResult[];
	dryRun: boolean;
}

/**
 * Read multiple files, returning content or error per file.
 */
export async function readFiles(
	filePaths: string[],
	options: { maxBytes?: number } = {},
): Promise<BatchReadResult[]> {
	return Promise.all(
		filePaths.map(async (filePath): Promise<BatchReadResult> => {
			try {
				validatePath(filePath, "read");
				if (!(await isFile(filePath))) {
					return { path: filePath, error: "Not a file or does not exist" };
				}
				if (options.maxBytes !== undefined) {
					const stats = await fs.promises.stat(filePath);
					if (stats.size > options.maxBytes) {
						return {
							path: filePath,
							error: `File size ${stats.size} exceeds maxBytes ${options.maxBytes}`,
						};
					}
				}
				const content = await fs.promises.readFile(filePath, "utf-8");
				return { path: filePath, content: String(content) };
			} catch (err) {
				return {
					path: filePath,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		}),
	);
}

/**
 * Write multiple files, optionally atomically (rollback on failure).
 */
export async function writeFiles(
	files: Array<{ path: string; content: string }>,
	options: { atomic?: boolean } = {},
): Promise<BatchWriteResult[]> {
	if (options.atomic) {
		// Back up originals then write; rollback on any failure
		const backups: Array<{ path: string; content: string | null }> = [];
		for (const file of files) {
			validatePath(file.path, "write");
			const exists = await pathExists(file.path);
			const original = exists
				? String(await fs.promises.readFile(file.path, "utf-8"))
				: null;
			backups.push({ path: file.path, content: original });
		}
		try {
			for (const file of files) {
				await fs.promises.mkdir(path.dirname(file.path), { recursive: true });
				await fs.promises.writeFile(file.path, file.content, "utf-8");
			}
		} catch (err) {
			// Rollback
			for (const backup of backups) {
				if (backup.content !== null) {
					await fs.promises.writeFile(backup.path, backup.content, "utf-8");
				}
			}
			throw err;
		}
		return files.map((f) => ({ path: f.path, written: true }));
	}

	return Promise.all(
		files.map(async (file): Promise<BatchWriteResult> => {
			try {
				validatePath(file.path, "write");
				await fs.promises.mkdir(path.dirname(file.path), { recursive: true });
				await fs.promises.writeFile(file.path, file.content, "utf-8");
				return { path: file.path, written: true };
			} catch (err) {
				return {
					path: file.path,
					written: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		}),
	);
}

/**
 * Apply text edits (literal or regex) to files, with optional dry-run mode.
 */
export async function applyEdits(
	edits: EditSpec[],
	options: { dryRun?: boolean } = {},
): Promise<ApplyEditsResult> {
	const results: EditResult[] = [];
	for (const edit of edits) {
		validatePath(edit.path, "write");
		const raw = await fs.promises.readFile(edit.path, "utf-8");
		const content = String(raw);
		let updated = content;
		let changes = 0;

		if (edit.mode === "literal") {
			const idx = content.indexOf(edit.needle);
			if (idx === -1) {
				throw new Error(
					`Needle not found in ${edit.path}: "${edit.needle}"`,
				);
			}
			updated = content.replace(
				edit.allowMultiple
					? new RegExp(edit.needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
					: edit.needle,
				edit.replacement,
			);
			changes = (content.match(
				new RegExp(edit.needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
			) ?? []).length;
		} else {
			const flags = edit.allowMultiple ? "g" : "";
			const re = new RegExp(edit.needle, flags);
			const matches = content.match(new RegExp(edit.needle, "g")) ?? [];
			changes = matches.length;
			updated = content.replace(re, edit.replacement);
		}

		if (!options.dryRun) {
			await fs.promises.writeFile(edit.path, updated, "utf-8");
		}
		results.push({ path: edit.path, changes });
	}
	return { results, dryRun: options.dryRun ?? false };
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
