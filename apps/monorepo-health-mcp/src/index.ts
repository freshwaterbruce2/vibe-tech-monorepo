#!/usr/bin/env node
/**
 * monorepo-health-mcp - MCP server for checking workspace, disk, and database health.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

const server = new McpServer({
  name: 'monorepo-health-mcp',
  version: '1.0.0',
});

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? 'V:/monorepo';
const LEARNING_SYSTEM_DIR = 'D:/learning-system';

interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

// Helper to run a command and return response
async function runCommand(command: string, cwd: string) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }, null, 2)
      }]
    };
  } catch (error: unknown) {
    const err = error as ExecError;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          error: err.message,
          stdout: err.stdout?.trim() ?? '',
          stderr: err.stderr?.trim() ?? ''
        }, null, 2)
      }],
      isError: true
    };
  }
}

// --- Tool: run_workspace_maintenance -------------------------------
server.tool(
  'run_workspace_maintenance',
  'Execute the database maintenance pipeline (check integrity, retention policy, WAL checkpoint, vacuum, backup).',
  {
    retention: z.boolean().optional().describe('Run retention policy database cleanup'),
    vacuum: z.boolean().optional().describe('Run VACUUM to reclaim database disk space'),
    backup: z.boolean().optional().describe('Create database backup')
  },
  async ({ retention, vacuum, backup }) => {
    let flags = '';
    const resolvedRetention = retention ?? false;
    const resolvedVacuum = vacuum ?? false;
    const resolvedBackup = backup ?? false;

    if (resolvedRetention) flags += ' --retention';
    if (resolvedVacuum) flags += ' --vacuum';
    if (resolvedBackup) flags += ' --backup';

    const cmd = `python "${LEARNING_SYSTEM_DIR}/scripts/run_maintenance.py"${flags}`;
    return runCommand(cmd, LEARNING_SYSTEM_DIR);
  }
);

// --- Tool: get_database_health -------------------------------------
server.tool(
  'get_database_health',
  'Run diagnostics on all workspace SQLite databases and report their WAL, integrity, size, and row count statuses.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/database-health.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    return runCommand(cmd, WORKSPACE_ROOT);
  }
);

// --- Tool: get_workspace_health ------------------------------------
server.tool(
  'get_workspace_health',
  'Check workspace environment paths, package version drift, package manager status, and directory structure.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/workspace-health.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    return runCommand(cmd, WORKSPACE_ROOT);
  }
);

// --- Tool: get_d_drive_health --------------------------------------
server.tool(
  'get_d_drive_health',
  'Check the disk space, partition type, and folder structure size of the D:\\ drive where active data databases reside.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/d-drive-health.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    return runCommand(cmd, WORKSPACE_ROOT);
  }
);

// --- Tool: run_workspace_cleanup -----------------------------------
server.tool(
  'run_workspace_cleanup',
  'Clean up stale build artifacts, system caches, logs, and empty files from the workspace.',
  {
    dryRun: z.boolean().optional().describe('Preview stale files that will be deleted without actually deleting them')
  },
  async ({ dryRun }) => {
    const resolvedDryRun = dryRun ?? false;
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/cleanup-stale-artifacts.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"${resolvedDryRun ? ' -DryRun' : ''}`;
    return runCommand(cmd, WORKSPACE_ROOT);
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Monorepo Health MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
