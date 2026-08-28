/**
 * ClipboardTools - Clipboard operations for Desktop Commander V3
 * Uses PowerShell for clipboard access on Windows.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Get clipboard text content
 */
export async function getClipboard(): Promise<string> {
	try {
		const { stdout } = await execAsync(
			'powershell.exe -NoProfile -Command "Get-Clipboard"',
			{ encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
		);
		return stdout.trim();
	} catch (error) {
		throw new Error(
			`Failed to get clipboard: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Set clipboard text content
 */
export async function setClipboard(text: string): Promise<void> {
	// Escape special characters for PowerShell
	const escapedText = text
		.replace(/`/g, "``")
		.replace(/\$/g, "`$")
		.replace(/"/g, '`"');

	try {
		await execAsync(
			`powershell.exe -NoProfile -Command "Set-Clipboard -Value \\"${escapedText}\\""`,
			{ maxBuffer: 10 * 1024 * 1024 },
		);
	} catch (error) {
		throw new Error(
			`Failed to set clipboard: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Clear clipboard
 */
export async function clearClipboard(): Promise<void> {
	try {
		await execAsync(
			'powershell.exe -NoProfile -Command "Set-Clipboard -Value $null"',
			{},
		);
	} catch (error) {
		throw new Error(
			`Failed to clear clipboard: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Check if clipboard has text content
 */
export async function hasClipboardText(): Promise<boolean> {
	try {
		const content = await getClipboard();
		return content.length > 0;
	} catch {
		return false;
	}
}
