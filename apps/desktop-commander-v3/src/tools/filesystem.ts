import * as FileSystem from "../FileSystemTools.js";

interface ToolAnnotations {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

export const filesystemTools: Array<{
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: ToolAnnotations;
}> = [
	{
		name: "dc_read_file",
		description: `Read file contents as UTF-8 text or base64-encoded binary.

Allowed Paths:
- C:\\dev - Full read access (development workspace)
- D:\\ - Full read access (databases, logs, learning data)
- C:\\Users\\fresh_zxae3v6\\OneDrive - Read-only

Parameters:
- path: Absolute Windows path (e.g., "C:\\dev\\README.md")
- base64: true for binary files (images, PDFs, executables), false for text (default)

Error Cases:
- Path outside allowed directories → Permission denied. Use 'dc_get_allowed_paths' to see allowed directories.
- File not found → Check spelling and use 'dc_list_directory' to browse.
- Binary file without base64=true → May return garbled text. Retry with base64=true.

Examples:
- path: "C:\\dev\\package.json" → Read package.json as text
- path: "D:\\screenshots\\screenshot.png", base64: true → Read image as base64`,
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Absolute Windows path (e.g., 'C:\\dev\\README.md')",
					minLength: 1,
				},
				base64: {
					type: "boolean",
					description: "Return as base64 for binary files (images, PDFs, executables)",
					default: false,
				},
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_list_directory",
		description: `List directory contents (files and subdirectories) within allowed paths. Returns file names, sizes, types, and modification dates.

Parameters:
- path: Directory to list (must be in allowed paths)
- recursive: false (default, flat list) or true (include subdirectories)
- maxDepth: Max recursion depth when recursive=true (1-10, default 3)

Performance:
- Flat listing: <100ms for most directories
- Recursive listing: 1-5s for large directories (>1000 files)

Examples:
- path: "C:\\dev", recursive: false → List C:\\dev files only
- path: "D:\\databases", recursive: true, maxDepth: 2 → List databases + subdirs (2 levels deep)

Returns: [{ name, path, size, type, modified, isDirectory }]`,
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Directory path (absolute Windows path)",
					minLength: 1,
				},
				recursive: {
					type: "boolean",
					description: "Include subdirectories (default: false)",
					default: false,
				},
				maxDepth: {
					type: "number",
					description: "Max recursion depth (1-10, default 3)",
					minimum: 1,
					maximum: 10,
					default: 3,
				},
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_search_files",
		description: `Search for files by name pattern using glob-style wildcards. Searches recursively from specified directory.

Wildcards:
- * (asterisk): Matches any characters (e.g., *.ts matches all TypeScript files)
- ? (question mark): Matches single character (e.g., test?.ts matches test1.ts, test2.ts)

Parameters:
- path: Directory to search from (recursively searches subdirectories)
- pattern: Glob pattern (e.g., "*.ts", "test*", "README.*")
- maxResults: Limit results (1-500, default 100)

Examples:
- path: "C:\\dev\\apps", pattern: "*.ts" → Find all TypeScript files
- path: "D:\\logs", pattern: "error*.log" → Find error log files
- path: "C:\\dev", pattern: "package.json" → Find all package.json files

Returns: [{ path, name, size, modified }]`,
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Directory to search recursively",
					minLength: 1,
				},
				pattern: {
					type: "string",
					description: "Glob pattern (e.g., '*.ts', 'test*', 'README.*')",
					minLength: 1,
				},
				maxResults: {
					type: "number",
					description: "Max results to return (1-500, default 100)",
					minimum: 1,
					maximum: 500,
					default: 100,
				},
			},
			required: ["path", "pattern"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_search_content",
		description: `Search text files for matching content (similar to grep/ripgrep). Searches line-by-line and returns file paths + matching lines with context.

Parameters:
- path: Directory to search (recursively)
- query: Text to search (literal string, not regex)
- extensions: File types to search (e.g., ["ts", "tsx", "md"]). Default: all text files.
- caseSensitive: true for exact case match, false (default) for case-insensitive
- maxResults: Limit results (1-200, default 50)

Performance:
- Searching large directories (>10k files) may take 5-10 seconds
- Use extensions filter to improve speed

Error Cases:
- Path outside allowed directories → Permission denied
- Query too short (<1 char) → Returns validation error
- No matches → Returns empty array (not an error)

Examples:
- path: "C:\\dev\\apps", query: "useEffect", extensions: ["ts", "tsx"] → Find React hooks
- path: "D:\\logs", query: "ERROR", caseSensitive: true → Find error logs

Returns: [{ file, line, lineNumber, match }]`,
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Directory to search recursively",
					minLength: 1,
				},
				query: {
					type: "string",
					description: "Text to search for (literal string, case-insensitive by default)",
					minLength: 1,
				},
				extensions: {
					type: "array",
					items: { type: "string" },
					description: "File extensions to search (e.g., ['ts', 'tsx', 'md'])",
				},
				caseSensitive: {
					type: "boolean",
					description: "Case-sensitive search (default: false)",
					default: false,
				},
				maxResults: {
					type: "number",
					description: "Max results to return (1-200, default 50)",
					minimum: 1,
					maximum: 200,
					default: 50,
				},
			},
			required: ["path", "query"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_file_info",
		description: "Get file or directory metadata",
		inputSchema: {
			type: "object",
			properties: {
				path: { type: "string", description: "Path to file/directory" },
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_file_hash",
		description:
			"Compute a file hash (Windows Get-FileHash equivalent). Default SHA256.",
		inputSchema: {
			type: "object",
			properties: {
				path: { type: "string", description: "Absolute path to file" },
				algorithm: {
					type: "string",
					description: "Hash algorithm (sha256, sha384, sha512, md5, sha1)",
					default: "sha256",
				},
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_acl",
		description: "Get Windows ACL for a file/folder (PowerShell Get-Acl).",
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Absolute path to file/directory",
				},
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_item_attributes",
		description:
			"Get Windows file attributes, timestamps, and symlink info (PowerShell Get-Item).",
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Absolute path to file/directory",
				},
			},
			required: ["path"],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_long_paths_status",
		description: "Check whether Windows LongPathsEnabled is set (HKLM).",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_copy_directory_robocopy",
		description: `High-performance directory copy using Windows robocopy (Robust File Copy). Optimized for large directories with thousands of files. Supports resumption, multi-threading, and integrity verification.

DANGER: mirror=true DELETES files in destination that don't exist in source. Requires confirmDangerous=true safety flag.

Parameters:
- source, destination: Absolute paths (must be in allowed directories)
- threads: Parallel copy threads (1-128, default 8)
- restartable: Resume interrupted copies (default true, adds ~10% overhead)
- unbuffered: Direct IO for large files (>1GB, default false)
- mirror: DELETE files in dest not in source (DESTRUCTIVE, default false)
- confirmDangerous: Required when mirror=true (safety check)

Performance:
- ~100MB/s for HDD, ~500MB/s for SSD
- 8 threads optimal for most cases

Use Cases:
- Backup D:\\databases → D:\\backups (safe, restartable)
- Sync C:\\dev\\dist → D:\\build-cache (mirror mode for exact copy)

Examples:
- Basic copy: source="C:\\dev\\src", destination="D:\\backup\\src"
- Mirror (dangerous): source="C:\\dev\\dist", destination="D:\\cache", mirror=true, confirmDangerous=true

Returns: { copied, skipped, errors, exitCode, executionTime }`,
		inputSchema: {
			type: "object",
			properties: {
				source: {
					type: "string",
					description: "Source directory (absolute path)",
					minLength: 1,
				},
				destination: {
					type: "string",
					description: "Destination directory (absolute path)",
					minLength: 1,
				},
				threads: {
					type: "number",
					description: "Parallel threads (1-128, default 8)",
					minimum: 1,
					maximum: 128,
					default: 8,
				},
				restartable: {
					type: "boolean",
					description: "Resume interrupted copies (/Z flag, adds ~10% overhead)",
					default: true,
				},
				unbuffered: {
					type: "boolean",
					description: "Unbuffered IO for files >1GB (/J flag)",
					default: false,
				},
				copySecurity: {
					type: "boolean",
					description: "Copy NTFS security info (/COPY:DATS)",
					default: false,
				},
				mirror: {
					type: "boolean",
					description: "DESTRUCTIVE: Delete dest files not in source (/MIR)",
					default: false,
				},
				confirmDangerous: {
					type: "boolean",
					description: "REQUIRED when mirror=true (safety confirmation)",
					default: false,
				},
				maxRetries: {
					type: "number",
					description: "Retry count for failed copies (/R:n)",
					minimum: 0,
					maximum: 10,
					default: 2,
				},
				waitSeconds: {
					type: "number",
					description: "Wait seconds between retries (/W:n)",
					minimum: 1,
					maximum: 60,
					default: 1,
				},
			},
			required: ["source", "destination"],
		},
	},
];

