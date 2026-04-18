/**
 * SystemTools - System information and control for Desktop Commander V3
 * Uses systeminformation library and PowerShell for system operations.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";

const execAsync = promisify(exec);

export interface BatteryInfo {
	hasBattery: boolean;
	percent: number;
	isCharging: boolean;
	timeRemaining: number | null;
}

export interface NetworkInfo {
	interfaces: Array<{
		name: string;
		ip4: string;
		ip6: string;
		mac: string;
		type: string;
		speed: number | null;
	}>;
	connections: {
		active: number;
	};
}

export interface DiskInfo {
	disks: Array<{
		name: string;
		mount: string;
		type: string;
		size: number;
		used: number;
		available: number;
		usedPercent: number;
	}>;
}

/**
 * Set system volume (up, down, mute)
 */
export async function setVolume(action: "up" | "down" | "mute"): Promise<void> {
	// Volume key codes: VOLUME_UP=0xAF, VOLUME_DOWN=0xAE, VOLUME_MUTE=0xAD
	let vkCode: string;
	switch (action) {
		case "up":
			vkCode = "0xAF";
			break;
		case "down":
			vkCode = "0xAE";
			break;
		case "mute":
			vkCode = "0xAD";
			break;
		default:
			throw new Error(`Unknown volume action: ${action}`);
	}

	const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class VolumeControl {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
}
"@
[VolumeControl]::keybd_event(${vkCode}, 0, 0, 0)
[VolumeControl]::keybd_event(${vkCode}, 0, 2, 0)
`;

	await execAsync(
		`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}

/**
 * Set screen brightness (0-100)
 */
export async function setBrightness(level: number): Promise<void> {
	const clampedLevel = Math.max(0, Math.min(100, Math.round(level)));

	const psScript = `
$monitor = Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue
if ($monitor) {
    $monitor.WmiSetBrightness(1, ${clampedLevel})
    Write-Output "OK"
} else {
    Write-Output "NO_SUPPORT"
}
`;

	const { stdout } = await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);

	if (stdout.trim() === "NO_SUPPORT") {
		throw new Error("Brightness control not supported on this device");
	}
}

/**
 * Get current brightness level
 */
export async function getBrightness(): Promise<number> {
	const psScript = `
$monitor = Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightness -ErrorAction SilentlyContinue
if ($monitor) {
    Write-Output $monitor.CurrentBrightness
} else {
    Write-Output "-1"
}
`;

	const { stdout } = await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);

	const level = parseInt(stdout.trim(), 10);
	if (level < 0) {
		throw new Error("Brightness control not supported on this device");
	}
	return level;
}

/**
 * Get battery information
 */
export async function getBattery(): Promise<BatteryInfo> {
	const battery = await si.battery();

	return {
		hasBattery: battery.hasBattery,
		percent: battery.percent,
		isCharging: battery.isCharging,
		timeRemaining: battery.timeRemaining !== -1 ? battery.timeRemaining : null,
	};
}

/**
 * Get network information
 */
export async function getNetwork(): Promise<NetworkInfo> {
	const [interfaces, connections] = await Promise.all([
		si.networkInterfaces(),
		si.networkConnections(),
	]);

	const ifaceArray = Array.isArray(interfaces) ? interfaces : [interfaces];

	return {
		interfaces: ifaceArray.map((iface) => ({
			name: iface.iface,
			ip4: iface.ip4 || "",
			ip6: iface.ip6 || "",
			mac: iface.mac,
			type: iface.type,
			speed: iface.speed ?? null,
		})),
		connections: {
			active: connections.length,
		},
	};
}

/**
 * Get disk usage information
 */
export async function getDisks(): Promise<DiskInfo> {
	const fsSize = await si.fsSize();

	return {
		disks: fsSize.map((disk) => ({
			name: disk.fs,
			mount: disk.mount,
			type: disk.type,
			size: disk.size,
			used: disk.used,
			available: disk.available,
			usedPercent: disk.use,
		})),
	};
}

/**
 * Get environment variable value
 */
export async function getEnvironmentVariable(
	name: string,
): Promise<string | null> {
	const value = process.env[name];
	return value ?? null;
}

/**
 * Get multiple environment variables (filtered by prefix)
 */
export async function getEnvironmentVariables(
	prefix?: string,
): Promise<Record<string, string>> {
	const result: Record<string, string> = {};
	const upperPrefix = prefix?.toUpperCase();

	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			if (!upperPrefix || key.toUpperCase().startsWith(upperPrefix)) {
				result[key] = value;
			}
		}
	}

	return result;
}

