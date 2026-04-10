import type { CommandRequestPayload } from "@vibetech/shared-ipc";
import open from "open";
import si from "systeminformation";
import * as Clipboard from "./ClipboardTools.js";
import * as FileSystem from "./FileSystemTools.js";
import * as Input from "./InputTools.js";
import { logger } from "./Logger.js";
import { getAllowedPaths } from "./PathValidator.js";
import * as Screenshot from "./ScreenshotTools.js";
import * as System from "./SystemTools.js";
import * as Window from "./WindowTools.js";

export type MCPRole =
	| "system-monitor"
	| "process-manager"
	| "file-manager"
	| "automation"
	| "input-control";

interface CommandHandler {
	role: MCPRole;
	execute: (args: Record<string, any>) => Promise<any>;
}

export class CommandExecutor {
	private handlers = new Map<string, CommandHandler>();

	constructor() {
		this.registerHandlers();
	}

	private register(
		command: string,
		role: MCPRole,
		execute: (args: Record<string, any>) => Promise<any>,
	) {
		this.handlers.set(command, { role, execute });
	}

	// Parse "key=value" or "value" arguments into a dictionary
	// Also supports JSON arguments if the first arg starts with '{'
	private parseArgs(args: string[]): Record<string, any> {
		if (args.length === 0) return {};

		// Try JSON first if single argument
		if (args.length === 1 && args[0].trim().startsWith("{")) {
			try {
				return JSON.parse(args[0]);
			} catch {
				// Ignore JSON parse error, treat as string
			}
		}

		const parsed: Record<string, any> = {};

		args.forEach((arg, index) => {
			if (arg.includes("=")) {
				const [key, ...valParts] = arg.split("=");
				let val = valParts.join("=");
				// Remove surrounding quotes
				if (
					(val.startsWith('"') && val.endsWith('"')) ||
					(val.startsWith("'") && val.endsWith("'"))
				) {
					val = val.slice(1, -1);
				}
				parsed[key] = val;
			} else {
				// Store as generic positional 'argN'
				parsed[`arg${index}`] = arg;
			}
		});
		return parsed;
	}

