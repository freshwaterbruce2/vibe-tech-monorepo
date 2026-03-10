/**
 * WindowTools - Window management for Desktop Commander V3
 * Uses PowerShell and native Windows APIs.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WindowInfo {
	processId: number;
	processName: string;
	title: string;
	handle: string;
}

/**
 * List all open windows with titles
 */
export async function listWindows(): Promise<WindowInfo[]> {
	const psScript = `
Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | ForEach-Object {
    [PSCustomObject]@{
        ProcessId = $_.Id
        ProcessName = $_.ProcessName
        Title = $_.MainWindowTitle
        Handle = $_.MainWindowHandle.ToString()
    }
} | ConvertTo-Json -Compress
`;

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
			{ maxBuffer: 10 * 1024 * 1024 },
		);

		if (!stdout.trim()) {
			return [];
		}

		const parsed = JSON.parse(stdout);
		// Handle single result (not an array)
		return Array.isArray(parsed) ? parsed : [parsed];
	} catch (error) {
		throw new Error(
			`Failed to list windows: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get the currently focused/active window
 */
export async function getActiveWindow(): Promise<WindowInfo | null> {
	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
[PSCustomObject]@{
    ProcessId = $processId
    ProcessName = if($process) { $process.ProcessName } else { "Unknown" }
    Title = $title.ToString()
    Handle = $hwnd.ToString()
} | ConvertTo-Json -Compress
`;

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
			{ maxBuffer: 1024 * 1024 },
		);

		if (!stdout.trim()) {
			return null;
		}

		return JSON.parse(stdout);
	} catch {
		return null;
	}
}

export type WindowAction =
	| "minimize"
	| "maximize"
	| "restore"
	| "close"
	| "focus";

/**
 * Perform an action on a window matching the title pattern
 */
export async function windowAction(
	titlePattern: string,
	action: WindowAction,
): Promise<{ success: boolean; window?: string }> {
	// Action codes: SW_MINIMIZE=6, SW_MAXIMIZE=3, SW_RESTORE=9, SW_SHOW=5
	let actionCode: string;
	let useCloseMethod = false;
	let useFocusMethod = false;

	switch (action) {
		case "minimize":
			actionCode = "6";
			break;
		case "maximize":
			actionCode = "3";
			break;
		case "restore":
			actionCode = "9";
			break;
		case "close":
			useCloseMethod = true;
			actionCode = "";
			break;
		case "focus":
			useFocusMethod = true;
			actionCode = "";
			break;
		default:
			throw new Error(`Unknown window action: ${action}`);
	}

	const escapedPattern = titlePattern.replace(/"/g, '`"');

	let psScript: string;

	if (useCloseMethod) {
		psScript = `
$p = Get-Process | Where-Object {$_.MainWindowTitle -match "${escapedPattern}"} | Select-Object -First 1
if ($p) { $p.CloseMainWindow() | Out-Null; Write-Output $p.MainWindowTitle } else { Write-Output "" }
`;
	} else if (useFocusMethod) {
		psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinFocus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$p = Get-Process | Where-Object {$_.MainWindowTitle -match "${escapedPattern}"} | Select-Object -First 1
if ($p) { [WinFocus]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Write-Output $p.MainWindowTitle } else { Write-Output "" }
`;
	} else {
		psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinShow {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$p = Get-Process | Where-Object {$_.MainWindowTitle -match "${escapedPattern}"} | Select-Object -First 1
if ($p) { [WinShow]::ShowWindow($p.MainWindowHandle, ${actionCode}) | Out-Null; Write-Output $p.MainWindowTitle } else { Write-Output "" }
`;
	}

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
			{ maxBuffer: 1024 * 1024 },
		);

		const windowTitle = stdout.trim();
		return {
			success: windowTitle.length > 0,
			window: windowTitle || undefined,
		};
	} catch (error) {
		throw new Error(
			`Failed to ${action} window: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Allowed applications for launching (security allow-list)
const ALLOWED_APPS: Record<string, string> = {
	notepad: "notepad.exe",
	calc: "calc.exe",
	calculator: "calc.exe",
	explorer: "explorer.exe",
	cmd: "cmd.exe",
	powershell: "powershell.exe",
	terminal: "wt.exe",
	chrome: "chrome.exe",
	firefox: "firefox.exe",
	edge: "msedge.exe",
	code: "code.exe",
	vscode: "code.exe",
};

/**
 * Launch an allowed application
 */
export async function launchApp(
	appName: string,
	args?: string,
): Promise<{ launched: boolean; app: string }> {
	const appLower = appName.toLowerCase();
	const executable = ALLOWED_APPS[appLower];

	if (!executable) {
		const allowed = Object.keys(ALLOWED_APPS).join(", ");
		throw new Error(
			`Application not in allow-list: ${appName}. Allowed: ${allowed}`,
		);
	}

	const escapedArgs = args ? args.replace(/"/g, '`"') : "";
	const command = escapedArgs
		? `Start-Process -FilePath "${executable}" -ArgumentList "${escapedArgs}"`
		: `Start-Process -FilePath "${executable}"`;

	try {
		await execAsync(`powershell.exe -NoProfile -Command "${command}"`, {
			maxBuffer: 1024 * 1024,
		});

		return { launched: true, app: executable };
	} catch (error) {
		throw new Error(
			`Failed to launch ${appName}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Terminate a process by name
 */
export async function terminateApp(
	processName: string,
	options: { force?: boolean } = {},
): Promise<{ terminated: boolean; count: number }> {
	const forceFlag = options.force ? "-Force" : "";
	const escapedName = processName.replace(/"/g, '`"');

	const psScript = `
$procs = Get-Process -Name "${escapedName}" -ErrorAction SilentlyContinue
$count = if ($procs) { @($procs).Count } else { 0 }
if ($count -gt 0) { Stop-Process -Name "${escapedName}" ${forceFlag} -ErrorAction SilentlyContinue }
Write-Output $count
`;

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
			{ maxBuffer: 1024 * 1024 },
		);

		const count = parseInt(stdout.trim(), 10) || 0;
		return { terminated: count > 0, count };
	} catch (error) {
		throw new Error(
			`Failed to terminate ${processName}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
