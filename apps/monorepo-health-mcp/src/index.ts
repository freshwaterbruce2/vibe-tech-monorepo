#!/usr/bin/env node
/**
 * monorepo-health-mcp - MCP server for checking workspace, disk, and database health.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  buildMaintenanceCommand,
  buildPowershellCommand,
  buildPwshCommand,
  runCommand,
} from './commands.js';

const server = new McpServer({
  name: 'monorepo-health-mcp',
  version: '1.0.0',
});

// This module lives at <repoRoot>/apps/monorepo-health-mcp/{src,dist}/index.{ts,js},
// so the repo root is always three directories up from the module's own location.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? join(moduleDir, '..', '..', '..');
const LEARNING_SYSTEM_DIR = 'D:/learning-system';

// --- Tool: run_workspace_maintenance -------------------------------
server.tool(
  'run_workspace_maintenance',
  'Execute the database maintenance pipeline (check integrity, retention policy, WAL checkpoint, vacuum, backup).',
  {
    retention: z.boolean().optional().describe('Run retention policy database cleanup'),
    vacuum: z.boolean().optional().describe('Run VACUUM to reclaim database disk space'),
    backup: z.boolean().optional().describe('Create database backup'),
  },
  async ({ retention, vacuum, backup }) => {
    const cmd = buildMaintenanceCommand(LEARNING_SYSTEM_DIR, { retention, vacuum, backup });
    return runCommand(cmd, LEARNING_SYSTEM_DIR);
  },
);

// --- Tool: get_database_health -------------------------------------
server.tool(
  'get_database_health',
  'Run diagnostics on all workspace SQLite databases and report their WAL, integrity, size, and row count statuses.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/database-health.ps1');
    const cmd = buildPwshCommand(scriptPath);
    return runCommand(cmd, WORKSPACE_ROOT);
  },
);

// --- Tool: get_workspace_health ------------------------------------
server.tool(
  'get_workspace_health',
  'Check workspace environment paths, package version drift, package manager status, and directory structure.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/workspace-health.ps1');
    const cmd = buildPwshCommand(scriptPath);
    return runCommand(cmd, WORKSPACE_ROOT);
  },
);

// --- Tool: get_d_drive_health --------------------------------------
server.tool(
  'get_d_drive_health',
  'Check the disk space, partition type, and folder structure size of the D:\\ drive where active data databases reside.',
  {},
  async () => {
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/d-drive-health.ps1');
    const cmd = buildPwshCommand(scriptPath);
    return runCommand(cmd, WORKSPACE_ROOT);
  },
);

// --- Tool: run_workspace_cleanup -----------------------------------
server.tool(
  'run_workspace_cleanup',
  'Clean up stale build artifacts, system caches, logs, and empty files from the workspace.',
  {
    dryRun: z
      .boolean()
      .optional()
      .describe('Preview stale files that will be deleted without actually deleting them'),
  },
  async ({ dryRun }) => {
    const resolvedDryRun = dryRun ?? false;
    const scriptPath = join(WORKSPACE_ROOT, 'scripts/cleanup-stale-artifacts.ps1');
    const cmd = buildPowershellCommand(scriptPath, resolvedDryRun);
    return runCommand(cmd, WORKSPACE_ROOT);
  },
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
