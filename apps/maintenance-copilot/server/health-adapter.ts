/**
 * health-adapter.ts - live data router. Each endpoint runs the same scripts that
 * apps/monorepo-health-mcp already wraps, so the dashboard shows real state.
 *
 *   Panel                   Route             Underlying script
 *   ----------------------  ----------------  -------------------------------------
 *   Workspace Stability     GET  /workspace   workspace-health.ps1 + scanWorkspace
 *   Database health         GET  /databases   database-health.ps1
 *   D:\ drive health        GET  /d-drive     d-drive-health.ps1
 *   AI-training crash log   GET  /logs/errors D:/learning-system/logs/*.log
 *   "Fix & Align" cleanup   POST /cleanup     cleanup-stale-artifacts.ps1 [-DryRun]
 *   "Unlock DB" maintenance POST /maintenance learning-system/.../run_maintenance.py
 *
 * SAFETY: destructive routes default to dry-run / require explicit confirm.
 */
import { Router, type Request, type Response } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { scanWorkspace, resolveWorkspaceRoot } from './workspace-scanner.js';

const execAsync = promisify(exec);
const MAX_BUFFER = 1024 * 1024 * 10;
const WORKSPACE_ROOT = resolveWorkspaceRoot();
const LEARNING_DIR = process.env.LEARNING_SYSTEM_DIR ?? 'D:/learning-system';
const LOG_DIR = join(LEARNING_DIR, 'logs');

interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

/** Run a shell command the same way monorepo-health-mcp does. */
async function run(cmd: string, cwd: string): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, maxBuffer: MAX_BUFFER });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e) {
    const err = e as { message: string; stdout?: string; stderr?: string };
    return {
      success: false,
      stdout: err.stdout?.trim() ?? '',
      stderr: err.stderr?.trim() ?? '',
      error: err.message,
    };
  }
}

/** Run a PowerShell script from the workspace `scripts/` directory. */
async function runPs(script: string, args = ''): Promise<RunResult> {
  const file = join(WORKSPACE_ROOT, 'scripts', script);
  return run(
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${file}"${args ? ` ${args}` : ''}`,
    WORKSPACE_ROOT,
  );
}

export const healthRouter = Router();

// --- Read-only panels ------------------------------------------------------

healthRouter.get('/workspace', async (_req: Request, res: Response) => {
  const [health, scan] = await Promise.all([
    runPs('workspace-health.ps1'),
    scanWorkspace(WORKSPACE_ROOT),
  ]);
  res.json({
    health,
    packages: { count: scan.count, includeGlobs: scan.includeGlobs, items: scan.packages },
  });
});

// NOTE: .db-wal/.db-shm are normal WAL files, not locks - this reports real integrity.
healthRouter.get('/databases', async (_req: Request, res: Response) => {
  res.json(await runPs('database-health.ps1'));
});

healthRouter.get('/d-drive', async (_req: Request, res: Response) => {
  res.json(await runPs('d-drive-health.ps1'));
});

// Scan REAL logs for OOM/errors (replaces the AI Studio mock error log).
healthRouter.get('/logs/errors', async (_req: Request, res: Response) => {
  const pattern = /(out of memory|oom|fatal|error|crash|traceback|killed)/i;
  try {
    const files = (await readdir(LOG_DIR)).filter((f) => f.endsWith('.log'));
    const hits: Array<{ file: string; line: number; text: string }> = [];
    for (const f of files) {
      const lines = (await readFile(join(LOG_DIR, f), 'utf8')).split(/\r?\n/);
      lines.forEach((text, i) => {
        if (pattern.test(text)) hits.push({ file: f, line: i + 1, text: text.trim() });
      });
    }
    res.json({ success: true, logDir: LOG_DIR, scanned: files.length, matches: hits.slice(-200) });
  } catch (e) {
    res.json({ success: false, error: (e as Error).message, logDir: LOG_DIR });
  }
});

// --- Mutating actions (dry-run / confirm gated) ----------------------------

// "Fix & Align" cleanup. Body { dryRun?: boolean } - defaults to dry-run.
healthRouter.post('/cleanup', async (req: Request, res: Response) => {
  const dryRun = req.body?.dryRun !== false;
  res.json(await runPs('cleanup-stale-artifacts.ps1', dryRun ? '-DryRun' : ''));
});

// Maintenance / "Unlock DB". Body { confirm, retention, vacuum, backup }.
healthRouter.post('/maintenance', async (req: Request, res: Response) => {
  if (req.body?.confirm !== true) {
    res.status(412).json({
      success: false,
      error: 'maintenance is destructive; resend with { "confirm": true }',
    });
    return;
  }
  const { retention, vacuum, backup } = req.body as {
    retention?: boolean;
    vacuum?: boolean;
    backup?: boolean;
  };
  const flags = [retention && '--retention', vacuum && '--vacuum', backup && '--backup']
    .filter(Boolean)
    .join(' ');
  const script = join(LEARNING_DIR, 'scripts/run_maintenance.py');
  res.json(await run(`python "${script}"${flags ? ` ${flags}` : ''}`, LEARNING_DIR));
});
