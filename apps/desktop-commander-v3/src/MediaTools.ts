/**
 * MediaTools - Screen recording and camera capture for Desktop Commander V3.
 * Uses ffmpeg when available.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { validatePath } from "./PathValidator.js";

const execFileAsync = promisify(execFile);
const DEFAULT_RECORD_DIR = "D:\\recordings";

export interface CameraDevice {
	name: string;
	instanceId?: string;
}

async function resolveFfmpeg(): Promise<string> {
	const envPath = process.env.FFMPEG_PATH;
	if (envPath && fs.existsSync(envPath)) {
		return envPath;
	}

	const candidates = [
		"C:\\dev\\tools\\ffmpeg\\bin\\ffmpeg.exe",
		"C:\\ffmpeg\\bin\\ffmpeg.exe",
		"D:\\tools\\ffmpeg\\bin\\ffmpeg.exe",
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	try {
		const { stdout } = await execFileAsync("where", ["ffmpeg"]);
		const match = stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
		if (match) {
			return match.trim();
		}
	} catch {
		// Ignore and fall through
	}

	throw new Error(
		"ffmpeg not found. Install ffmpeg and add to PATH or set FFMPEG_PATH.",
	);
}

function ensureOutputPath(
	outputPath?: string,
	directory?: string,
	defaultPrefix = "capture",
	defaultExt = "mp4",
): string {
	const dir = directory ?? DEFAULT_RECORD_DIR;
	validatePath(dir, "write");
	fs.mkdirSync(dir, { recursive: true });

	const filename = outputPath
		? path.basename(outputPath)
		: `${defaultPrefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.${defaultExt}`;
	const resolved = outputPath ?? path.join(dir, filename);
	validatePath(resolved, "write");
	return resolved;
}

export async function listCameras(): Promise<CameraDevice[]> {
	const psCommand = [
		"Get-PnpDevice -Class Camera",
		"Select-Object FriendlyName,InstanceId",
		"ConvertTo-Json -Compress",
	].join(" | ");

	const { stdout } = await execFileAsync(
		"powershell.exe",
		["-NoProfile", "-Command", psCommand],
		{ maxBuffer: 1024 * 1024 },
	);

	const raw = stdout.trim();
	if (!raw) {
		return [];
	}

	interface RawCameraDevice {
		FriendlyName?: string;
		InstanceId?: string;
		name?: string;
		instanceId?: string;
	}

	const parsed = JSON.parse(raw) as RawCameraDevice | RawCameraDevice[];
	const devices = Array.isArray(parsed) ? parsed : [parsed];
	return devices
		.map((device): CameraDevice | null => {
			const name = device.name ?? device.FriendlyName;
			if (!name) {
				return null;
			}
			const instanceId = device.instanceId ?? device.InstanceId;
			return instanceId ? { name, instanceId } : { name };
		})
		.filter((device): device is CameraDevice => device !== null);
}

export async function recordScreen(options: {
	durationSeconds: number;
	fps?: number;
	directory?: string;
	filename?: string;
	outputPath?: string;
}): Promise<string> {
	if (!options.durationSeconds || options.durationSeconds <= 0) {
		throw new Error("durationSeconds must be greater than 0");
	}

	const ffmpegPath = await resolveFfmpeg();
	const fps = Math.max(1, Math.min(60, Math.round(options.fps ?? 15)));
	const outputPath = ensureOutputPath(
		options.outputPath,
		options.directory,
		options.filename ?? "screen-record",
		"mp4",
	);

	const args = [
		"-y",
		"-f",
		"gdigrab",
		"-framerate",
		String(fps),
		"-i",
		"desktop",
		"-t",
		String(options.durationSeconds),
		"-pix_fmt",
		"yuv420p",
		outputPath,
	];

	await execFileAsync(ffmpegPath, args, { maxBuffer: 10 * 1024 * 1024 });
	return outputPath;
}

export async function captureCamera(options: {
	device?: string;
	durationSeconds?: number;
	directory?: string;
	filename?: string;
	outputPath?: string;
}): Promise<string> {
	const ffmpegPath = await resolveFfmpeg();
	const devices = await listCameras();
	const deviceName = options.device ?? devices[0]?.name;

	if (!deviceName) {
		throw new Error("No camera device found. Provide a device name.");
	}

	const isVideo = Boolean(
		options.durationSeconds && options.durationSeconds > 0,
	);
	const outputPath = ensureOutputPath(
		options.outputPath,
		options.directory,
		options.filename ?? (isVideo ? "camera-record" : "camera-shot"),
		isVideo ? "mp4" : "png",
	);

	const deviceArg = `video=${deviceName.replace(/"/g, "")}`;
	const args = isVideo
		? [
				"-y",
				"-f",
				"dshow",
				"-i",
				deviceArg,
				"-t",
				String(options.durationSeconds),
				outputPath,
			]
		: ["-y", "-f", "dshow", "-i", deviceArg, "-frames:v", "1", outputPath];

	await execFileAsync(ffmpegPath, args, { maxBuffer: 10 * 1024 * 1024 });
	return outputPath;
}
