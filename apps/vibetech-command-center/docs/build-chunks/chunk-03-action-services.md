# Chunk 3 — Action Services (Write Operations & External Bridges)

**Goal:** Implement the four services that *do* things — create backups, spawn processes, drive Claude Code, query RAG. Every action service is backup-aware, timeout-bounded, and streamable. Each ships with Vitest coverage.

**Session time budget:** ~2 hours.

**Explicitly NOT in this chunk:** IPC wiring to renderer, panels, MCP server exposure. Services only.

**Prerequisite:** Chunk 2 complete. All 16 telemetry tests green.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk03_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. Shared types — extend `src/shared/types.ts`

Append the following to the existing file. Do not replace existing types.

```typescript
// ---------- backup-service ----------
export interface BackupRequest {
  sourcePath: string;        // absolute Windows path — file or directory
  label?: string;            // optional tag, sanitized into filename
  destinationDir?: string;   // defaults to C:\dev\_backups
}

export interface BackupResult {
  success: boolean;
  zipPath: string;
  sizeBytes: number;
  sourcePath: string;
  label: string | null;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  error?: string;
}

export interface BackupLogEntry {
  zipPath: string;
  sizeBytes: number;
  createdAt: number;
  label: string | null;
}

// ---------- process-runner ----------
export type ProcessStatus = 'running' | 'exited' | 'killed' | 'error';

export interface ProcessHandle {
  id: string;                // internal opaque id
  command: string;
  args: readonly string[];
  cwd: string;
  pid: number | null;
  status: ProcessStatus;
  startedAt: number;
  exitedAt?: number;
  exitCode: number | null;
}

export interface ProcessChunk {
  processId: string;
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

// ---------- claude-bridge ----------
export type ClaudeAllowedTool =
  | 'Read' | 'Write' | 'Edit' | 'Bash' | 'Glob' | 'Grep' | 'WebFetch' | 'WebSearch';

export interface ClaudeInvocation {
  prompt: string;
  cwd: string;                         // absolute path to app directory
  allowedTools: ClaudeAllowedTool[];
  appendSystemPrompt?: string;
  resumeSessionId?: string;
  permissionMode?: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'default';
  timeoutMs?: number;                  // default 20 minutes
}

export interface ClaudeStreamEvent {
  invocationId: string;
  type: 'system' | 'assistant' | 'user' | 'result' | 'error' | 'raw';
  subtype?: string;
  payload: unknown;
  timestamp: number;
}

export interface ClaudeInvocationResult {
  invocationId: string;
  sessionId: string | null;
  success: boolean;
  exitCode: number | null;
  resultText: string | null;
  durationMs: number;
  totalCostUsd: number | null;
  numTurns: number | null;
  error?: string;
}

// ---------- rag-client ----------
export interface RagSearchQuery {
  query: string;
  topK?: number;           // default 8
  filter?: { app?: string; language?: string; };
}

export interface RagHit {
  score: number;
  path: string;            // absolute path inside C:\dev
  language: string | null;
  snippet: string;
  startLine: number | null;
  endLine: number | null;
}

export interface RagSearchResult {
  query: string;
  hits: RagHit[];
  latencyMs: number;
  source: 'mcp-rag-server' | 'fallback' | 'unavailable';
  error?: string;
}
```

---

## 2. Service: `backup-service.ts`

**Path:** `src/main/services/backup-service.ts`

Wraps your exact PowerShell `Compress-Archive` command. Non-negotiable: uses PowerShell 7 (`pwsh.exe`), argv-based invocation, zero shell interpolation.