// Deny-list for dangerous PowerShell patterns
const BLOCKED_POWERSHELL_PATTERNS: RegExp[] = [
	/Remove-Item.*-Force/i,
	/Format-Volume/i,
	/Clear-Disk/i,
	/rm\s+-rf/i,
	/Stop-Computer/i,
	/Restart-Computer/i,
	/Invoke-Expression/i,
	/\biex\b/i,
	/DownloadString/i,
	/WebClient/i,
];

/**
 * Run a PowerShell command (deny-list restricted).
 *
 * @param command - PowerShell command to execute
 * @param timeout - Max execution time in milliseconds (default: 60000ms)
 * @returns Object containing output and success status
 */
export async function runPowerShell(
	command: string,
	timeout = 60000,
): Promise<{ output: string; success: boolean; exitCode?: number }> {
	if (!command || command.trim().length === 0) {
		throw new Error("Command cannot be empty");
	}

	for (const pattern of BLOCKED_POWERSHELL_PATTERNS) {
		if (pattern.test(command)) {
			throw new Error(`Command not allowed: ${command}`);
		}
	}

	try {
		const { stdout, stderr } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${command.replaceAll('"', '\\"')}"`,
			{
				maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
				timeout,
				windowsHide: true,
			},
		);

		return {
			output: stdout || stderr,
			success: true,
			exitCode: 0,
		};
	} catch (error: unknown) {
		const err = error as { stderr?: string; stdout?: string; message?: string; code?: number };
		return {
			output: err.stderr || err.stdout || err.message || "Unknown error",
			success: false,
			exitCode: err.code || 1,
		};
	}
}

/**
 * Run an unrestricted PowerShell command.
 * Requires DC_ALLOW_UNSAFE_POWERSHELL=1 environment variable.
 *
 * SECURITY WARNING: This function executes arbitrary PowerShell commands.
 * Only use with trusted AI agents in controlled environments.
 *
 * @param command - PowerShell command to execute
 * @param options - Execution options
 * @returns Object containing output and success status
 */
export async function runPowerShellUnsafe(
	command: string,
	options: { timeoutMs?: number } = {},
): Promise<{ output: string; success: boolean; exitCode?: number }> {
	if (!process.env.DC_ALLOW_UNSAFE_POWERSHELL) {
		throw new Error(
			"Unsafe PowerShell is disabled. Set DC_ALLOW_UNSAFE_POWERSHELL=1 to enable.",
		);
	}

	if (!command || command.trim().length === 0) {
		throw new Error("Command cannot be empty");
	}

	const timeout = options.timeoutMs ?? 60000;

	try {
		const { stdout, stderr } = await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${command.replaceAll('"', '\\"')}"`,
			{
				maxBuffer: 50 * 1024 * 1024,
				timeout,
				windowsHide: true,
			},
		);

		return {
			output: stdout || stderr,
			success: true,
			exitCode: 0,
		};
	} catch (error: unknown) {
		const err = error as { stderr?: string; stdout?: string; message?: string; code?: number };
		return {
			output: err.stderr || err.stdout || err.message || "Unknown error",
			success: false,
			exitCode: err.code || 1,
		};
	}
}

/**
 * Run a Command Prompt (cmd.exe) command
 *
 * SECURITY WARNING: This function executes arbitrary CMD commands.
 * Only use with trusted AI agents in controlled environments.
 *
 * @param command - CMD command to execute
 * @param timeout - Max execution time in milliseconds (default: 60000ms)
 * @returns Object containing output and success status
 */
export async function runCmd(
	command: string,
	timeout = 60000,
): Promise<{ output: string; success: boolean; exitCode?: number }> {
	if (!command || command.trim().length === 0) {
		throw new Error("Command cannot be empty");
	}

	try {
		const { stdout, stderr } = await execAsync(
			`cmd.exe /c "${command.replaceAll('"', '\\"')}"`,
			{
				maxBuffer: 50 * 1024 * 1024, // 50MB buffer
				timeout,
				windowsHide: true,
			},
		);

		return {
			output: stdout || stderr,
			success: true,
			exitCode: 0,
		};
	} catch (error: unknown) {
		const err = error as { stderr?: string; stdout?: string; message?: string; code?: number };
		return {
			output: err.stderr || err.stdout || err.message || "Unknown error",
			success: false,
			exitCode: err.code || 1,
		};
	}
}

/**
 * Show a Windows toast notification.
 */
export async function showNotification(
	title: string,
	message: string,
): Promise<void> {
	const t = title.replace(/'/g, "''");
	const m = message.replace(/'/g, "''");
	const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$text = $xml.GetElementsByTagName('text')
$text[0].AppendChild($xml.CreateTextNode('${t}')) | Out-Null
$text[1].AppendChild($xml.CreateTextNode('${m}')) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Desktop Commander').Show($toast)
`;
	await execAsync(
		`powershell.exe -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
		{ maxBuffer: 1024 * 1024 },
	);
}