	private registerHandlers() {
		// --- System Information ---
		this.register("dc_get_cpu", "system-monitor", async () => si.currentLoad());
		this.register("dc_get_mem", "system-monitor", async () => si.mem());
		this.register("dc_get_system_info", "system-monitor", async () => {
			const [cpu, mem, os] = await Promise.all([
				si.cpu(),
				si.mem(),
				si.osInfo(),
			]);
			return { cpu, mem, os };
		});
		this.register("dc_list_processes", "process-manager", async (args) => {
			const limit = Number(args.limit ?? args.arg0 ?? 50);
			const processes = await si.processes();
			return processes.list
				.slice(0, Math.min(200, limit))
				.map(({ pid, name, mem, cpu }) => ({ pid, name, mem, cpu }));
		});
		this.register("dc_open_url", "automation", async (args) => {
			const url = args.url ?? args.arg0;
			if (!url) throw new Error("URL required");
			let parsed;
			try {
				parsed = new URL(url);
			} catch {
				throw new Error("Invalid URL format");
			}
			if (!["http:", "https:"].includes(parsed.protocol))
				throw new Error("Only HTTP/HTTPS URLs allowed");
			await open(url);
			return { opened: true, url };
		});
		this.register("dc_get_allowed_paths", "system-monitor", async () =>
			getAllowedPaths(),
		);

		// --- Filesystem ---
		this.register("dc_read_file", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			if (!path) throw new Error("Path required");
			return args.base64
				? await FileSystem.readFileBase64(path)
				: await FileSystem.readFile(path);
		});
		this.register("dc_write_file", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			const content = args.content ?? args.arg1; // Positional support for content? tricky if spaces. Best rely on named or JSON.
			// If content is missing but we have arg1, use it.
			if (!path || content === undefined)
				throw new Error("Path and content required");
			await FileSystem.writeFile(path, content, {
				append: args.append === "true",
				createDirs: args.createDirs !== "false",
			});
			return { written: true, path };
		});
		this.register("dc_list_directory", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			if (!path) throw new Error("Path required");
			return await FileSystem.listDirectory(path, {
				recursive: args.recursive === "true",
				maxDepth: Number(args.maxDepth) || 3,
			});
		});
		this.register("dc_search_files", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			const pattern = args.pattern ?? args.arg1;
			if (!path || !pattern) throw new Error("Path and pattern required");
			return await FileSystem.searchFiles(path, pattern, {
				maxResults: Number(args.maxResults) || 100,
			});
		});
		this.register("dc_create_directory", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			if (!path) throw new Error("Path required");
			await FileSystem.createDirectory(path);
			return { created: true, path };
		});
		this.register("dc_move_file", "file-manager", async (args) => {
			const source = args.source ?? args.arg0;
			const destination = args.destination ?? args.arg1;
			if (!source || !destination)
				throw new Error("Source and destination required");
			await FileSystem.moveFile(source, destination);
			return { moved: true, from: source, to: destination };
		});
		this.register("dc_copy_file", "file-manager", async (args) => {
			const source = args.source ?? args.arg0;
			const destination = args.destination ?? args.arg1;
			if (!source || !destination)
				throw new Error("Source and destination required");
			await FileSystem.copyFile(source, destination);
			return { copied: true, from: source, to: destination };
		});
		this.register("dc_delete_file", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			if (!path) throw new Error("Path required");
			await FileSystem.deleteFile(path, {
				recursive: args.recursive === "true",
			});
			return { deleted: true, path };
		});
		this.register("dc_get_file_info", "file-manager", async (args) => {
			const path = args.path ?? args.arg0;
			if (!path) throw new Error("Path required");
			return await FileSystem.getFileInfo(path);
		});

		this.register("dc_get_file_hash", "file-manager", async (args) => {
			const filePath = args.path ?? args.arg0;
			if (!filePath) throw new Error("Path required");
			return await FileSystem.getFileHash(filePath, args.algorithm);
		});

		this.register("dc_get_acl", "file-manager", async (args) => {
			const filePath = args.path ?? args.arg0;
			if (!filePath) throw new Error("Path required");
			return await FileSystem.getAcl(filePath);
		});

		this.register("dc_get_item_attributes", "file-manager", async (args) => {
			const filePath = args.path ?? args.arg0;
			if (!filePath) throw new Error("Path required");
			return await FileSystem.getItemAttributes(filePath);
		});

		this.register("dc_get_long_paths_status", "system-monitor", async () => {
			return await FileSystem.getLongPathsStatus();
		});

		this.register(
			"dc_copy_directory_robocopy",
			"file-manager",
			async (args) => {
				const source = args.source ?? args.arg0;
				const destination = args.destination ?? args.arg1;
				if (!source || !destination)
					throw new Error("Source and destination required");
				return await FileSystem.copyDirectoryRobocopy(source, destination, {
					threads:
						args.threads !== undefined ? Number(args.threads) : undefined,
					restartable:
						args.restartable !== undefined
							? args.restartable === true || args.restartable === "true"
							: undefined,
					unbuffered: args.unbuffered === true || args.unbuffered === "true",
					copySecurity:
						args.copySecurity === true || args.copySecurity === "true",
					mirror: args.mirror === true || args.mirror === "true",
					confirmDangerous:
						args.confirmDangerous === true || args.confirmDangerous === "true",
					maxRetries:
						args.maxRetries !== undefined ? Number(args.maxRetries) : undefined,
					waitSeconds:
						args.waitSeconds !== undefined
							? Number(args.waitSeconds)
							: undefined,
				});
			},
		);

		// --- Clipboard ---
		this.register("dc_get_clipboard", "automation", async () =>
			Clipboard.getClipboard(),
		);
		this.register("dc_set_clipboard", "automation", async (args) => {
			const text = args.text ?? args.arg0;
			if (!text) throw new Error("Text required");
			await Clipboard.setClipboard(text);
			return { set: true };
		});

		// --- Screenshot ---
		this.register("dc_take_screenshot", "automation", async (args) => {
			const filename = args.filename ?? args.arg0;
			const path = await Screenshot.takeScreenshot(filename, {
				directory: args.directory,
			});
			return { saved: true, path };
		});

		// --- Window ---
		this.register("dc_list_windows", "automation", async () =>
			Window.listWindows(),
		);
		this.register("dc_get_active_window", "automation", async () =>
			Window.getActiveWindow(),
		);
		this.register("dc_window_action", "automation", async (args) => {
			const title = args.title ?? args.arg0;
			const action = args.action ?? args.arg1;
			if (!title || !action) throw new Error("Title and action required");
			return await Window.windowAction(title, action as Window.WindowAction);
		});
		this.register("dc_launch_app", "automation", async (args) => {
			const app = args.app ?? args.arg0;
			const appArgs = args.args ?? args.arg1;
			if (!app) throw new Error("App name required");
			return await Window.launchApp(app, appArgs);
		});
		this.register("dc_terminate_app", "process-manager", async (args) => {
			const name = args.name ?? args.arg0;
			if (!name) throw new Error("Process name required");
			return await Window.terminateApp(name, { force: args.force === "true" });
		});

		// --- Input ---
		this.register("dc_mouse_move", "input-control", async (args) => {
			const x = args.x !== undefined ? args.x : args.arg0;
			const y = args.y !== undefined ? args.y : args.arg1;
			if (x === undefined || y === undefined)
				throw new Error("X and Y required");
			await Input.mouseMove(Number(x), Number(y));
			return { moved: true, x, y };
		});
		this.register("dc_mouse_click", "input-control", async (args) => {
			await Input.mouseClick((args.button as Input.MouseButton) || "left", {
				double: args.double === "true",
			});
			return { clicked: true };
		});
		this.register("dc_keyboard_type", "input-control", async (args) => {
			const text = args.text ?? args.arg0;
			if (!text) throw new Error("Text required");
			await Input.keyboardType(text);
			return { typed: true };
		});

		// --- System Control ---
		this.register("dc_set_volume", "automation", async (args) => {
			const action = args.action ?? args.arg0;
			if (!action) throw new Error("Action required");
			await System.setVolume(action as "up" | "down" | "mute");
			return { volumeChanged: true };
		});
		this.register("dc_run_powershell", "automation", async (args) => {
			const command = args.command ?? args.arg0;
			if (!command) throw new Error("Command required");
			const timeout = args.timeout ? Number(args.timeout) : undefined;
			return await System.runPowerShell(command, timeout);
		});

		this.register("dc_run_cmd", "automation", async (args) => {
			const command = args.command ?? args.arg0;
			if (!command) throw new Error("Command required");
			const timeout = args.timeout ? Number(args.timeout) : undefined;
			return await System.runCmd(command, timeout);
		});

		// --- Legacy Aliases ---
		this.handlers.set("get-cpu", this.handlers.get("dc_get_cpu")!);
		this.handlers.set("get-mem", this.handlers.get("dc_get_mem")!);
		this.handlers.set(
			"list-processes",
			this.handlers.get("dc_list_processes")!,
		);
		this.handlers.set("open-url", this.handlers.get("dc_open_url")!);
	}

	public async execute(request: CommandRequestPayload): Promise<any> {
		const { text } = request;
		// Improved tokenizer to handle key="value" as a single token
		// Matches: key="value" OR non-quoted-text OR "quoted text"
		const tokenRegex = /[^\s"]*="[^"]*"|[^\s"]+|"([^"]*)"/g;
		const tokens: string[] = [];
		let match;
		while ((match = tokenRegex.exec(text)) !== null) {
			// If match[1] is set, it was a standalone quoted string (3rd alternative)
			// Otherwise use the whole match (1st or 2nd alternative)
			tokens.push(match[1] ? match[1] : match[0]);
		}

		if (tokens.length === 0) throw new Error("Empty command");

		const commandName = tokens[0];
		const rawArgs = tokens.slice(1);
		const parsedArgs = this.parseArgs(rawArgs);

		const handler = this.handlers.get(commandName);
		if (!handler) {
			logger.warn(`Unknown command: ${commandName}`);
			throw new Error(`Unknown command: ${commandName}`);
		}

		logger.info(`Executing: ${commandName} (Role: ${handler.role})`);

		// Permission check: if the caller specifies allowedRoles, the handler's role must be included.
		// Callers that omit context are trusted (backward-compatible default-allow).
		if (request.context !== undefined) {
			const { allowedRoles } = request.context as { allowedRoles?: string[] };
			if (Array.isArray(allowedRoles) && !allowedRoles.includes(handler.role)) {
				logger.warn(`Permission denied: '${commandName}' requires role '${handler.role}', allowed: [${allowedRoles.join(", ")}]`);
				throw new Error(`Permission denied: role '${handler.role}' is not in allowedRoles`);
			}
		}

		try {
			return await handler.execute(parsedArgs);
		} catch (error) {
			logger.error(`Error in ${commandName}:`, error);
			throw error;
		}
	}
}
