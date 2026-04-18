import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const BUFFER_1MB = 1 * 1024 * 1024;
export const BUFFER_10MB = 10 * 1024 * 1024;
export const BUFFER_50MB = 50 * 1024 * 1024;

export interface RunPsOptions {
  maxBuffer?: number;
  /** Include -ExecutionPolicy Bypass flag */
  bypassPolicy?: boolean;
}

/** Run a PowerShell script via -Command and return trimmed stdout. */
export async function runPs(script: string, opts: RunPsOptions = {}): Promise<string> {
  const { maxBuffer = BUFFER_1MB, bypassPolicy = false } = opts;
  const policyFlag = bypassPolicy ? ' -ExecutionPolicy Bypass' : '';
  const inlined = script.replace(/\n/g, ' ');
  const { stdout } = await execAsync(
    `powershell.exe -NoProfile${policyFlag} -Command "${inlined}"`,
    { maxBuffer },
  );
  return stdout.trim();
}

/** Parse PowerShell ConvertTo-Json output, stripping any BOM. */
export function parsePsJson<T>(stdout: string): T {
  return JSON.parse(stdout.replace(/^\uFEFF/, '')) as T;
}
