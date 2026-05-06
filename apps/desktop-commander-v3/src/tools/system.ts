import si from "systeminformation";
import * as System from "../SystemTools.js";
import * as Clipboard from "../ClipboardTools.js";
import { getAllowedPaths } from "../PathValidator.js";


export const systemTools: Array<{
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
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
];

export const systemHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	dc_get_cpu: async () => si.currentLoad(),
	dc_get_mem: async () => si.mem(),
	dc_get_system_info: async () => {
		const [cpu, mem, os] = await Promise.all([si.cpu(), si.mem(), si.osInfo()]);
		return { cpu, mem, os };
	},
	dc_list_processes: async (a) => {
		const limit = Math.max(1, Math.min(200, Number(a.limit) || 50));
		const processes = await si.processes();
		const sanitized = processes.list.slice(0, limit).map(({ pid, name, mem, cpu }) => ({
			pid,
			name,
			mem,
			cpu,
		}));
		return sanitized;
	},
	dc_get_allowed_paths: async () => getAllowedPaths(),
	dc_get_clipboard: async () => Clipboard.getClipboard(),
	dc_set_clipboard: async (a) => {
		await Clipboard.setClipboard(String(a.text));
		return { set: true };
	},
	dc_notify: async (a) => {
		await System.showNotification(String(a.title), String(a.message));
		return { notified: true };
	},
	dc_set_volume: async (a) => {
		await System.setVolume(a.action as "up" | "down" | "mute");
		return { volumeChanged: true, action: a.action };
	},
	dc_set_brightness: async (a) => {
		await System.setBrightness(Number(a.level));
		return { brightnessSet: true, level: a.level };
	},
	dc_get_battery: async () => System.getBattery(),
	dc_get_network: async () => System.getNetwork(),
	dc_get_disks: async () => System.getDisks(),
	dc_run_powershell: async (a) =>
		System.runPowerShell(String(a.command), a.timeout ? Number(a.timeout) : undefined),
	dc_run_cmd: async (a) =>
		System.runCmd(String(a.command), a.timeout ? Number(a.timeout) : undefined),
};
