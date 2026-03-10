/**
 * WindowsFileSystemTools - Windows-optimized filesystem utilities for Desktop Commander V3
 *
 * Focus areas (Windows 11):
 * - Long path awareness and extended path prefix handling (\\?\\)
 * - Robust directory copy via robocopy
 * - File hash computation (Get-FileHash equivalent)
 * - ACL retrieval (Get-Acl equivalent)
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
	isDirectory,
	isFile,
	normalizePath,
	validatePath,
} from "./PathValidator.js";

interface RobocopyOptions {
	threads?: number; // 1-128
	restartable?: boolean; // /Z
	unbuffered?: boolean; // /J
	copySecurity?: boolean; // /COPY:DATS (vs DAT)
	mirror?: boolean; // /MIR (dangerous; requires confirmDangerous)
	confirmDangerous?: boolean;
	maxRetries?: number; // /R:n
	waitSeconds?: number; // /W:n
}

function clampInt(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

function escapeSingleQuotes(value: string): string {
	return value.replace(/'/g, "''");
}

function toExtendedWindowsPath(originalPath: string): string {
	// Validate before calling this. We only want to improve Win32 path handling,
	// not change the security boundaries.
	const resolved = path.resolve(originalPath);

	// Already extended.
	if (resolved.startsWith("\\\\?\\")) return resolved;

	// UNC path.
	if (resolved.startsWith("\\\\")) {
		// \\server\share\... -> \\?\UNC\server\share\...
		return `\\\\?\\UNC\\${resolved.slice(2)}`;
	}

	// Drive-letter path.
	return `\\\\?\\${resolved}`;
}

async function runPowerShellJson(script: string): Promise<unknown> {
	if (process.platform !== "win32") {
		throw new Error("PowerShell tools are only supported on Windows");
	}

	const args = [
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		script,
	];

	return await new Promise((resolve, reject) => {
		const child = spawn("powershell.exe", args, {
			windowsHide: true,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];

		child.stdout.on("data", (d) =>
			stdoutChunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)),
		);
		child.stderr.on("data", (d) =>
			stderrChunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)),
		);

		child.on("error", (err) => reject(err));
		child.on("close", (code) => {
			const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
			const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

			if (code !== 0) {
				reject(
					new Error(
						`PowerShell exited with code ${code}: ${stderr || stdout || "Unknown error"}`,
					),
				);
				return;
			}

			if (!stdout) {
				resolve(null);
				return;
			}

			try {
				resolve(JSON.parse(stdout));
			} catch {
				// Some PS output can include BOM/newlines; try a last-ditch cleanup.
				try {
					resolve(JSON.parse(stdout.replace(/^\uFEFF/, "")));
				} catch {
					resolve({ raw: stdout });
				}
			}
		});
	});
}

/**
 * Check Windows LongPathsEnabled registry setting
 * FIX: Wrap result in object BEFORE piping to ConvertTo-Json to avoid empty pipe element error
 */
export async function getLongPathsStatus(): Promise<{
	longPathsEnabled: number | null;
	note: string;
}> {
	const script =
		"$val = try { (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name LongPathsEnabled -ErrorAction Stop).LongPathsEnabled } catch { $null }; @{ value = $val } | ConvertTo-Json";

	const result = await runPowerShellJson(script);
	const value =
		typeof result === "object" && result !== null && "value" in result
			? typeof (result as { value: unknown }).value === "number"
				? (result as { value: number }).value
				: null
			: null;

	return {
		longPathsEnabled: value,
		note: "Windows long paths require LongPathsEnabled=1 and an app manifest with longPathAware=true (per Microsoft docs).",
	};
}

export async function getFileHash(
	filePath: string,
	algorithmRaw?: string,
): Promise<{ algorithm: string; hash: string; path: string }> {
	validatePath(filePath, "read");

	if (!(await isFile(filePath))) {
		throw new Error(`Not a file or does not exist: ${filePath}`);
	}

	const algorithm = (algorithmRaw ?? "sha256").toLowerCase();
	const hasher = crypto.createHash(algorithm);

	await new Promise<void>((resolve, reject) => {
		const stream = fs.createReadStream(toExtendedWindowsPath(filePath));
		stream.on("data", (chunk) => hasher.update(chunk));
		stream.on("error", (err) => reject(err));
		stream.on("end", () => resolve());
	});

	return {
		algorithm: algorithm.toUpperCase(),
		hash: hasher.digest("hex").toUpperCase(),
		path: normalizePath(filePath),
	};
}

