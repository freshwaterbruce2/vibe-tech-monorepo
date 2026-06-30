/**
 * ps-health.ts - shared PowerShell health-script runner + typed parsed reports.
 *
 * Owns the single copy of run()/runPs() (formerly inline in health-adapter.ts)
 * plus the JSON-report parsers consumed by mcp-adapter.ts. The database/d-drive
 * scripts write their JSON to a FILE (-OutputPath), not stdout, so the parsed
 * helpers run with an explicit output path and read it back.
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveWorkspaceRoot } from './workspace-scanner.js';

const execAsync = promisify(exec);
const MAX_BUFFER = 1024 * 1024 * 10;

export const WORKSPACE_ROOT = resolveWorkspaceRoot();
export const LEARNING_DIR = process.env.LEARNING_SYSTEM_DIR ?? 'D:/learning-system';
export const LOG_DIR = join(LEARNING_DIR, 'logs');
/** OS-level logs (real D:\logs); the AI Studio mock used a non-existent system-error.log. */
export const SYSTEM_LOG_DIR = process.env.LOGS_PATH ?? 'D:/logs';

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

/** Run a shell command the same way monorepo-health-mcp does. */
export async function run(cmd: string, cwd: string): Promise<RunResult> {
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
export async function runPs(script: string, args = ''): Promise<RunResult> {
  const file = join(WORKSPACE_ROOT, 'scripts', script);
  return run(
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${file}"${args ? ` ${args}` : ''}`,
    WORKSPACE_ROOT,
  );
}

// --- Typed report shapes (subset of the scripts' JSON we actually consume) ---

export interface DbFileRecord {
  name: string;
  relativePath: string;
  sizeMB: number;
  walExists: boolean;
  shmExists: boolean;
  integrity: string;
  isCore: boolean;
}

export interface DatabaseHealthReport {
  summary: { totalDatabases: number; coreDatabases: number; largeWalFiles: number };
  files: DbFileRecord[];
}

export interface DDriveHealthReport {
  disk: { status: string; freeGB: number; totalGB: number; usedPct: number };
  learningSystem: { status: string; staleDays: number; staleFileCount: number };
}

/** Run a JSON-emitting health script to a temp file and parse it. */
async function runReport<T>(script: string, outFile: string): Promise<T> {
  const out = join(tmpdir(), outFile);
  await runPs(script, `-OutputPath "${out}"`);
  return JSON.parse(await readFile(out, 'utf8')) as T;
}

export async function getDatabaseHealthReport(): Promise<DatabaseHealthReport> {
  return runReport<DatabaseHealthReport>('database-health.ps1', 'mc-database-health.json');
}

export async function getDDriveHealthReport(): Promise<DDriveHealthReport> {
  return runReport<DDriveHealthReport>('d-drive-health.ps1', 'mc-d-drive-health.json');
}

// --- Real error/OOM log scan (replaces the mock system-error.log) ------------

export interface LogScan {
  hasError: boolean;
  hasOOM: boolean;
  scanned: number;
  matches: Array<{ file: string; line: number; text: string }>;
}

const OOM_RE = /(out of memory|oom|heap out of memory)/i;
const ERR_RE = /(fatal|crash|traceback|unhandled|killed)/i;

/** Scan a log directory's *.log / *.err.log files for error + OOM markers. */
export async function scanLogsForErrors(dir: string = SYSTEM_LOG_DIR): Promise<LogScan> {
  const matches: LogScan['matches'] = [];
  let hasOOM = false;
  let scanned = 0;
  try {
    const files = (await readdir(dir)).filter((f) => /\.(log|err\.log|error\.log)$/i.test(f));
    scanned = files.length;
    for (const f of files) {
      const lines = (await readFile(join(dir, f), 'utf8')).split(/\r?\n/);
      lines.forEach((text, i) => {
        const oom = OOM_RE.test(text);
        if (oom) hasOOM = true;
        if (oom || ERR_RE.test(text)) matches.push({ file: f, line: i + 1, text: text.trim() });
      });
    }
  } catch {
    // Directory unreadable -> report no findings rather than throwing.
  }
  return { hasError: matches.length > 0, hasOOM, scanned, matches: matches.slice(-200) };
}

// --- Git status (real `git` via run(); gracefully degrades off a repo) -------

export interface GitReport {
  branch: string;
  isDirty: boolean;
  recentCommits: Array<{ hash: string; message: string }>;
}

/** Pure shaping of the three git command results into a GitReport. */
export function parseGitStatus(branch: RunResult, status: RunResult, log: RunResult): GitReport {
  if (!branch.success) return { branch: 'unknown', isDirty: false, recentCommits: [] };
  const recentCommits = log.success
    ? log.stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const sp = line.indexOf(' ');
          return sp === -1
            ? { hash: line, message: '' }
            : { hash: line.slice(0, sp), message: line.slice(sp + 1) };
        })
    : [];
  return {
    branch: branch.stdout,
    isDirty: status.success && status.stdout.length > 0,
    recentCommits,
  };
}

export async function getGitStatus(): Promise<GitReport> {
  const branch = await run('git rev-parse --abbrev-ref HEAD', WORKSPACE_ROOT);
  if (!branch.success) return parseGitStatus(branch, branch, branch);
  const [status, log] = await Promise.all([
    run('git status --porcelain', WORKSPACE_ROOT),
    run('git log --oneline -10', WORKSPACE_ROOT),
  ]);
  return parseGitStatus(branch, status, log);
}
