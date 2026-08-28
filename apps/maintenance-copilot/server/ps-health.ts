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

// Cap concurrent child processes. The dashboard loads every panel at once (x2
// under React StrictMode dev), which fired ~10+ simultaneous pwsh/git spawns —
// a rapid spawn storm that can crash libuv natively on Windows (exit -1, not
// catchable by JS handlers). Queueing to a small ceiling prevents that.
const MAX_CONCURRENT_PROC = 2;
let activeProc = 0;
const procQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeProc < MAX_CONCURRENT_PROC) {
    activeProc += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    procQueue.push(() => {
      activeProc += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeProc -= 1;
  procQueue.shift()?.();
}

/** Run a shell command (concurrency-capped) the way monorepo-health-mcp does. */
export async function run(cmd: string, cwd: string): Promise<RunResult> {
  await acquireSlot();
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e) {
    const err = e as { message: string; stdout?: string; stderr?: string };
    return {
      success: false,
      stdout: err.stdout?.trim() ?? '',
      stderr: err.stderr?.trim() ?? '',
      error: err.message,
    };
  } finally {
    releaseSlot();
  }
}

/** Run a PowerShell script from the workspace `scripts/` directory. */
export async function runPs(script: string, args = ''): Promise<RunResult> {
  const file = join(WORKSPACE_ROOT, 'scripts', script);
  return run(
    // pwsh (PowerShell 7) — the workspace standard. Avoids 5.1's UTF8-with-BOM
    // writes and PS7-only syntax errors (e.g. d-drive-health's op_Subtraction).
    `pwsh -NoProfile -ExecutionPolicy Bypass -File "${file}"${args ? ` ${args}` : ''}`,
    WORKSPACE_ROOT,
  );
}

// --- Real DB maintenance pipeline (run_maintenance.py) -----------------------

/** Opt-in steps for the maintenance pipeline. Baseline (all false) is non-destructive. */
export interface MaintenanceOptions {
  retention?: boolean;
  vacuum?: boolean;
  backup?: boolean;
}

/** Build the maintenance command string (no execution). Used for the dry-run preview. */
export function previewMaintenance(opts: MaintenanceOptions = {}): string {
  const flags = [
    opts.retention && '--retention',
    opts.vacuum && '--vacuum',
    opts.backup && '--backup',
  ]
    .filter(Boolean)
    .join(' ');
  const script = join(LEARNING_DIR, 'scripts/run_maintenance.py');
  return `python "${script}"${flags ? ` ${flags}` : ''}`;
}

/**
 * Run the real database maintenance pipeline, mirroring monorepo-health-mcp's
 * run_workspace_maintenance. Baseline (no opts) runs integrity check → WAL
 * checkpoint(TRUNCATE) → ANALYZE on agent_learning.db (no data loss); the
 * --retention/--vacuum/--backup steps are opt-in. The python pipeline aborts
 * before any destructive step if PRAGMA integrity_check fails.
 */
export async function runMaintenance(opts: MaintenanceOptions = {}): Promise<RunResult> {
  return run(previewMaintenance(opts), LEARNING_DIR);
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

const reportCache = new Map<string, { at: number; data: unknown }>();
const reportInflight = new Map<string, Promise<unknown>>();
const REPORT_TTL_MS = 5000;

/**
 * Run a JSON-emitting health script to a temp file and parse it, with a short
 * TTL cache + in-flight dedup. The dashboard loads every panel at once (×2 under
 * React StrictMode in dev); without this each would spawn its own pwsh and race
 * on the shared temp file. Dedup => one pwsh per script at a time.
 */
async function runReport<T>(script: string, outFile: string): Promise<T> {
  const cached = reportCache.get(script);
  if (cached && Date.now() - cached.at < REPORT_TTL_MS) return cached.data as T;
  const existing = reportInflight.get(script);
  if (existing) return existing as Promise<T>;

  const job = (async () => {
    const out = join(tmpdir(), outFile);
    await runPs(script, `-OutputPath "${out}"`);
    // Strip a leading UTF-8 BOM defensively (some PowerShell encoders emit one).
    const text = await readFile(out, 'utf8');
    const raw = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    return JSON.parse(raw) as T;
  })();

  reportInflight.set(script, job);
  try {
    const data = await job;
    reportCache.set(script, { at: Date.now(), data });
    return data;
  } finally {
    reportInflight.delete(script);
  }
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