```typescript
import { spawn } from 'node:child_process';
import { existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { BackupRequest, BackupResult, BackupLogEntry } from '@shared/types';

export interface BackupServiceOptions {
  defaultDestination?: string;          // default C:\dev\_backups
  powershellPath?: string;              // default pwsh.exe (PS7)
  timeoutMs?: number;                   // default 10 minutes
}

const LABEL_SANITIZE = /[^a-zA-Z0-9_\-]/g;

export class BackupService {
  private readonly defaultDest: string;
  private readonly psPath: string;
  private readonly timeoutMs: number;

  constructor(opts: BackupServiceOptions = {}) {
    this.defaultDest = opts.defaultDestination ?? 'C:\\dev\\_backups';
    this.psPath = opts.powershellPath ?? 'pwsh.exe';
    this.timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  }

  async createBackup(req: BackupRequest): Promise<BackupResult> {
    const startedAt = Date.now();
    const source = resolve(req.sourcePath);
    const destDir = resolve(req.destinationDir ?? this.defaultDest);
    const label = req.label ? req.label.replace(LABEL_SANITIZE, '_').slice(0, 48) : null;

    const baseline: BackupResult = {
      success: false,
      zipPath: '',
      sizeBytes: 0,
      sourcePath: source,
      label,
      startedAt,
      completedAt: 0,
      durationMs: 0
    };

    if (!existsSync(source)) {
      return { ...baseline, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: 'source not found' };
    }

    if (!existsSync(destDir)) {
      try { mkdirSync(destDir, { recursive: true }); }
      catch (err) { return { ...baseline, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: `could not create destination: ${(err as Error).message}` }; }
    }

    const stamp = this.timestamp();
    const sourceName = basename(source).replace(LABEL_SANITIZE, '_');
    const parts = [sourceName, label, stamp].filter(Boolean);
    const zipName = `${parts.join('_')}.zip`;
    const zipPath = join(destDir, zipName);

    try {
      await this.runCompressArchive(source, zipPath);
      if (!existsSync(zipPath)) {
        return { ...baseline, zipPath, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: 'zip not produced' };
      }
      const sizeBytes = statSync(zipPath).size;
      const completedAt = Date.now();
      return {
        success: true,
        zipPath,
        sizeBytes,
        sourcePath: source,
        label,
        startedAt,
        completedAt,
        durationMs: completedAt - startedAt
      };
    } catch (err) {
      return { ...baseline, zipPath, completedAt: Date.now(), durationMs: Date.now() - startedAt, error: (err as Error).message };
    }
  }

  listRecent(limit = 20, destinationDir?: string): BackupLogEntry[] {
    const dir = resolve(destinationDir ?? this.defaultDest);
    if (!existsSync(dir)) return [];
    const entries = readdirSync(dir)
      .filter((n) => n.toLowerCase().endsWith('.zip'))
      .map((n) => {
        const full = join(dir, n);
        const st = statSync(full);
        return {
          zipPath: full,
          sizeBytes: st.size,
          createdAt: st.mtimeMs,
          label: this.labelFromName(n)
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return entries;
  }

  private runCompressArchive(source: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Argv-based — no shell interpolation. PowerShell 7 required.
      // -CompressionLevel Optimal matches Bruce's standard command.
      const args = [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Compress-Archive -Path $args[0] -DestinationPath $args[1] -CompressionLevel Optimal -Force`,
        source,
        zipPath
      ];
      const proc = spawn(this.psPath, args, { shell: false, windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      const timer = setTimeout(() => { proc.kill(); reject(new Error(`Compress-Archive timed out after ${this.timeoutMs}ms`)); }, this.timeoutMs);
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Compress-Archive exit ${code}: ${stderr.slice(0, 500)}`));
      });
    });
  }

  private timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  private labelFromName(name: string): string | null {
    // Best-effort: strip trailing _YYYYMMDD_HHMMSS.zip and leading source name
    const m = name.match(/^(.+?)_(\d{8}_\d{6})\.zip$/);
    if (!m) return null;
    const body = m[1] ?? '';
    const parts = body.split('_');
    return parts.length >= 2 ? parts.slice(1).join('_') : null;
  }
}
```

### Test: `backup-service.spec.ts`

**Path:** `src/main/services/backup-service.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupService } from './backup-service';

describe('BackupService', () => {
  let tmpRoot: string;
  let sourceDir: string;
  let destDir: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-bkp-'));
    sourceDir = join(tmpRoot, 'src-fixture');
    destDir = join(tmpRoot, 'backups');
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(sourceDir, 'a.txt'), 'hello');
    writeFileSync(join(sourceDir, 'b.txt'), 'world');
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates a zip for a directory source', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: sourceDir, label: 'unit-test' });
    expect(result.success).toBe(true);
    expect(existsSync(result.zipPath)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.label).toBe('unit-test');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('sanitizes unsafe label characters', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: sourceDir, label: 'bad/name; $(whoami)' });
    expect(result.success).toBe(true);
    expect(result.zipPath).not.toContain(';');
    expect(result.zipPath).not.toContain('$');
    expect(result.zipPath).not.toContain('/');
  });

  it('reports error for non-existent source', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    const result = await svc.createBackup({ sourcePath: join(tmpRoot, 'missing') });
    expect(result.success).toBe(false);
    expect(result.error).toBe('source not found');
  });

  it('lists recent backups in reverse chronological order', async () => {
    const svc = new BackupService({ defaultDestination: destDir });
    await svc.createBackup({ sourcePath: sourceDir, label: 'first' });
    await new Promise((r) => setTimeout(r, 1100)); // ensure timestamp difference
    await svc.createBackup({ sourcePath: sourceDir, label: 'second' });

    const log = svc.listRecent(10);
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[0]!.createdAt).toBeGreaterThanOrEqual(log[1]!.createdAt);
  });

  it('creates destination directory if missing', async () => {
    const svc = new BackupService();
    const nested = join(tmpRoot, 'deep', 'nest', 'backups');
    const result = await svc.createBackup({
      sourcePath: sourceDir,
      destinationDir: nested,
      label: 'nested'
    });
    expect(result.success).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });
});
```

**Note:** These tests require `pwsh.exe` on PATH. If CI ever runs them outside Windows, they'll fail — that's acceptable for a Windows-only dashboard.

---

## 3. Service: `process-runner.ts`

**Path:** `src/main/services/process-runner.ts`

A typed spawner with streaming output. Used by Claude bridge, pnpm runs, and future tool invocations. Every process is tracked, killable, and produces a `ProcessChunk` event stream.

```typescript
import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import type { ProcessHandle, ProcessChunk, ProcessStatus } from '@shared/types';

export interface ProcessSpec {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

interface Tracked {
  handle: ProcessHandle;
  proc: ChildProcess;
  timeoutTimer: NodeJS.Timeout | null;
}

export class ProcessRunner extends EventEmitter {
  private tracked = new Map<string, Tracked>();

  spawn(spec: ProcessSpec): ProcessHandle {
    const id = randomUUID();
    const proc = spawn(spec.command, [...spec.args], {
      cwd: spec.cwd,
      env: { ...process.env, ...(spec.env ?? {}) },
      shell: false,
      windowsHide: true
    });

    const handle: ProcessHandle = {
      id,
      command: spec.command,
      args: spec.args,
      cwd: spec.cwd,
      pid: proc.pid ?? null,
      status: 'running',
      startedAt: Date.now(),
      exitCode: null
    };

    const timeoutTimer = spec.timeoutMs
      ? setTimeout(() => this.kill(id, 'SIGTERM'), spec.timeoutMs)
      : null;

    const tracked: Tracked = { handle, proc, timeoutTimer };
    this.tracked.set(id, tracked);

    if (proc.stdout) {
      const rl = createInterface({ input: proc.stdout });
      rl.on('line', (line) => this.emitChunk(id, 'stdout', line));
    }
    if (proc.stderr) {
      const rl = createInterface({ input: proc.stderr });
      rl.on('line', (line) => this.emitChunk(id, 'stderr', line));
    }

    proc.on('error', (err) => {
      this.updateStatus(id, 'error', null);
      this.emit('error', { processId: id, error: err.message });
    });

    proc.on('close', (code) => {
      const status: ProcessStatus = code === 0 ? 'exited' : handle.status === 'killed' ? 'killed' : 'exited';
      this.updateStatus(id, status, code);
      if (tracked.timeoutTimer) clearTimeout(tracked.timeoutTimer);
      this.emit('exit', { ...this.tracked.get(id)!.handle });
    });

    return { ...handle };
  }

  kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const t = this.tracked.get(id);
    if (!t || t.handle.status !== 'running') return false;
    t.handle.status = 'killed';
    return t.proc.kill(signal);
  }

  get(id: string): ProcessHandle | null {
    const t = this.tracked.get(id);
    return t ? { ...t.handle } : null;
  }

  list(): ProcessHandle[] {
    return Array.from(this.tracked.values()).map((t) => ({ ...t.handle }));
  }

  async waitFor(id: string, timeoutMs = 30_000): Promise<ProcessHandle> {
    const existing = this.tracked.get(id);
    if (!existing) throw new Error(`unknown process ${id}`);
    if (existing.handle.status !== 'running') return { ...existing.handle };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('waitFor timeout')), timeoutMs);
      this.on('exit', function onExit(h: ProcessHandle) {
        if (h.id === id) {
          clearTimeout(timer);
          resolve(h);
        }
      });
    });
  }

  private updateStatus(id: string, status: ProcessStatus, exitCode: number | null): void {
    const t = this.tracked.get(id);
    if (!t) return;
    t.handle.status = status;
    t.handle.exitCode = exitCode;
    t.handle.exitedAt = Date.now();
  }

  private emitChunk(processId: string, stream: 'stdout' | 'stderr', data: string): void {
    const chunk: ProcessChunk = { processId, stream, data, timestamp: Date.now() };
    this.emit('chunk', chunk);
  }
}
```

### Test: `process-runner.spec.ts`

**Path:** `src/main/services/process-runner.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ProcessRunner } from './process-runner';
import type { ProcessChunk, ProcessHandle } from '@shared/types';

describe('ProcessRunner', () => {
  const node = process.execPath;

  it('captures stdout line-by-line', async () => {
    const runner = new ProcessRunner();
    const chunks: ProcessChunk[] = [];
    runner.on('chunk', (c: ProcessChunk) => chunks.push(c));

    const handle = runner.spawn({
      command: node,
      args: ['-e', 'console.log("line1"); console.log("line2");'],
      cwd: process.cwd()
    });

    const exited = await runner.waitFor(handle.id, 5_000);
    expect(exited.status).toBe('exited');
    expect(exited.exitCode).toBe(0);
    const stdout = chunks.filter((c) => c.stream === 'stdout').map((c) => c.data);
    expect(stdout).toContain('line1');
    expect(stdout).toContain('line2');
  });

  it('captures stderr separately from stdout', async () => {
    const runner = new ProcessRunner();
    const chunks: ProcessChunk[] = [];
    runner.on('chunk', (c: ProcessChunk) => chunks.push(c));

    const handle = runner.spawn({
      command: node,
      args: ['-e', 'console.error("oops"); process.exit(3);'],
      cwd: process.cwd()
    });
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(exited.exitCode).toBe(3);
    const stderr = chunks.filter((c) => c.stream === 'stderr').map((c) => c.data);
    expect(stderr.join('\n')).toContain('oops');
  });

  it('kills a running process', async () => {
    const runner = new ProcessRunner();
    const handle = runner.spawn({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      cwd: process.cwd()
    });
    expect(handle.status).toBe('running');
    expect(runner.kill(handle.id)).toBe(true);
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(['killed', 'exited']).toContain(exited.status);
  });

  it('enforces timeoutMs', async () => {
    const runner = new ProcessRunner();
    const handle = runner.spawn({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      cwd: process.cwd(),
      timeoutMs: 300
    });
    const exited = await runner.waitFor(handle.id, 5_000);
    expect(['killed', 'exited']).toContain(exited.status);
  });

  it('tracks multiple concurrent processes', async () => {
    const runner = new ProcessRunner();
    const h1 = runner.spawn({ command: node, args: ['-e', 'console.log(1);'], cwd: process.cwd() });
    const h2 = runner.spawn({ command: node, args: ['-e', 'console.log(2);'], cwd: process.cwd() });
    expect(runner.list()).toHaveLength(2);
    await runner.waitFor(h1.id, 5_000);
    await runner.waitFor(h2.id, 5_000);
    expect(runner.get(h1.id)?.status).toBe('exited');
    expect(runner.get(h2.id)?.status).toBe('exited');
  });
});
```

---

## 4. Service: `claude-bridge.ts`

**Path:** `src/main/services/claude-bridge.ts`

The promotion of the Chunk 1 probe into a production service. Spawns `claude.cmd` with `stream-json`, parses line-by-line, emits typed events. Session-resume aware.

```typescript
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { ProcessRunner } from './process-runner';
import type {
  ClaudeInvocation,
  ClaudeStreamEvent,
  ClaudeInvocationResult,
  ProcessChunk
} from '@shared/types';

export interface ClaudeBridgeOptions {
  claudeCommand?: string;       // default claude.cmd
  defaultTimeoutMs?: number;    // default 20 minutes
}

export class ClaudeBridge extends EventEmitter {
  private readonly cmd: string;
  private readonly defaultTimeoutMs: number;
  private readonly runner: ProcessRunner;

  constructor(opts: ClaudeBridgeOptions = {}, runner?: ProcessRunner) {
    super();
    this.cmd = opts.claudeCommand ?? 'claude.cmd';
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 20 * 60 * 1000;
    this.runner = runner ?? new ProcessRunner();
  }

  async invoke(inv: ClaudeInvocation): Promise<ClaudeInvocationResult> {
    const invocationId = randomUUID();
    const startedAt = Date.now();
    const args = this.buildArgs(inv);

    let sessionId: string | null = null;
    let resultText: string | null = null;
    let totalCostUsd: number | null = null;
    let numTurns: number | null = null;

    const handle = this.runner.spawn({
      command: this.cmd,
      args,
      cwd: inv.cwd,
      timeoutMs: inv.timeoutMs ?? this.defaultTimeoutMs
    });

    const onChunk = (chunk: ProcessChunk) => {
      if (chunk.processId !== handle.id) return;
      if (chunk.stream !== 'stdout') {
        this.emit('stream', this.makeEvent(invocationId, 'error', 'stderr', { line: chunk.data }));
        return;
      }
      const line = chunk.data.trim();
      if (!line) return;
      try {
        const msg = JSON.parse(line) as {
          type?: string;
          subtype?: string;
          session_id?: string;
          result?: string;
          total_cost_usd?: number;
          num_turns?: number;
        };
        if (msg.session_id && !sessionId) sessionId = msg.session_id;
        if (msg.type === 'result') {
          if (typeof msg.result === 'string') resultText = msg.result;
          if (typeof msg.total_cost_usd === 'number') totalCostUsd = msg.total_cost_usd;
          if (typeof msg.num_turns === 'number') numTurns = msg.num_turns;
        }
        const type = (msg.type ?? 'raw') as ClaudeStreamEvent['type'];
        this.emit('stream', this.makeEvent(invocationId, type, msg.subtype, msg));
      } catch {
        this.emit('stream', this.makeEvent(invocationId, 'raw', undefined, { line }));
      }
    };

    this.runner.on('chunk', onChunk);
    try {
      const exited = await this.runner.waitFor(handle.id, (inv.timeoutMs ?? this.defaultTimeoutMs) + 5_000);
      const durationMs = Date.now() - startedAt;
      return {
        invocationId,
        sessionId,
        success: exited.exitCode === 0,
        exitCode: exited.exitCode,
        resultText,
        durationMs,
        totalCostUsd,
        numTurns,
        error: exited.exitCode === 0 ? undefined : `exit ${exited.exitCode}`
      };
    } finally {
      this.runner.off('chunk', onChunk);
    }
  }

  private buildArgs(inv: ClaudeInvocation): string[] {
    const args: string[] = [
      '-p', inv.prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--allowedTools', inv.allowedTools.join(',')
    ];
    if (inv.resumeSessionId) args.push('--resume', inv.resumeSessionId);
    if (inv.appendSystemPrompt) args.push('--append-system-prompt', inv.appendSystemPrompt);
    if (inv.permissionMode) args.push('--permission-mode', inv.permissionMode);
    return args;
  }

  private makeEvent(
    invocationId: string,
    type: ClaudeStreamEvent['type'],
    subtype: string | undefined,
    payload: unknown
  ): ClaudeStreamEvent {
    return { invocationId, type, subtype, payload, timestamp: Date.now() };
  }
}
```

### Test: `claude-bridge.spec.ts`

**Path:** `src/main/services/claude-bridge.spec.ts`

Uses a node-based mock instead of real `claude.cmd` so tests run without API keys and without cost.

```typescript
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClaudeBridge } from './claude-bridge';
import type { ClaudeStreamEvent } from '@shared/types';

describe('ClaudeBridge', () => {
  const makeMockClaude = (tmpRoot: string, lines: string[]): string => {
    const mockPath = join(tmpRoot, 'mock-claude.cjs');
    const body = `
      const out = ${JSON.stringify(lines)};
      for (const l of out) { process.stdout.write(l + "\\n"); }
      process.exit(0);
    `;
    writeFileSync(mockPath, body);
    return mockPath;
  };

  it('parses stream-json and extracts session id, result, cost', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const lines = [
        JSON.stringify({ type: 'system', subtype: 'init', session_id: 'abc-123' }),
        JSON.stringify({ type: 'assistant', message: { content: 'thinking...' } }),
        JSON.stringify({
          type: 'result',
          subtype: 'success',
          session_id: 'abc-123',
          result: 'Task complete.',
          total_cost_usd: 0.0142,
          num_turns: 3,
          is_error: false
        })
      ];
      const mockPath = makeMockClaude(tmpRoot, lines);

      const bridge = new ClaudeBridge({ claudeCommand: process.execPath });
      const events: ClaudeStreamEvent[] = [];
      bridge.on('stream', (e: ClaudeStreamEvent) => events.push(e));

      // Override buildArgs via subclass so the mock gets the right argv
      class TestBridge extends ClaudeBridge {
        // @ts-expect-error override private
        protected buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      tb.on('stream', (e: ClaudeStreamEvent) => events.push(e));

      const result = await tb.invoke({
        prompt: 'test',
        cwd: tmpRoot,
        allowedTools: ['Read']
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('abc-123');
      expect(result.resultText).toBe('Task complete.');
      expect(result.totalCostUsd).toBeCloseTo(0.0142);
      expect(result.numTurns).toBe(3);
      expect(events.some((e) => e.type === 'system')).toBe(true);
      expect(events.some((e) => e.type === 'result')).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('emits raw event for un-parseable output', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const lines = ['not-json-at-all', '{"type":"result","result":"ok"}'];
      const mockPath = join(tmpRoot, 'mock.cjs');
      writeFileSync(
        mockPath,
        `const out=${JSON.stringify(lines)};for(const l of out){process.stdout.write(l+"\\n");}process.exit(0);`
      );

      class TestBridge extends ClaudeBridge {
        // @ts-expect-error override private
        protected buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      const events: ClaudeStreamEvent[] = [];
      tb.on('stream', (e: ClaudeStreamEvent) => events.push(e));

      await tb.invoke({ prompt: 't', cwd: tmpRoot, allowedTools: ['Read'] });
      expect(events.some((e) => e.type === 'raw')).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('reports failure on non-zero exit', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-'));
    try {
      const mockPath = join(tmpRoot, 'fail.cjs');
      writeFileSync(mockPath, `process.stderr.write("boom");process.exit(2);`);
      class TestBridge extends ClaudeBridge {
        // @ts-expect-error override private
        protected buildArgs() { return [mockPath]; }
      }
      const tb = new TestBridge({ claudeCommand: process.execPath });
      const result = await tb.invoke({ prompt: 't', cwd: tmpRoot, allowedTools: ['Read'] });
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('constructs correct argv with resume and permission mode', async () => {
    // Reflection test on buildArgs to avoid spawning
    class Spy extends ClaudeBridge {
      // @ts-expect-error access protected
      public inspect(inv: Parameters<typeof this.invoke>[0]) { return this.buildArgs(inv); }
    }
    const s = new Spy();
    const args = s.inspect({
      prompt: 'do it',
      cwd: 'C:\\dev',
      allowedTools: ['Read', 'Edit', 'Bash'],
      resumeSessionId: 'sess-1',
      permissionMode: 'acceptEdits',
      appendSystemPrompt: 'be terse'
    });
    expect(args).toContain('-p');
    expect(args).toContain('do it');
    expect(args).toContain('stream-json');
    expect(args).toContain('Read,Edit,Bash');
    expect(args).toContain('--resume');
    expect(args).toContain('sess-1');
    expect(args).toContain('--permission-mode');
    expect(args).toContain('acceptEdits');
    expect(args).toContain('--append-system-prompt');
    expect(args).toContain('be terse');
  });
});
```

> **Change `buildArgs` visibility to `protected`** so tests can subclass and inspect/override it.

---

## 5. Service: `rag-client.ts`

**Path:** `src/main/services/rag-client.ts`

Client for your existing `mcp-rag-server` at `C:\dev\apps\mcp-rag-server`. Uses the MCP SDK's stdio transport. Graceful degradation if the server isn't reachable — returns `source: 'unavailable'` instead of throwing.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { RagSearchQuery, RagSearchResult, RagHit } from '@shared/types';

export interface RagClientOptions {
  command?: string;             // default node
  args?: string[];              // default to mcp-rag-server entry
  cwd?: string;
  connectTimeoutMs?: number;    // default 5s
  requestTimeoutMs?: number;    // default 15s
}

export class RagClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly opts: Required<Pick<RagClientOptions, 'command' | 'args' | 'connectTimeoutMs' | 'requestTimeoutMs'>> & { cwd?: string };
  private connected = false;

  constructor(opts: RagClientOptions = {}) {
    this.opts = {
      command: opts.command ?? 'node.exe',
      args: opts.args ?? ['C:\\dev\\apps\\mcp-rag-server\\dist\\index.js'],
      cwd: opts.cwd,
      connectTimeoutMs: opts.connectTimeoutMs ?? 5_000,
      requestTimeoutMs: opts.requestTimeoutMs ?? 15_000
    };
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;
    try {
      this.transport = new StdioClientTransport({
        command: this.opts.command,
        args: this.opts.args,
        cwd: this.opts.cwd
      });
      this.client = new Client({ name: 'command-center', version: '0.1.0' }, { capabilities: {} });
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('connect timeout')), this.opts.connectTimeoutMs)
      );
      await Promise.race([connectPromise, timeoutPromise]);
      this.connected = true;
      return true;
    } catch {
      await this.disconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try { await this.client?.close(); } catch {}
    try { await this.transport?.close(); } catch {}
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  async search(query: RagSearchQuery): Promise<RagSearchResult> {
    const start = Date.now();
    const baseline: Omit<RagSearchResult, 'source'> = {
      query: query.query,
      hits: [],
      latencyMs: 0
    };

    if (!this.connected) {
      const ok = await this.connect();
      if (!ok) {
        return { ...baseline, latencyMs: Date.now() - start, source: 'unavailable', error: 'rag server not reachable' };
      }
    }

    try {
      const response = await this.client!.callTool(
        { name: 'rag_search', arguments: { query: query.query, topK: query.topK ?? 8, filter: query.filter } },
        undefined,
        { timeout: this.opts.requestTimeoutMs }
      );
      const hits = this.parseHits(response);
      return { ...baseline, hits, latencyMs: Date.now() - start, source: 'mcp-rag-server' };
    } catch (err) {
      return { ...baseline, latencyMs: Date.now() - start, source: 'unavailable', error: (err as Error).message };
    }
  }

  private parseHits(response: unknown): RagHit[] {
    // Tolerant parser — mcp-rag-server response shape may evolve.
    // Expected content: array with text blocks, each containing JSON hits.
    const r = response as { content?: Array<{ type?: string; text?: string }> };
    if (!Array.isArray(r.content)) return [];
    for (const block of r.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        try {
          const parsed = JSON.parse(block.text) as { hits?: unknown[] };
          if (!Array.isArray(parsed.hits)) continue;
          return parsed.hits.map((h): RagHit => {
            const hit = h as Partial<RagHit>;
            return {
              score: typeof hit.score === 'number' ? hit.score : 0,
              path: typeof hit.path === 'string' ? hit.path : '',
              language: typeof hit.language === 'string' ? hit.language : null,
              snippet: typeof hit.snippet === 'string' ? hit.snippet : '',
              startLine: typeof hit.startLine === 'number' ? hit.startLine : null,
              endLine: typeof hit.endLine === 'number' ? hit.endLine : null
            };
          });
        } catch { /* fall through */ }
      }
    }
    return [];
  }
}
```

### Test: `rag-client.spec.ts`

**Path:** `src/main/services/rag-client.spec.ts`

Tests the graceful-degradation path and the parser without needing a live MCP server.

```typescript
import { describe, it, expect } from 'vitest';
import { RagClient } from './rag-client';

