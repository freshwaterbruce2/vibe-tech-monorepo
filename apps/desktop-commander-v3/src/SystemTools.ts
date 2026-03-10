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
	let vkCode: number;
	switch (action) {
		case "up":
			vkCode = 0xaf;
			break;
		case "down":
			vkCode = 0xae;
			break;
		case "mute":
			vkCode = 0xad;
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

/**
 * Run a PowerShell command (unrestricted for AI agent use)
 *
 * SECURITY WARNING: This function executes arbitrary PowerShell commands.
 * Only use with trusted AI agents in controlled environments.
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
	} catch (error: any) {
		return {
			output: error.stderr || error.stdout || error.message || "Unknown error",
			success: false,
			exitCode: error.code || 1,
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
	} catch (error: any) {
		return {
			output: error.stderr || error.stdout || error.message || "Unknown error",
			success: false,
			exitCode: error.code || 1,
		};
	}
}