export const filesystemHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	dc_read_file: async (a) => {
		const content = a.base64
			? await FileSystem.readFileBase64(String(a.path))
			: await FileSystem.readFile(String(a.path));
		return a.base64 ? { base64: content } : content;
	},
	dc_list_directory: async (a) =>
		FileSystem.listDirectory(String(a.path), {
			recursive: Boolean(a.recursive),
			maxDepth: Number(a.maxDepth) || 3,
		}),
	dc_search_files: async (a) =>
		FileSystem.searchFiles(String(a.path), String(a.pattern), {
			maxResults: Number(a.maxResults) || 100,
		}),
	dc_search_content: async (a) =>
		FileSystem.searchContent(String(a.path), String(a.query), {
			extensions: Array.isArray(a.extensions)
				? (a.extensions as string[])
				: undefined,
			caseSensitive: Boolean(a.caseSensitive),
			maxResults: Number(a.maxResults) || 50,
		}),
	dc_get_file_info: async (a) => FileSystem.getFileInfo(String(a.path)),
	dc_get_file_hash: async (a) =>
		FileSystem.getFileHash(
			String(a.path),
			a.algorithm ? String(a.algorithm) : undefined,
		),
	dc_get_acl: async (a) => FileSystem.getAcl(String(a.path)),
	dc_get_item_attributes: async (a) => FileSystem.getItemAttributes(String(a.path)),
	dc_get_long_paths_status: async () => FileSystem.getLongPathsStatus(),
	dc_copy_directory_robocopy: async (a) =>
		FileSystem.copyDirectoryRobocopy(
			String(a.source),
			String(a.destination),
			{
				threads: a.threads !== undefined ? Number(a.threads) : undefined,
				restartable:
					a.restartable !== undefined
						? Boolean(a.restartable)
						: undefined,
				unbuffered: Boolean(a.unbuffered),
				copySecurity: Boolean(a.copySecurity),
				mirror: Boolean(a.mirror),
				confirmDangerous: Boolean(a.confirmDangerous),
				maxRetries:
					a.maxRetries !== undefined ? Number(a.maxRetries) : undefined,
				waitSeconds:
					a.waitSeconds !== undefined ? Number(a.waitSeconds) : undefined,
			},
		),
};