describe('RagClient', () => {
  it('returns source=unavailable when server is not reachable', async () => {
    const client = new RagClient({
      command: process.execPath,
      args: ['-e', 'process.exit(1);'], // immediate failure
      connectTimeoutMs: 2_000
    });
    const result = await client.search({ query: 'test' });
    expect(result.source).toBe('unavailable');
    expect(result.hits).toEqual([]);
    expect(result.error).toBeDefined();
    await client.disconnect();
  });

  it('times out connection attempts within budget', async () => {
    const client = new RagClient({
      command: process.execPath,
      args: ['-e', 'setInterval(()=>{},1000);'], // hangs without speaking MCP
      connectTimeoutMs: 500
    });
    const start = Date.now();
    const result = await client.search({ query: 'test' });
    const elapsed = Date.now() - start;
    expect(result.source).toBe('unavailable');
    expect(elapsed).toBeLessThan(2_000);
    await client.disconnect();
  });

  it('parseHits handles missing content gracefully', async () => {
    class Exposed extends RagClient {
      public parsePublic(r: unknown) {
        // @ts-expect-error access private
        return this.parseHits(r);
      }
    }
    const ex = new Exposed();
    expect(ex.parsePublic({})).toEqual([]);
    expect(ex.parsePublic({ content: [] })).toEqual([]);
    expect(ex.parsePublic({ content: [{ type: 'text', text: 'not json' }] })).toEqual([]);
  });

  it('parseHits extracts valid hit entries from JSON text block', async () => {
    class Exposed extends RagClient {
      public parsePublic(r: unknown) {
        // @ts-expect-error access private
        return this.parseHits(r);
      }
    }
    const ex = new Exposed();
    const response = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hits: [
              { score: 0.91, path: 'C:\\dev\\apps\\nova-agent\\src\\index.ts', language: 'typescript', snippet: 'export const x', startLine: 1, endLine: 3 },
              { score: 0.77, path: 'C:\\dev\\packages\\shared\\src\\util.ts', language: 'typescript', snippet: 'function y()', startLine: 10, endLine: 15 }
            ]
          })
        }
      ]
    };
    const hits = ex.parsePublic(response);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.score).toBe(0.91);
    expect(hits[0]?.path).toContain('nova-agent');
  });
});
```

---

## 6. Update the service barrel

**Path:** `src/main/services/index.ts`

Replace with:

```typescript
export { MonorepoWatcher } from './monorepo-watcher';
export type { MonorepoWatcherOptions } from './monorepo-watcher';

