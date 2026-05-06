import * as FileSystem from "../FileSystemTools.js";

interface ToolAnnotations {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

export const filesystemMutateTools: Array<{
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: ToolAnnotations;
}> = [
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
];

export const filesystemMutateHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	dc_write_file: async (a) => {
		await FileSystem.writeFile(String(a.path), String(a.content), {
			append: Boolean(a.append),
			createDirs: a.createDirs !== false,
		});
		return { written: true, path: a.path };
	},
	dc_create_directory: async (a) => {
		await FileSystem.createDirectory(String(a.path));
		return { created: true, path: a.path };
	},
	dc_move_file: async (a) => {
		await FileSystem.moveFile(String(a.source), String(a.destination));
		return {
			moved: true,
			from: a.source,
			to: a.destination,
		};
	},
	dc_copy_file: async (a) => {
		await FileSystem.copyFile(String(a.source), String(a.destination));
		return {
			copied: true,
			from: a.source,
			to: a.destination,
		};
	},
	dc_delete_file: async (a) => {
		await FileSystem.deleteFile(String(a.path), {
			recursive: Boolean(a.recursive),
		});
		return { deleted: true, path: a.path };
	},
};
