/**
 * Desktop Commander V3 - Enhanced MCP Server
 *
 * Comprehensive MCP server with 30+ tools for Windows 11 desktop automation.
 * Optimized for ChatGPT Codex and other AI agents.
 *
 * Path Permissions:
 * - C:\dev - Read/Write (development)
 * - D:\ - Read/Write (databases, learning, large files)
 * - C:\Users\fresh_zxae3v6\OneDrive - Read-only
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import open from "open";
import si from "systeminformation";

// Import tool modules
import * as Clipboard from "./ClipboardTools.js";
import * as FileSystem from "./FileSystemTools.js";
import * as Input from "./InputTools.js";
import * as Media from "./MediaTools.js";
import { getAllowedPaths } from "./PathValidator.js";
import * as Screenshot from "./ScreenshotTools.js";
import * as System from "./SystemTools.js";
import * as Web from "./WebTools.js";
import * as Window from "./WindowTools.js";

type JsonSchema = Record<string, unknown>;

// ============================================================================
// Tool Definitions
// ============================================================================

interface ToolAnnotations {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

const tools: Array<{
	name: string;
	description: string;
	inputSchema: JsonSchema;
	annotations?: ToolAnnotations;
}> = [
	// ----------------------
	// System Information
	// ----------------------
	{
		name: "dc_get_cpu",
		description: "Get current CPU load information",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_mem",
		description: "Get current memory usage information",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_system_info",
		description: "Get CPU, memory, and OS information",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_list_processes",
		description: "List running processes (sanitized, limited)",
		inputSchema: {
			type: "object",
			properties: {
				limit: {
					type: "number",
					description: "Max processes (1-200)",
					default: 50,
				},
			},
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_open_url",
		description: "Open a URL in default browser (HTTP/HTTPS only)",
		inputSchema: {
			type: "object",
			properties: { url: { type: "string", description: "URL to open" } },
			required: ["url"],
		},
		annotations: { openWorldHint: true },
	},
	{
		name: "dc_get_allowed_paths",
		description: `Get list of allowed filesystem paths and their read/write permissions. Use this to understand which directories the MCP server can access.

Returns: Array of allowed paths with permission levels:
- C:\\dev - Read/Write (development workspace)
- D:\\ - Read/Write (databases, logs, learning data, screenshots)
- C:\\Users\\fresh_zxae3v6\\OneDrive - Read-only

Use this tool when:
- You get "Permission denied" errors
- Planning file operations (to verify path is allowed)
- Understanding workspace boundaries

Example output:
[
  { path: "C:\\dev", read: true, write: true },
  { path: "D:\\", read: true, write: true },
  { path: "C:\\Users\\fresh_zxae3v6\\OneDrive", read: true, write: false }
]`,
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},

	// ----------------------
	// Filesystem Operations
	// ----------------------
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
		name: "dc_write_file",
		description: `Write text content to a file. Supports overwrite and append modes.

Allowed Paths:
- C:\\dev - Full write access (development workspace)
- D:\\ - Full write access (databases, logs, data)
- OneDrive - Read-only (writes NOT allowed)

Parameters:
- path: Absolute Windows path
- content: Text content to write (UTF-8 encoded)
- append: false (default, overwrite) or true (append to end)
- createDirs: true (default, create parent directories) or false

Error Cases:
- Path outside allowed directories → Permission denied
- Parent directory missing and createDirs=false → Directory not found
- Disk full → Write error

Examples:
- path: "C:\\dev\\output.txt", content: "Hello" → Create/overwrite file
- path: "D:\\logs\\app.log", content: "ERROR", append: true → Append to log
- path: "C:\\dev\\new\\file.json", content: "{}", createDirs: true → Create dirs + file`,
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Absolute Windows path to write to",
					minLength: 1,
				},
				content: {
					type: "string",
					description: "Text content to write (UTF-8)",
				},
				append: {
					type: "boolean",
					description: "Append to end of file (false = overwrite)",
					default: false,
				},
				createDirs: {
					type: "boolean",
					description: "Create parent directories if missing",
					default: true,
				},
			},
			required: ["path", "content"],
		},
		annotations: { idempotentHint: true },
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
		name: "dc_create_directory",
		description: "Create a directory within allowed paths",
		inputSchema: {
			type: "object",
			properties: { path: { type: "string", description: "Directory path" } },
			required: ["path"],
		},
		annotations: { idempotentHint: true },
	},
	{
		name: "dc_move_file",
		description: "Move or rename a file/directory",
		inputSchema: {
			type: "object",
			properties: {
				source: { type: "string", description: "Source path" },
				destination: { type: "string", description: "Destination path" },
			},
			required: ["source", "destination"],
		},
	},
	{
		name: "dc_copy_file",
		description: "Copy a file",
		inputSchema: {
			type: "object",
			properties: {
				source: { type: "string", description: "Source path" },
				destination: { type: "string", description: "Destination path" },
			},
			required: ["source", "destination"],
		},
	},
	{
		name: "dc_delete_file",
		description: "Delete a file or directory",
		inputSchema: {
			type: "object",
			properties: {
				path: { type: "string", description: "Path to delete" },
				recursive: {
					type: "boolean",
					description: "Delete directories recursively",
					default: false,
				},
			},
			required: ["path"],
		},
		annotations: { destructiveHint: true },
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

	// ----------------------
	// Clipboard
	// ----------------------
	{
		name: "dc_get_clipboard",
		description: "Get clipboard text content",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_set_clipboard",
		description: "Set clipboard text content",
		inputSchema: {
			type: "object",
			properties: { text: { type: "string", description: "Text to copy" } },
			required: ["text"],
		},
		annotations: { idempotentHint: true },
	},

	// ----------------------
	// Screenshot
	// ----------------------
	{
		name: "dc_take_screenshot",
		description: `Take a screenshot of the entire screen and save as PNG. Captures all monitors if multiple displays are connected.

Parameters:
- filename: (optional) Custom filename without extension (e.g., "test-screenshot"). If omitted, uses timestamp.
- directory: Directory to save (must be in D:\\ drive, default: "D:\\screenshots")

Automatic Naming:
- If filename omitted: screenshot-YYYY-MM-DD-HH-mm-ss.png
- If filename provided: {filename}.png

Examples:
- (no params) → D:\\screenshots\\screenshot-2026-02-19-14-30-45.png
- filename: "test" → D:\\screenshots\\test.png
- filename: "ui-bug", directory: "D:\\temp" → D:\\temp\\ui-bug.png

Returns: { saved: true, path: "D:\\screenshots\\..." }`,
		inputSchema: {
			type: "object",
			properties: {
				filename: {
					type: "string",
					description: "Custom filename without extension (optional, default: timestamp)",
				},
				directory: {
					type: "string",
					description: "Save directory (must be in D:\\ drive, default: D:\\screenshots)",
					default: "D:\\screenshots",
				},
			},
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_screenshot_window",
		description: `Take a screenshot of a specific window matched by title and save as PNG.

Parameters:
- title: Window title pattern (regex, case-insensitive)
- filename: Custom filename without extension (optional, default: timestamp)
- directory: Save directory (must be D:\\ drive, default: D:\\screenshots)

Returns: { saved: true, path: "D:\\screenshots\\..." }`,
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string", description: "Window title pattern (regex)", minLength: 1 },
				filename: { type: "string", description: "Custom filename without extension (optional)" },
				directory: { type: "string", description: "Save directory (D:\\ drive, default: D:\\screenshots)", default: "D:\\screenshots" },
			},
			required: ["title"],
		},
		annotations: { readOnlyHint: true },
	},

	// ----------------------
	// Window Management
	// ----------------------
	{
		name: "dc_list_windows",
		description: "List all open windows with titles",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_active_window",
		description: "Get the currently focused window",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_window_action",
		description: `Perform action on a window matched by title. Uses regex pattern matching to find windows.

Actions:
- minimize: Minimize window to taskbar
- maximize: Maximize window to full screen
- restore: Restore minimized/maximized window to normal size
- close: Close window (sends close signal, may prompt to save)
- focus: Bring window to foreground and activate

Parameters:
- title: Regex pattern to match window title (case-insensitive)
- action: Action to perform (minimize, maximize, restore, close, focus)

Title Matching:
- Exact match: "Visual Studio Code" matches only VS Code
- Partial match: ".*Chrome.*" matches any Chrome window
- Multiple matches: Action applies to FIRST matching window

Examples:
- title: "Visual Studio Code", action: "minimize" → Minimize VS Code
- title: ".*Chrome.*", action: "close" → Close first Chrome window
- title: "Untitled", action: "focus" → Focus unsaved Notepad window

Returns: { success: true, window: "Window Title", action: "minimize" }`,
		inputSchema: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "Window title pattern (regex, case-insensitive)",
					minLength: 1,
				},
				action: {
					type: "string",
					enum: ["minimize", "maximize", "restore", "close", "focus"],
					description: "Action to perform on matched window",
				},
			},
			required: ["title", "action"],
		},
	},
	{
		name: "dc_window_move",
		description: "Move a window to an absolute screen position without resizing. Matches window by title regex.",
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string", description: "Window title pattern (regex, case-insensitive)", minLength: 1 },
				x: { type: "number", description: "Screen X position (pixels)" },
				y: { type: "number", description: "Screen Y position (pixels)" },
			},
			required: ["title", "x", "y"],
		},
		annotations: { idempotentHint: true },
	},
	{
		name: "dc_window_resize",
		description: "Resize a window without moving it. Matches window by title regex.",
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string", description: "Window title pattern (regex, case-insensitive)", minLength: 1 },
				width: { type: "number", description: "New width in pixels", minimum: 1 },
				height: { type: "number", description: "New height in pixels", minimum: 1 },
			},
			required: ["title", "width", "height"],
		},
		annotations: { idempotentHint: true },
	},
	{
		name: "dc_launch_app",
		description:
			"Launch an allowed application (notepad, calc, explorer, chrome, edge, firefox, code, terminal)",
		inputSchema: {
			type: "object",
			properties: {
				app: { type: "string", description: "App name from allow-list" },
				args: { type: "string", description: "Optional arguments" },
			},
			required: ["app"],
		},
	},
	{
		name: "dc_terminate_app",
		description: "Terminate a process by name",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Process name" },
				force: { type: "boolean", default: false },
			},
			required: ["name"],
		},
		annotations: { destructiveHint: true },
	},

	// ----------------------
	// Input Simulation
	// ----------------------
	{
		name: "dc_mouse_move",
		description: "Move mouse cursor to position",
		inputSchema: {
			type: "object",
			properties: {
				x: { type: "number", description: "X coordinate" },
				y: { type: "number", description: "Y coordinate" },
			},
			required: ["x", "y"],
		},
		annotations: { idempotentHint: true },
	},
	{
		name: "dc_mouse_click",
		description: "Click mouse button",
		inputSchema: {
			type: "object",
			properties: {
				button: {
					type: "string",
					enum: ["left", "right", "middle"],
					default: "left",
				},
				double: { type: "boolean", default: false },
			},
		},
	},
	{
		name: "dc_mouse_scroll",
		description: "Scroll mouse wheel",
		inputSchema: {
			type: "object",
			properties: {
				amount: { type: "number", description: "Scroll amount (units)" },
				direction: { type: "string", enum: ["up", "down"], default: "down" },
			},
			required: ["amount"],
		},
	},
	{
		name: "dc_mouse_drag",
		description: "Drag from one screen position to another (press, move, release). Use for drag-and-drop operations.",
		inputSchema: {
			type: "object",
			properties: {
				fromX: { type: "number", description: "Start X coordinate" },
				fromY: { type: "number", description: "Start Y coordinate" },
				toX: { type: "number", description: "End X coordinate" },
				toY: { type: "number", description: "End Y coordinate" },
			},
			required: ["fromX", "fromY", "toX", "toY"],
		},
	},
	{
		name: "dc_keyboard_type",
		description: "Type text using keyboard simulation",
		inputSchema: {
			type: "object",
			properties: { text: { type: "string", description: "Text to type" } },
			required: ["text"],
		},
	},
	{
		name: "dc_keyboard_shortcut",
		description: "Send keyboard shortcut (e.g., ctrl+c, alt+f4, ctrl+shift+s)",
		inputSchema: {
			type: "object",
			properties: {
				shortcut: {
					type: "string",
					description: "Shortcut keys separated by +",
				},
			},
			required: ["shortcut"],
		},
	},

	// ----------------------
	// System Controls
	// ----------------------
	{
		name: "dc_notify",
		description: "Show a Windows toast notification. Useful for alerting the user of task completion or status.",
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string", description: "Notification title", minLength: 1 },
				message: { type: "string", description: "Notification body text", minLength: 1 },
			},
			required: ["title", "message"],
		},
	},
	{
		name: "dc_set_volume",
		description: "Adjust system volume",
		inputSchema: {
			type: "object",
			properties: { action: { type: "string", enum: ["up", "down", "mute"] } },
			required: ["action"],
		},
	},
	{
		name: "dc_set_brightness",
		description: "Set screen brightness (0-100)",
		inputSchema: {
			type: "object",
			properties: {
				level: { type: "number", description: "Brightness 0-100" },
			},
			required: ["level"],
		},
		annotations: { idempotentHint: true },
	},
	{
		name: "dc_get_battery",
		description: "Get battery status",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_network",
		description: "Get network interface information",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_get_disks",
		description: "Get disk usage information",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_run_powershell",
		description: `Execute PowerShell commands with full system access. UNRESTRICTED - can run any PowerShell command including scripts, modules, and system operations.

SECURITY: Extremely powerful tool. Validate user intent before executing destructive commands (Remove-Item, Stop-Process, etc.).

Timeout: Commands that exceed timeout (default 60s) are forcefully terminated. Use longer timeout for large operations.

Error Handling:
- Non-zero exit code → Returns { exitCode, stdout, stderr }
- Timeout → Returns { timeout: true, partialOutput }
- PowerShell syntax error → Returns error with syntax details

Examples:
- command: "Get-Process | Where {$_.CPU -gt 100}" → CPU-intensive processes
- command: "Get-ChildItem C:\\dev -Recurse | Measure-Object" → File count
- command: "Test-Path D:\\databases\\trading.db" → Check file exists

Returns: { exitCode, stdout, stderr, executionTime }`,
		inputSchema: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: "PowerShell command to execute (full syntax support)",
					minLength: 1,
				},
				timeout: {
					type: "number",
					description: "Max execution time in milliseconds (default: 60000, max: 300000)",
					minimum: 1000,
					maximum: 300000,
					default: 60000,
				},
			},
			required: ["command"],
		},
		annotations: { destructiveHint: true },
	},
	{
		name: "dc_run_cmd",
		description: `Execute Command Prompt (cmd.exe) commands with full system access. UNRESTRICTED - can run any CMD command including batch files and system operations.

SECURITY: Powerful legacy shell. Prefer 'dc_run_powershell' for modern Windows operations. Use CMD only for legacy batch files or specific CMD-only tools.

Timeout: Commands that exceed timeout (default 60s) are forcefully terminated.

Examples:
- command: "dir C:\\dev /s /b" → Recursive file list
- command: "tasklist | findstr node" → Find Node.js processes
- command: "echo %PATH%" → Display PATH environment variable

Returns: { exitCode, stdout, stderr, executionTime }`,
		inputSchema: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: "CMD command to execute (batch syntax)",
					minLength: 1,
				},
				timeout: {
					type: "number",
					description: "Max execution time in milliseconds (default: 60000, max: 300000)",
					minimum: 1000,
					maximum: 300000,
					default: 60000,
				},
			},
			required: ["command"],
		},
		annotations: { destructiveHint: true },
	},

	// ----------------------
	// Media & Recording
	// ----------------------
	{
		name: "dc_list_cameras",
		description: `List available camera devices on Windows 11. Returns camera names and instance IDs.

Uses Windows PnP (Plug and Play) device enumeration via PowerShell.

Returns: Array of camera devices with name and optional instanceId
Example: [{ name: "Integrated Webcam", instanceId: "USB\\VID_..." }]

Use Cases:
- Enumerate cameras before recording
- Verify camera availability
- Get device names for dc_capture_camera

Error Cases:
- No cameras found → Returns empty array []
- PowerShell execution failure → Returns error`,
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "dc_record_screen",
		description: `Record screen video using ffmpeg. Captures entire desktop including all monitors.

REQUIRES: ffmpeg installed and in PATH (or set FFMPEG_PATH env var)

Parameters:
- durationSeconds: Recording duration (1-3600, required)
- fps: Frames per second (1-60, default 15, higher = larger files)
- directory: Save directory (default D:\\recordings)
- filename: Custom filename without extension (optional)
- outputPath: Full output path (overrides directory/filename)

Codec: H.264 (yuv420p) for broad compatibility
Output Format: MP4

Examples:
- durationSeconds: 10, fps: 30 → Record 10s at 30fps
- durationSeconds: 60, filename: "demo" → Record 1min to D:\\recordings\\demo.mp4

Performance:
- 15fps: ~5MB/min
- 30fps: ~10MB/min
- 60fps: ~20MB/min

Returns: { path: "D:\\recordings\\screen-record-2026-02-19-14-30-45.mp4" }`,
		inputSchema: {
			type: "object",
			properties: {
				durationSeconds: {
					type: "number",
					description: "Recording duration in seconds (1-3600)",
					minimum: 1,
					maximum: 3600,
				},
				fps: {
					type: "number",
					description: "Frames per second (1-60, default 15)",
					minimum: 1,
					maximum: 60,
					default: 15,
				},
				directory: {
					type: "string",
					description: "Save directory (default D:\\recordings)",
					default: "D:\\recordings",
				},
				filename: {
					type: "string",
					description: "Custom filename without extension (optional)",
				},
				outputPath: {
					type: "string",
					description: "Full output path (overrides directory/filename)",
				},
			},
			required: ["durationSeconds"],
		},
	},
	{
		name: "dc_capture_camera",
		description: `Capture photo or video from camera using ffmpeg. Supports both single frame (photo) and timed recording (video).

REQUIRES: ffmpeg installed and in PATH (or set FFMPEG_PATH env var)

Parameters:
- device: Camera name from dc_list_cameras (optional, uses first camera if omitted)
- durationSeconds: Video duration in seconds (omit for single photo)
- directory: Save directory (default D:\\recordings)
- filename: Custom filename without extension (optional)
- outputPath: Full output path (overrides directory/filename)

Modes:
- Photo: Omit durationSeconds → Captures single frame as PNG
- Video: Set durationSeconds → Records video as MP4

Examples:
- device: "Integrated Webcam" → Photo from specific camera
- device: "USB Camera", durationSeconds: 10 → 10s video clip
- durationSeconds: 5, filename: "test-cam" → 5s video to D:\\recordings\\test-cam.mp4

Error Cases:
- No camera found → Use dc_list_cameras to enumerate
- ffmpeg not found → Install ffmpeg or set FFMPEG_PATH
- Camera in use → Close other applications using camera

Returns: { path: "D:\\recordings\\camera-shot-2026-02-19-14-30-45.png" }`,
		inputSchema: {
			type: "object",
			properties: {
				device: {
					type: "string",
					description: "Camera name from dc_list_cameras (optional, uses first if omitted)",
				},
				durationSeconds: {
					type: "number",
					description: "Video duration in seconds (omit for photo)",
					minimum: 1,
					maximum: 3600,
				},
				directory: {
					type: "string",
					description: "Save directory (default D:\\recordings)",
					default: "D:\\recordings",
				},
				filename: {
					type: "string",
					description: "Custom filename without extension (optional)",
				},
				outputPath: {
					type: "string",
					description: "Full output path (overrides directory/filename)",
				},
			},
		},
	},

	// ----------------------
	// Web & HTTP
	// ----------------------
	{
		name: "dc_fetch_url",
		description: `Fetch HTTP/HTTPS URL content using Node.js built-in http/https modules. Lightweight alternative to curl/wget.

Security: Only HTTP/HTTPS URLs allowed (no file://, ftp://, etc.)

Parameters:
- url: HTTP/HTTPS URL (required)
- method: GET (default) or HEAD
- headers: Custom HTTP headers (optional, e.g., { "Authorization": "Bearer token" })
- timeoutMs: Request timeout in milliseconds (1000-60000, default 15000)
- maxBytes: Maximum response size (1024-10MB, default 1MB)

Features:
- Automatic timeout handling
- Response size limiting (prevents memory issues)
- Truncation flag if response exceeds maxBytes

Examples:
- url: "https://api.example.com/data" → Fetch JSON API
- url: "https://example.com", method: "HEAD" → Check if URL exists
- url: "https://api.github.com/repos/owner/repo", headers: { "Accept": "application/json" }

Returns: { ok: true/false, status: 200, statusText: "OK", headers: {...}, body: "...", truncated: false }

Error Cases:
- Invalid URL → "Invalid URL format"
- Timeout → "Request timed out"
- Non-HTTP URL → "Only HTTP/HTTPS URLs allowed"`,
		inputSchema: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "HTTP/HTTPS URL to fetch",
					minLength: 1,
				},
				method: {
					type: "string",
					enum: ["GET", "HEAD"],
					description: "HTTP method (default GET)",
					default: "GET",
				},
				headers: {
					type: "object",
					description: "Custom HTTP headers (optional)",
				},
				timeoutMs: {
					type: "number",
					description: "Request timeout in milliseconds (default 15000)",
					minimum: 1000,
					maximum: 60000,
					default: 15000,
				},
				maxBytes: {
					type: "number",
					description: "Max response size in bytes (default 1MB)",
					minimum: 1024,
					maximum: 10485760,
					default: 1048576,
				},
			},
			required: ["url"],
		},
		annotations: { openWorldHint: true },
	},
	{
		name: "dc_web_search",
		description: `Perform web search using DuckDuckGo HTML scraping. Returns organic search results without API key.

Engine: DuckDuckGo (privacy-focused, no tracking)
Method: HTML scraping (no API key required)

Parameters:
- query: Search query (required)
- maxResults: Maximum results to return (1-20, default 8)
- engine: Search engine (only "duckduckgo" supported)

Features:
- Privacy-focused (no user tracking)
- No API key required
- Title and URL extraction
- HTML entity decoding
- DuckDuckGo redirect unwrapping

Examples:
- query: "TypeScript MCP server" → Find MCP documentation
- query: "Windows 11 ffmpeg install", maxResults: 5 → Installation guides
- query: "site:github.com claude mcp" → Search specific site

Returns: [{ title: "...", url: "https://..." }, ...]

Limitations:
- HTML scraping (may break if DuckDuckGo changes layout)
- Max 20 results per query
- No advanced search operators (use query string syntax)
- Rate limiting possible with excessive requests

Error Cases:
- Network failure → "Request timed out"
- Parse failure → Returns empty array []`,
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query",
					minLength: 1,
				},
				maxResults: {
					type: "number",
					description: "Max results to return (1-20, default 8)",
					minimum: 1,
					maximum: 20,
					default: 8,
				},
				engine: {
					type: "string",
					enum: ["duckduckgo"],
					description: "Search engine (only duckduckgo supported)",
					default: "duckduckgo",
				},
			},
			required: ["query"],
		},
		annotations: { openWorldHint: true },
	},
];

// ============================================================================
// Helper Functions
// ============================================================================

function asTextContent(value: unknown): {
	content: Array<{ type: "text"; text: string }>;
} {
	const text =
		typeof value === "string"
			? value
			: (JSON.stringify(value, null, 2) ?? String(value));
	return { content: [{ type: "text", text }] };
}

function validateHttpUrl(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("Invalid URL format");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error("Only HTTP/HTTPS URLs allowed");
	}
	return parsed.toString();
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
	{ name: "desktop-commander-v3", version: "2.0.0" },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	const a = (args ?? {}) as Record<string, unknown>;

	try {
		switch (name) {
			// System Information
			case "dc_get_cpu":
				return asTextContent(await si.currentLoad());

			case "dc_get_mem":
				return asTextContent(await si.mem());

			case "dc_get_system_info": {
				const [cpu, mem, os] = await Promise.all([
					si.cpu(),
					si.mem(),
					si.osInfo(),
				]);
				return asTextContent({ cpu, mem, os });
			}

			case "dc_list_processes": {
				const limit = Math.max(1, Math.min(200, Number(a.limit) || 50));
				const processes = await si.processes();
				const sanitized = processes.list
					.slice(0, limit)
					.map(({ pid, name, mem, cpu }) => ({
						pid,
						name,
						mem,
						cpu,
					}));
				return asTextContent(sanitized);
			}

			case "dc_open_url": {
				const url = validateHttpUrl(String(a.url ?? "").trim());
				await open(url);
				return asTextContent({ opened: true, url });
			}

			case "dc_get_allowed_paths":
				return asTextContent(getAllowedPaths());

			// Filesystem
			case "dc_read_file": {
				const content = a.base64
					? await FileSystem.readFileBase64(String(a.path))
					: await FileSystem.readFile(String(a.path));
				return asTextContent(a.base64 ? { base64: content } : content);
			}

			case "dc_write_file":
				await FileSystem.writeFile(String(a.path), String(a.content), {
					append: Boolean(a.append),
					createDirs: a.createDirs !== false,
				});
				return asTextContent({ written: true, path: a.path });

			case "dc_list_directory":
				return asTextContent(
					await FileSystem.listDirectory(String(a.path), {
						recursive: Boolean(a.recursive),
						maxDepth: Number(a.maxDepth) || 3,
					}),
				);

			case "dc_search_files":
				return asTextContent(
					await FileSystem.searchFiles(String(a.path), String(a.pattern), {
						maxResults: Number(a.maxResults) || 100,
					}),
				);

			case "dc_search_content":
				return asTextContent(
					await FileSystem.searchContent(String(a.path), String(a.query), {
						extensions: Array.isArray(a.extensions)
							? (a.extensions as string[])
							: undefined,
						caseSensitive: Boolean(a.caseSensitive),
						maxResults: Number(a.maxResults) || 50,
					}),
				);

			case "dc_create_directory":
				await FileSystem.createDirectory(String(a.path));
				return asTextContent({ created: true, path: a.path });

			case "dc_move_file":
				await FileSystem.moveFile(String(a.source), String(a.destination));
				return asTextContent({
					moved: true,
					from: a.source,
					to: a.destination,
				});

			case "dc_copy_file":
				await FileSystem.copyFile(String(a.source), String(a.destination));
				return asTextContent({
					copied: true,
					from: a.source,
					to: a.destination,
				});

			case "dc_delete_file":
				await FileSystem.deleteFile(String(a.path), {
					recursive: Boolean(a.recursive),
				});
				return asTextContent({ deleted: true, path: a.path });

			case "dc_get_file_info":
				return asTextContent(await FileSystem.getFileInfo(String(a.path)));

			case "dc_get_file_hash":
				return asTextContent(
					await FileSystem.getFileHash(
						String(a.path),
						a.algorithm ? String(a.algorithm) : undefined,
					),
				);

			case "dc_get_acl":
				return asTextContent(await FileSystem.getAcl(String(a.path)));

			case "dc_get_item_attributes":
				return asTextContent(
					await FileSystem.getItemAttributes(String(a.path)),
				);

			case "dc_get_long_paths_status":
				return asTextContent(await FileSystem.getLongPathsStatus());

			case "dc_copy_directory_robocopy":
				return asTextContent(
					await FileSystem.copyDirectoryRobocopy(
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
				);

			// Clipboard
			case "dc_get_clipboard":
				return asTextContent(await Clipboard.getClipboard());

			case "dc_set_clipboard":
				await Clipboard.setClipboard(String(a.text));
				return asTextContent({ set: true });

			// Screenshot
			case "dc_take_screenshot": {
				const screenshotPath = await Screenshot.takeScreenshot(
					a.filename ? String(a.filename) : undefined,
					{ directory: a.directory ? String(a.directory) : undefined },
				);
				return asTextContent({ saved: true, path: screenshotPath });
			}

			case "dc_screenshot_window": {
				const winShotPath = await Screenshot.screenshotWindow(
					String(a.title),
					a.filename ? String(a.filename) : undefined,
					{ directory: a.directory ? String(a.directory) : undefined },
				);
				return asTextContent({ saved: true, path: winShotPath });
			}

			// Window Management
			case "dc_list_windows":
				return asTextContent(await Window.listWindows());

			case "dc_get_active_window":
				return asTextContent(await Window.getActiveWindow());

			case "dc_window_action":
				return asTextContent(
					await Window.windowAction(
						String(a.title),
						a.action as Window.WindowAction,
					),
				);

			case "dc_launch_app":
				return asTextContent(
					await Window.launchApp(
						String(a.app),
						a.args ? String(a.args) : undefined,
					),
				);

			case "dc_terminate_app":
				return asTextContent(
					await Window.terminateApp(String(a.name), {
						force: Boolean(a.force),
					}),
				);

			case "dc_window_move":
				return asTextContent(
					await Window.windowMove(String(a.title), Number(a.x), Number(a.y)),
				);

			case "dc_window_resize":
				return asTextContent(
					await Window.windowResize(String(a.title), Number(a.width), Number(a.height)),
				);

			// Input Simulation
			case "dc_mouse_move":
				await Input.mouseMove(Number(a.x), Number(a.y));
				return asTextContent({ moved: true, x: a.x, y: a.y });

			case "dc_mouse_click":
				await Input.mouseClick((a.button as Input.MouseButton) || "left", {
					double: Boolean(a.double),
				});
				return asTextContent({ clicked: true, button: a.button ?? "left" });

			case "dc_mouse_scroll":
				await Input.mouseScroll(
					Number(a.amount),
					(a.direction as "up" | "down") || "down",
				);
				return asTextContent({ scrolled: true });

			case "dc_mouse_drag":
				await Input.mouseDrag(Number(a.fromX), Number(a.fromY), Number(a.toX), Number(a.toY));
				return asTextContent({ dragged: true, from: { x: a.fromX, y: a.fromY }, to: { x: a.toX, y: a.toY } });

			case "dc_keyboard_type":
				await Input.keyboardType(String(a.text));
				return asTextContent({ typed: true });

			case "dc_keyboard_shortcut":
				await Input.keyboardShortcut(String(a.shortcut));
				return asTextContent({ sent: true, shortcut: a.shortcut });

			// System Controls
			case "dc_notify":
				await System.showNotification(String(a.title), String(a.message));
				return asTextContent({ notified: true });

			case "dc_set_volume":
				await System.setVolume(a.action as "up" | "down" | "mute");
				return asTextContent({ volumeChanged: true, action: a.action });

			case "dc_set_brightness":
				await System.setBrightness(Number(a.level));
				return asTextContent({ brightnessSet: true, level: a.level });

			case "dc_get_battery":
				return asTextContent(await System.getBattery());

			case "dc_get_network":
				return asTextContent(await System.getNetwork());

			case "dc_get_disks":
				return asTextContent(await System.getDisks());

			case "dc_run_powershell":
				return asTextContent(
					await System.runPowerShell(
						String(a.command),
						a.timeout ? Number(a.timeout) : undefined,
					),
				);

			case "dc_run_cmd":
				return asTextContent(
					await System.runCmd(
						String(a.command),
						a.timeout ? Number(a.timeout) : undefined,
					),
				);

			// Media & Recording
			case "dc_list_cameras":
				return asTextContent(await Media.listCameras());

			case "dc_record_screen":
				return asTextContent(
					await Media.recordScreen({
						durationSeconds: Number(a.durationSeconds),
						fps: a.fps ? Number(a.fps) : undefined,
						directory: a.directory ? String(a.directory) : undefined,
						filename: a.filename ? String(a.filename) : undefined,
						outputPath: a.outputPath ? String(a.outputPath) : undefined,
					}),
				);

			case "dc_capture_camera":
				return asTextContent(
					await Media.captureCamera({
						device: a.device ? String(a.device) : undefined,
						durationSeconds: a.durationSeconds
							? Number(a.durationSeconds)
							: undefined,
						directory: a.directory ? String(a.directory) : undefined,
						filename: a.filename ? String(a.filename) : undefined,
						outputPath: a.outputPath ? String(a.outputPath) : undefined,
					}),
				);

			// Web & HTTP
			case "dc_fetch_url":
				return asTextContent(
					await Web.fetchUrl(String(a.url), {
						method: a.method ? (a.method as "GET" | "HEAD") : undefined,
						headers: a.headers as Record<string, string> | undefined,
						timeoutMs: a.timeoutMs ? Number(a.timeoutMs) : undefined,
						maxBytes: a.maxBytes ? Number(a.maxBytes) : undefined,
					}),
				);

			case "dc_web_search":
				return asTextContent(
					await Web.webSearch(String(a.query), {
						maxResults: a.maxResults ? Number(a.maxResults) : undefined,
						engine: a.engine ? (a.engine as "duckduckgo") : undefined,
					}),
				);

			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	} catch (error) {
		const baseMessage = error instanceof Error ? error.message : "Unknown error";

		// Add recovery guidance based on error type
		let guidance = "";
		if (baseMessage.includes("ENOENT")) {
			guidance = " File not found. Use 'dc_list_directory' to browse available files.";
		} else if (baseMessage.includes("EACCES") || baseMessage.includes("Permission denied")) {
			guidance = " Permission denied. Use 'dc_get_allowed_paths' to see allowed directories.";
		} else if (baseMessage.includes("ETIMEDOUT") || baseMessage.includes("timeout")) {
			guidance = " Operation timed out. Try with a longer timeout parameter.";
		} else if (baseMessage.includes("EPERM")) {
			guidance = " Operation not permitted. May require administrator privileges.";
		}

		return {
			content: [{ type: "text", text: baseMessage + guidance }],
			isError: true,
		};
	}
});

// ============================================================================
// Startup
// ============================================================================

process.on("unhandledRejection", (reason) => {
	console.error(
		"Unhandled rejection in desktop-commander-v3 MCP server:",
		reason,
	);
});

await server.connect(new StdioServerTransport());