export { NxGraphService } from './nx-graph';
export type { NxGraphServiceOptions } from './nx-graph';

export { HealthProbe, DEFAULT_ENDPOINTS } from './health-probe';
export type { HealthProbeOptions, ServiceEndpoint } from './health-probe';

export { DbMetricsService, DEFAULT_DB_TARGETS } from './db-metrics';
export type { DbMetricsOptions, DbTarget } from './db-metrics';

export { BackupService } from './backup-service';
export type { BackupServiceOptions } from './backup-service';

export { ProcessRunner } from './process-runner';
export type { ProcessSpec } from './process-runner';

export { ClaudeBridge } from './claude-bridge';
export type { ClaudeBridgeOptions } from './claude-bridge';

export { RagClient } from './rag-client';
export type { RagClientOptions } from './rag-client';
```

---

## 7. Run the suite

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck ; pnpm run test
```

**Expected totals:**
```
 Test Files  8 passed (8)
      Tests  33 passed (33)
```

(16 from Chunk 2 + 5 backup + 5 process + 4 claude + 4 rag = 34. Expect 33-34 depending on how `waitFor` races resolve.)

---

## Acceptance criteria

1. `pnpm run typecheck` exits 0.
2. `pnpm run test` — all tests pass. No skips.
3. All four action services exist with matching `.spec.ts` files.
4. `backup-service` uses `pwsh.exe` with `-NoProfile -NonInteractive`, argv-only, no shell interpolation.
5. `process-runner` kills processes on timeout and never orphans a `setInterval`-based child.
6. `claude-bridge` `buildArgs` constructs the exact argv shape the headless docs specify.
7. `rag-client` returns `source: 'unavailable'` instead of throwing when the server is dead.
8. `src/main/services/index.ts` exports all eight services.
9. No service file exceeds 500 lines.

---

## Known flags to report if they trip

1. **`@modelcontextprotocol/sdk` subpath imports** — the SDK uses ESM subpath exports (`/client/index.js`, `/client/stdio.js`). If TS errors on resolution, the fix is either `"moduleResolution": "Bundler"` (already set in Chunk 1) or explicit import paths with `.js` extensions. If it still fails, report the exact TS error code.

2. **`pwsh.exe` not on PATH** — dashboard assumes PowerShell 7. If you're on Windows PowerShell 5.1 only, backup tests will hang or fail. Fix: `winget install Microsoft.PowerShell`.

3. **`callTool` signature drift** — the MCP SDK minor versions have shuffled the `callTool` signature. If `client.callTool(...)` errors on the options argument, drop the third argument and set the timeout via client init options instead.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk03-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Ping me with `chunk 3 complete` (plus any oddities) and I'll write Chunk 4 — IPC + preload + shell. That's where the services stop being libraries and start being the dashboard backend the renderer will talk to.