export async function getAcl(filePath: string): Promise<unknown> {
	validatePath(filePath, "read");

	const p = escapeSingleQuotes(path.resolve(filePath));
	const script = `
$p='${p}'
$acl = Get-Acl -LiteralPath $p
[pscustomobject]@{
  Path = $acl.Path
  Owner = $acl.Owner
  Group = $acl.Group
  Sddl = $acl.Sddl
  Access = $acl.Access
} | ConvertTo-Json -Depth 6
`.replace(/\r?\n/g, "; ");

	return await runPowerShellJson(script);
}

export async function getItemAttributes(filePath: string): Promise<unknown> {
	validatePath(filePath, "read");

	const p = escapeSingleQuotes(path.resolve(filePath));
	const script = `
$p='${p}'
$item = Get-Item -Force -LiteralPath $p
[pscustomobject]@{
  FullName = $item.FullName
  Exists = $true
  Attributes = $item.Attributes.ToString()
  LinkType = $item.LinkType
  Target = $item.Target
  Length = $item.Length
  CreationTimeUtc = $item.CreationTimeUtc
  LastWriteTimeUtc = $item.LastWriteTimeUtc
  LastAccessTimeUtc = $item.LastAccessTimeUtc
} | ConvertTo-Json -Depth 4
`.replace(/\r?\n/g, "; ");

	return await runPowerShellJson(script);
}

export async function copyDirectoryRobocopy(
	sourceDir: string,
	destinationDir: string,
	options: RobocopyOptions = {},
): Promise<{ exitCode: number; ok: boolean; summary: string }> {
	validatePath(sourceDir, "read");
	validatePath(destinationDir, "write");

	if (!(await isDirectory(sourceDir))) {
		throw new Error(`Not a directory or does not exist: ${sourceDir}`);
	}

	// Create destination directory if needed
	await fs.promises.mkdir(destinationDir, { recursive: true });

	const threads = clampInt(options.threads, 8, 1, 128);
	const maxRetries = clampInt(options.maxRetries, 2, 0, 100);
	const waitSeconds = clampInt(options.waitSeconds, 1, 0, 60);

	if (options.mirror && !options.confirmDangerous) {
		throw new Error(
			"mirror=true is destructive (uses /MIR). Set confirmDangerous=true to proceed.",
		);
	}

	// Per Microsoft docs, robocopy exit codes 0-7 are success-ish, >=8 indicates failure.
	const args: string[] = [
		sourceDir,
		destinationDir,
		"*.*",
		options.mirror ? "/MIR" : "/E",
		"/XJ",
		`/R:${maxRetries}`,
		`/W:${waitSeconds}`,
		`/MT:${threads}`,
		"/NP",
		"/NJH",
		"/NJS",
	];

	if (options.restartable !== false) args.push("/Z");
	if (options.unbuffered) args.push("/J");

	// Default robocopy copies DAT. Allow copying DATS when explicitly requested.
	args.push(options.copySecurity ? "/COPY:DATS" : "/COPY:DAT");

	return await new Promise((resolve, reject) => {
		const child = spawn("robocopy", args, {
			windowsHide: true,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const out: Buffer[] = [];
		const err: Buffer[] = [];

		child.stdout.on("data", (d) =>
			out.push(Buffer.isBuffer(d) ? d : Buffer.from(d)),
		);
		child.stderr.on("data", (d) =>
			err.push(Buffer.isBuffer(d) ? d : Buffer.from(d)),
		);

		child.on("error", (e) => reject(e));
		child.on("close", (code) => {
			const exitCode = code ?? 16;
			const stdout = Buffer.concat(out).toString("utf8");
			const stderr = Buffer.concat(err).toString("utf8");

			const ok = exitCode >= 0 && exitCode < 8;
			const tail = (stdout || stderr)
				.split(/\r?\n/)
				.slice(-30)
				.join("\n")
				.trim();

			resolve({
				exitCode,
				ok,
				summary: tail || `robocopy exit code ${exitCode}`,
			});
		});
	});
}
