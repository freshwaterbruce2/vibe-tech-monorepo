/**
 * commands - pure, side-effect-free command builders and the shared exec runner
 * used by monorepo-health-mcp's tool handlers. Extracted from index.ts so the
 * logic is importable/testable without triggering MCP server startup.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

interface MaintenanceOptions {
  retention?: boolean;
  vacuum?: boolean;
  backup?: boolean;
}

export interface CommandResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// Run a shell command in cwd and return an MCP tool response.
export async function runCommand(command: string, cwd: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const err = error as ExecError;
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: false,
              error: err.message,
              stdout: err.stdout?.trim() ?? '',
              stderr: err.stderr?.trim() ?? '',
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}

// PowerShell 7 (pwsh.exe) invocation for the health-check scripts.
export function buildPwshCommand(scriptPath: string): string {
  return `pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
}

// Windows PowerShell invocation for the cleanup script (intentionally powershell.exe).
export function buildPowershellCommand(scriptPath: string, dryRun: boolean): string {
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"${dryRun ? ' -DryRun' : ''}`;
}

// Build the run_maintenance.py invocation with the requested flags.
export function buildMaintenanceCommand(
  learningSystemDir: string,
  opts: MaintenanceOptions,
): string {
  const resolvedRetention = opts.retention ?? false;
  const resolvedVacuum = opts.vacuum ?? false;
  const resolvedBackup = opts.backup ?? false;

  let flags = '';
  if (resolvedRetention) flags += ' --retention';
  if (resolvedVacuum) flags += ' --vacuum';
  if (resolvedBackup) flags += ' --backup';

  return `python "${learningSystemDir}/scripts/run_maintenance.py"${flags}`;
}
