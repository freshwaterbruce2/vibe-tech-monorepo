/**
 * ScreenshotTools - Screen capture for Desktop Commander V3
 * Saves screenshots to D:\ path only (validated).
 */

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { validatePath } from "./PathValidator.js";
import { getErrorMessage } from "./utils/errors.js";
import { timestampFilename } from "./utils/files.js";

const execAsync = promisify(exec);

// Screenshots must be saved to D:\ for security
const DEFAULT_SCREENSHOT_DIR = "D:\\screenshots";

/**
 * Take a screenshot and save to D:\ path
 */
export async function takeScreenshot(
	filename?: string,
	options: { directory?: string } = {},
): Promise<string> {
	const dir = options.directory ?? DEFAULT_SCREENSHOT_DIR;

	// Validate the directory is within allowed paths
	validatePath(dir, "write");

	// Ensure directory exists
	await fs.promises.mkdir(dir, { recursive: true });

	const name = filename ?? `screenshot-${timestampFilename("png")}`;
	const outputPath = path.join(dir, name);

	// Validate the full output path
	validatePath(outputPath, "write");

	// PowerShell script to capture screen
	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$top = ($screens.Bounds.Top | Measure-Object -Minimum).Minimum
$left = ($screens.Bounds.Left | Measure-Object -Minimum).Minimum
$width = ($screens.Bounds.Right | Measure-Object -Maximum).Maximum
$height = ($screens.Bounds.Bottom | Measure-Object -Maximum).Maximum

$bounds = [System.Drawing.Rectangle]::FromLTRB($left, $top, $width, $height)
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

$bitmap.Save("${outputPath.replace(/\\/g, "\\\\")}")
$graphics.Dispose()
$bitmap.Dispose()
Write-Output "${outputPath.replace(/\\/g, "\\\\")}"
`;

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ").replace(/"/g, '\\"')}"`,
			{ maxBuffer: 10 * 1024 * 1024 },
		);

		return stdout.trim() || outputPath;
	} catch (error) {
		throw new Error(`Failed to take screenshot: ${getErrorMessage(error)}`);
	}
}

/**
 * Take a screenshot of a specific window
 */
export async function screenshotWindow(
	windowTitle: string,
	filename?: string,
	options: { directory?: string } = {},
): Promise<string> {
	const dir = options.directory ?? DEFAULT_SCREENSHOT_DIR;

	validatePath(dir, "write");
	await fs.promises.mkdir(dir, { recursive: true });

	const name = filename ?? `window-${timestampFilename("png")}`;
	const outputPath = path.join(dir, name);

	validatePath(outputPath, "write");

	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$process = Get-Process | Where-Object {$_.MainWindowTitle -match "${windowTitle}"} | Select-Object -First 1
if (-not $process) {
    throw "Window not found: ${windowTitle}"
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

$rect = New-Object Win32+RECT
[Win32]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($width, $height)))

$bitmap.Save("${outputPath.replace(/\\/g, "\\\\")}")
$graphics.Dispose()
$bitmap.Dispose()
Write-Output "${outputPath.replace(/\\/g, "\\\\")}"
`;

	try {
		const { stdout } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ").replace(/"/g, '\\"')}"`,
			{ maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
		);

		return stdout.trim() || outputPath;
	} catch (error) {
		throw new Error(`Failed to screenshot window: ${getErrorMessage(error)}`);
	}
}
