/**
 * InputTools - Mouse and keyboard simulation for Desktop Commander V3
 * Uses PowerShell with .NET interop for input simulation.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type MouseButton = "left" | "right" | "middle";

/**
 * Move mouse cursor to absolute position
 */
export async function mouseMove(x: number, y: number): Promise<void> {
	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseControl {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
}
"@
[MouseControl]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Get current mouse cursor position
 */
export async function getMousePosition(): Promise<{ x: number; y: number }> {
	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$pos = [System.Windows.Forms.Cursor]::Position
Write-Output "$($pos.X),$($pos.Y)"
`;

	const { stdout } = await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);

	const [x, y] = stdout.trim().split(",").map(Number);
	return { x, y };
}

/**
 * Click a mouse button
 */
export async function mouseClick(
	button: MouseButton = "left",
	options: { double?: boolean } = {},
): Promise<void> {
	// Mouse event flags
	const buttonFlags: Record<MouseButton, { down: number; up: number }> = {
		left: { down: 0x02, up: 0x04 },
		right: { down: 0x08, up: 0x10 },
		middle: { down: 0x20, up: 0x40 },
	};

	const flags = buttonFlags[button];
	const clicks = options.double ? 2 : 1;

	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
for ($i = 0; $i -lt ${clicks}; $i++) {
    [MouseClick]::mouse_event(${flags.down}, 0, 0, 0, 0)
    [MouseClick]::mouse_event(${flags.up}, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
}
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Scroll mouse wheel
 */
export async function mouseScroll(
	amount: number,
	direction: "up" | "down" = "down",
): Promise<void> {
	// Positive = up, negative = down. Each unit is 120 (WHEEL_DELTA)
	const scrollAmount =
		direction === "up" ? Math.abs(amount) * 120 : -Math.abs(amount) * 120;

	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseScroll {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[MouseScroll]::mouse_event(0x0800, 0, 0, ${scrollAmount}, 0)
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Perform a mouse drag operation
 */
export async function mouseDrag(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): Promise<void> {
	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseDrag {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[MouseDrag]::SetCursorPos(${Math.round(fromX)}, ${Math.round(fromY)})
Start-Sleep -Milliseconds 50
[MouseDrag]::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 50
[MouseDrag]::SetCursorPos(${Math.round(toX)}, ${Math.round(toY)})
Start-Sleep -Milliseconds 50
[MouseDrag]::mouse_event(0x04, 0, 0, 0, 0)
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Type text string using keyboard simulation
 */
export async function keyboardType(text: string): Promise<void> {
	// Single-pass escape: avoids double-escaping when braces appear alongside metacharacters
	const metaMap: Record<string, string> = {
		'{': '{{}', '}': '{}}', '+': '{+}', '^': '{^}', '%': '{%}', '~': '{~}',
	};
	const escapedText = text.replace(/[{}+^%~]/g, (ch) => metaMap[ch] ?? ch);

	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${escapedText.replaceAll('"', '`"')}")
`;

	await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Send a keyboard shortcut (e.g., "ctrl+c", "alt+f4")
 */
export async function keyboardShortcut(shortcut: string): Promise<void> {
	// Parse shortcut like "ctrl+shift+s" into SendKeys format
	const parts = shortcut.toLowerCase().split("+");
	let sendKeysStr = "";

	for (const part of parts) {
		switch (part.trim()) {
			case "ctrl":
			case "control":
				sendKeysStr += "^";
				break;
			case "alt":
				sendKeysStr += "%";
				break;
			case "shift":
				sendKeysStr += "+";
				break;
			case "win":
			case "windows":
				// Windows key needs special handling
				sendKeysStr += "^{ESC}"; // Approximation
				break;
			case "enter":
			case "return":
				sendKeysStr += "{ENTER}";
				break;
			case "tab":
				sendKeysStr += "{TAB}";
				break;
			case "esc":
			case "escape":
				sendKeysStr += "{ESC}";
				break;
			case "space":
				sendKeysStr += " ";
				break;
			case "backspace":
				sendKeysStr += "{BACKSPACE}";
				break;
			case "delete":
			case "del":
				sendKeysStr += "{DELETE}";
				break;
			case "home":
				sendKeysStr += "{HOME}";
				break;
			case "end":
				sendKeysStr += "{END}";
				break;
			case "pageup":
				sendKeysStr += "{PGUP}";
				break;
			case "pagedown":
				sendKeysStr += "{PGDN}";
				break;
			case "up":
				sendKeysStr += "{UP}";
				break;
			case "down":
				sendKeysStr += "{DOWN}";
				break;
			case "left":
				sendKeysStr += "{LEFT}";
				break;
			case "right":
				sendKeysStr += "{RIGHT}";
				break;
			case "f1":
			case "f2":
			case "f3":
			case "f4":
			case "f5":
			case "f6":
			case "f7":
			case "f8":
			case "f9":
			case "f10":
			case "f11":
			case "f12":
				sendKeysStr += `{${part.toUpperCase()}}`;
				break;
			default:
				// Single character key
				sendKeysStr += part;
		}
	}

	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${sendKeysStr}")
`;

	await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Press and hold a key
 */
export async function keyDown(key: string): Promise<void> {
	const vkCode = getVirtualKeyCode(key);

	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyPress {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
}
"@
[KeyPress]::keybd_event(${vkCode}, 0, 0, 0)
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Release a held key
 */
export async function keyUp(key: string): Promise<void> {
	const vkCode = getVirtualKeyCode(key);

	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyRelease {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
}
"@
[KeyRelease]::keybd_event(${vkCode}, 0, 2, 0)
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Get Windows virtual key code for a key name
 */
function getVirtualKeyCode(key: string): number {
	const codes: Record<string, number> = {
		ctrl: 0x11,
		control: 0x11,
		shift: 0x10,
		alt: 0x12,
		win: 0x5b,
		windows: 0x5b,
		enter: 0x0d,
		tab: 0x09,
		esc: 0x1b,
		escape: 0x1b,
		space: 0x20,
		backspace: 0x08,
		delete: 0x2e,
		up: 0x26,
		down: 0x28,
		left: 0x25,
		right: 0x27,
	};

	const lowerKey = key.toLowerCase();
	if (codes[lowerKey]) {
		return codes[lowerKey];
	}

	// Single character - get ASCII code
	if (key.length === 1) {
		return key.toUpperCase().charCodeAt(0);
	}

	throw new Error(`Unknown key: ${key}`);
}
