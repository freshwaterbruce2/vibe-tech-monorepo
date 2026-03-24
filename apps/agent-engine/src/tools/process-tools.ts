import { execSync } from 'child_process';
import type { CommandResult } from '../types.js';

export interface ExecOptions {
  cwd: string;
  timeout: number;
}

export function runCommand(command: string, options: ExecOptions): CommandResult {
  const started = Date.now();

  try {
    const stdout = execSync(command, {
      cwd: options.cwd,
      encoding: 'utf-8',
      timeout: options.timeout,
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 20,
    });

    return {
      command,
      stdout,
      stderr: '',
      success: true,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string };
    return {
      command,
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? String(error),
      success: false,
      durationMs: Date.now() - started,
    };
  }
}
