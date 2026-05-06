import * as Screenshot from "../ScreenshotTools.js";
import * as Window from "../WindowTools.js";
import * as Input from "../InputTools.js";

interface ToolAnnotations {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

export const uiTools: Array<{
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: ToolAnnotations;
}> = [
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
];

export const uiHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
	dc_take_screenshot: async (a) => {
		const screenshotPath = await Screenshot.takeScreenshot(
			a.filename ? String(a.filename) : undefined,
			{ directory: a.directory ? String(a.directory) : undefined },
		);
		return { saved: true, path: screenshotPath };
	},
	dc_screenshot_window: async (a) => {
		const winShotPath = await Screenshot.screenshotWindow(
			String(a.title),
			a.filename ? String(a.filename) : undefined,
			{ directory: a.directory ? String(a.directory) : undefined },
		);
		return { saved: true, path: winShotPath };
	},
	dc_list_windows: async () => Window.listWindows(),
	dc_get_active_window: async () => Window.getActiveWindow(),
	dc_window_action: async (a) =>
		Window.windowAction(
			String(a.title),
			a.action as Window.WindowAction,
		),
	dc_launch_app: async (a) =>
		Window.launchApp(
			String(a.app),
			a.args ? String(a.args) : undefined,
		),
	dc_terminate_app: async (a) =>
		Window.terminateApp(String(a.name), {
			force: Boolean(a.force),
		}),
	dc_window_move: async (a) =>
		Window.windowMove(String(a.title), Number(a.x), Number(a.y)),
	dc_window_resize: async (a) =>
		Window.windowResize(String(a.title), Number(a.width), Number(a.height)),
	dc_mouse_move: async (a) => {
		await Input.mouseMove(Number(a.x), Number(a.y));
		return { moved: true, x: a.x, y: a.y };
	},
	dc_mouse_click: async (a) => {
		await Input.mouseClick((a.button as Input.MouseButton) || "left", {
			double: Boolean(a.double),
		});
		return { clicked: true, button: a.button ?? "left" };
	},
	dc_mouse_scroll: async (a) => {
		await Input.mouseScroll(
			Number(a.amount),
			(a.direction as "up" | "down") || "down",
		);
		return { scrolled: true };
	},
	dc_mouse_drag: async (a) => {
		await Input.mouseDrag(Number(a.fromX), Number(a.fromY), Number(a.toX), Number(a.toY));
		return { dragged: true, from: { x: a.fromX, y: a.fromY }, to: { x: a.toX, y: a.toY } };
	},
	dc_keyboard_type: async (a) => {
		await Input.keyboardType(String(a.text));
		return { typed: true };
	},
	dc_keyboard_shortcut: async (a) => {
		await Input.keyboardShortcut(String(a.shortcut));
		return { sent: true, shortcut: a.shortcut };
	},
};
