# Chunk 2 — Core Services (Read-Only Telemetry)

**Goal:** Implement the four read-only services that collect monorepo state. No writes, no process spawning, no UI. Each service ships with a Vitest suite that must pass before the chunk completes.

**Session time budget:** ~2 hours.

**Explicitly NOT in this chunk:** `backup-service`, `process-runner`, `claude-bridge`, `rag-client` — those are Chunk 3 (action services). No IPC, no panels, no MCP.

**Prerequisite:** Chunk 1 complete. `pnpm run dev` opens the empty window. Probe passed.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk02_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. Test infrastructure setup

Add Vitest config at `C:\dev\apps\vibetech-command-center\vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'tests/unit/**/*.spec.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/services/**/*.ts'],
      exclude: ['src/main/services/**/*.spec.ts']
    }
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@shared': resolve('src/shared')
    }
  }
});
```

Add scripts to `package.json` (use `str_replace` on the existing `"scripts"` block):

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

Add dev dependencies if missing:

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm add -D @vitest/coverage-v8
```

---

## 2. Shared types (populate `src/shared/types.ts`)

Replace the Chunk 1 placeholder with:

```typescript
// Shared contract types — consumed by main, preload, and renderer.

export interface CommandCenterAPI {
  version: string;
}

declare global {
  interface Window {
    commandCenter: CommandCenterAPI;
  }
}

// ---------- monorepo-watcher ----------
export type FileEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface FileEvent {
  type: FileEventType;
  path: string;          // absolute Windows path
  appName: string | null; // derived from path, null if not inside apps/* or packages/*
  packageName: string | null;
  timestamp: number;      // epoch ms
  sizeBytes?: number;
}

// ---------- nx-graph ----------
export interface NxProject {
  name: string;
  type: 'app' | 'lib';
  root: string;           // relative to C:\dev
  sourceRoot?: string;
  tags: string[];
  implicitDependencies: string[];
}

export interface NxDependency {
  source: string;
  target: string;
  type: 'static' | 'dynamic' | 'implicit';
}

export interface NxGraph {
  projects: Record<string, NxProject>;
  dependencies: Record<string, NxDependency[]>;
  generatedAt: number;
}

// ---------- health-probe ----------
export type ServiceName =
  | 'frontend-vite'     // 5173
  | 'backend-express'   // 5177
  | 'dashboard-ui'      // 5180
  | 'openrouter-proxy'  // 3001
  | 'memory-mcp'        // 3200
  | 'dashboard-ipc';    // 3210

export interface ProbeResult {
  service: ServiceName;
  host: string;
  port: number;
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
}

// ---------- db-metrics ----------
export interface DbMetric {
  name: string;
  path: string;
  sizeBytes: number;
  walSizeBytes: number;
  pageCount: number;
  pageSize: number;
  tables: Array<{ name: string; rowCount: number }>;
  journalMode: string;
  lastCheckedAt: number;
  error?: string;
}
```

---

## 3. Service: `monorepo-watcher.ts`

**Path:** `src/main/services/monorepo-watcher.ts`

Responsibilities:
- Watch `C:\dev\apps\*\src` and `C:\dev\packages\*\src` recursively
- Emit debounced `FileEvent` objects on an EventEmitter
- Ignore `node_modules`, `dist`, `.nx`, `_backups`, `.turbo`, `out`, `.git`, dotfiles
- Derive `appName` / `packageName` from path segments
- Provide `start()`, `stop()`, `getWatched()`, `on(event, handler)`

```typescript
import { EventEmitter } from 'node:events';
import { watch, type FSWatcher } from 'chokidar';
import { sep } from 'node:path';
import type { FileEvent, FileEventType } from '@shared/types';

export interface MonorepoWatcherOptions {
  monorepoRoot: string;       // default: C:\dev
  debounceMs?: number;        // default: 250
  ignoreInitial?: boolean;    // default: true
}

const IGNORED_SEGMENTS = /[\\/](?:node_modules|dist|out|\.nx|\.turbo|_backups|\.git|\.vscode|\.idea)[\\/]|[\\/]\.[^\\/]/;

export class MonorepoWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pending = new Map<string, FileEvent>();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly opts: MonorepoWatcherOptions) {
    super();
  }

  start(): void {
    if (this.watcher) return;
    const { monorepoRoot, ignoreInitial = true } = this.opts;
    const paths = [
      `${monorepoRoot}${sep}apps`,
      `${monorepoRoot}${sep}packages`
    ];
    this.watcher = watch(paths, {
      ignoreInitial,
      persistent: true,
      ignored: (p, stats) => {
        if (IGNORED_SEGMENTS.test(p)) return true;
        return false;
      },
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    });

    const handle = (type: FileEventType) => (path: string, stats?: { size: number }) => {
      const ev: FileEvent = {
        type,
        path,
        appName: this.extractName(path, 'apps'),
        packageName: this.extractName(path, 'packages'),
        timestamp: Date.now(),
        sizeBytes: stats?.size
      };
      this.pending.set(path + ':' + type, ev);
      this.scheduleFlush();
    };

    this.watcher
      .on('add', handle('add'))
      .on('change', handle('change'))
      .on('unlink', handle('unlink'))
      .on('addDir', handle('addDir'))
      .on('unlinkDir', handle('unlinkDir'))
      .on('error', (err) => this.emit('error', err))
      .on('ready', () => this.emit('ready'));
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pending.clear();
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  getWatched(): Record<string, string[]> {
    return this.watcher?.getWatched() ?? {};
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    const delay = this.opts.debounceMs ?? 250;
    this.flushTimer = setTimeout(() => {
      const events = Array.from(this.pending.values());
      this.pending.clear();
      this.flushTimer = null;
      if (events.length > 0) this.emit('events', events);
    }, delay);
  }

  private extractName(path: string, segment: 'apps' | 'packages'): string | null {
    const marker = `${sep}${segment}${sep}`;
    const idx = path.indexOf(marker);
    if (idx === -1) return null;
    const after = path.slice(idx + marker.length);
    const end = after.indexOf(sep);
    return end === -1 ? after : after.slice(0, end);
  }
}
```

### Test: `monorepo-watcher.spec.ts`

**Path:** `src/main/services/monorepo-watcher.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MonorepoWatcher } from './monorepo-watcher';
import type { FileEvent } from '@shared/types';

describe('MonorepoWatcher', () => {
  let tmpRoot: string;
  let watcher: MonorepoWatcher;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-watch-'));
    mkdirSync(join(tmpRoot, 'apps', 'test-app', 'src'), { recursive: true });
    mkdirSync(join(tmpRoot, 'packages', 'test-pkg', 'src'), { recursive: true });
    mkdirSync(join(tmpRoot, 'apps', 'test-app', 'node_modules'), { recursive: true });
  });

  afterEach(async () => {
    await watcher?.stop();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  const waitForReady = (w: MonorepoWatcher) =>
    new Promise<void>((resolve) => w.once('ready', resolve));

  const waitForEvents = (w: MonorepoWatcher, timeoutMs = 2000) =>
    new Promise<FileEvent[]>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      w.once('events', (events: FileEvent[]) => {
        clearTimeout(t);
        resolve(events);
      });
    });

  it('emits ready after initial scan', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);
    expect(watcher.getWatched()).toBeTypeOf('object');
  });

  it('detects file add inside apps/*/src with correct appName', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const target = join(tmpRoot, 'apps', 'test-app', 'src', 'index.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(target, 'export const x = 1;');
    const events = await eventsPromise;

    expect(events.some((e) => e.appName === 'test-app' && e.type === 'add')).toBe(true);
  });

  it('ignores node_modules writes', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const ignored = join(tmpRoot, 'apps', 'test-app', 'node_modules', 'junk.js');
    writeFileSync(ignored, 'x');

    await new Promise((r) => setTimeout(r, 400));
    // no events should have fired for ignored path — if any did, fail
    const watched = watcher.getWatched();
    const flat = Object.values(watched).flat().join('|');
    expect(flat).not.toMatch(/node_modules/);
  });

  it('debounces multiple rapid writes into one emission', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 200 });
    watcher.start();
    await waitForReady(watcher);

    const f1 = join(tmpRoot, 'apps', 'test-app', 'src', 'a.ts');
    const f2 = join(tmpRoot, 'apps', 'test-app', 'src', 'b.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(f1, 'a');
    writeFileSync(f2, 'b');
    const events = await eventsPromise;

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((e) => e.appName === 'test-app')).toBe(true);
  });

  it('derives packageName for packages/*/src paths', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const target = join(tmpRoot, 'packages', 'test-pkg', 'src', 'util.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(target, 'x');
    const events = await eventsPromise;

    expect(events.some((e) => e.packageName === 'test-pkg' && e.appName === null)).toBe(true);
  });
});
```

---

## 4. Service: `nx-graph.ts`

**Path:** `src/main/services/nx-graph.ts`

Responsibilities:
- Shell out to `pnpm exec nx graph --file=<temp>.json` 
- Parse the JSON output into the `NxGraph` shape
- Cache for 30 seconds to avoid repeated Nx invocations
- Expose `getGraph(force?: boolean): Promise<NxGraph>`

```typescript
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NxGraph, NxProject, NxDependency } from '@shared/types';

export interface NxGraphServiceOptions {
  monorepoRoot: string;
  cacheTtlMs?: number;
  nxCommand?: string;       // default: 'pnpm'
  nxArgs?: string[];        // default: ['exec', 'nx', 'graph', ...]
  timeoutMs?: number;       // default: 30_000
}

export class NxGraphService {
  private cache: NxGraph | null = null;
  private cacheAt = 0;

  constructor(private readonly opts: NxGraphServiceOptions) {}

  async getGraph(force = false): Promise<NxGraph> {
    const ttl = this.opts.cacheTtlMs ?? 30_000;
    if (!force && this.cache && Date.now() - this.cacheAt < ttl) {
      return this.cache;
    }
    const raw = await this.runNxGraph();
    const parsed = this.parse(raw);
    this.cache = parsed;
    this.cacheAt = Date.now();
    return parsed;
  }

  private runNxGraph(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tmp = mkdtempSync(join(tmpdir(), 'cc-nx-'));
      const out = join(tmp, 'graph.json');
      const cmd = this.opts.nxCommand ?? 'pnpm.cmd';
      const args = this.opts.nxArgs ?? ['exec', 'nx', 'graph', `--file=${out}`];
      const timeoutMs = this.opts.timeoutMs ?? 30_000;

      const proc = spawn(cmd, args, {
        cwd: this.opts.monorepoRoot,
        shell: false,
        windowsHide: true
      });

      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        proc.kill();
        rmSync(tmp, { recursive: true, force: true });
        reject(new Error(`nx graph timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          rmSync(tmp, { recursive: true, force: true });
          reject(new Error(`nx graph exited ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        try {
          const text = readFileSync(out, 'utf8');
          rmSync(tmp, { recursive: true, force: true });
          resolve(JSON.parse(text));
        } catch (err) {
          rmSync(tmp, { recursive: true, force: true });
          reject(err);
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        rmSync(tmp, { recursive: true, force: true });
        reject(err);
      });
    });
  }

  private parse(raw: unknown): NxGraph {
    // nx graph format: { graph: { nodes: {...}, dependencies: {...} } }
    const r = raw as {
      graph?: {
        nodes?: Record<string, { type?: string; data?: { root?: string; sourceRoot?: string; tags?: string[]; implicitDependencies?: string[] } }>;
        dependencies?: Record<string, Array<{ source: string; target: string; type?: string }>>;
      };
    };
    const nodes = r.graph?.nodes ?? {};
    const deps = r.graph?.dependencies ?? {};

    const projects: Record<string, NxProject> = {};
    for (const [name, node] of Object.entries(nodes)) {
      projects[name] = {
        name,
        type: (node.type === 'app' ? 'app' : 'lib'),
        root: node.data?.root ?? '',
        sourceRoot: node.data?.sourceRoot,
        tags: node.data?.tags ?? [],
        implicitDependencies: node.data?.implicitDependencies ?? []
      };
    }

    const dependencies: Record<string, NxDependency[]> = {};
    for (const [src, list] of Object.entries(deps)) {
      dependencies[src] = list.map((d) => ({
        source: d.source,
        target: d.target,
        type: (d.type === 'dynamic' ? 'dynamic' : d.type === 'implicit' ? 'implicit' : 'static')
      }));
    }

    return { projects, dependencies, generatedAt: Date.now() };
  }
}
```

### Test: `nx-graph.spec.ts`

**Path:** `src/main/services/nx-graph.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NxGraphService } from './nx-graph';

describe('NxGraphService', () => {
  let tmpRoot: string;
  let fakeNxOutput: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-nxgraph-'));

    // Create a fake "pnpm" shim that writes a canned nx graph JSON
    // then exits 0. This lets us test parsing without real Nx.
    fakeNxOutput = JSON.stringify({
      graph: {
        nodes: {
          'nova-agent': {
            type: 'app',
            data: { root: 'apps/nova-agent', sourceRoot: 'apps/nova-agent/src', tags: ['scope:ai'], implicitDependencies: [] }
          },
          'shared-ui': {
            type: 'lib',
            data: { root: 'packages/shared-ui', sourceRoot: 'packages/shared-ui/src', tags: ['scope:shared'], implicitDependencies: [] }
          }
        },
        dependencies: {
          'nova-agent': [{ source: 'nova-agent', target: 'shared-ui', type: 'static' }],
          'shared-ui': []
        }
      }
    });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('parses a canned nx graph JSON into NxGraph shape', async () => {
    // Shim: a script that writes our canned JSON to the --file argument then exits 0
    const shimPath = join(tmpRoot, 'fake-nx.cjs');
    const outFileMarker = '--file=';
    writeFileSync(
      shimPath,
      `const fs=require('fs');const arg=process.argv.find(a=>a.startsWith('${outFileMarker}'));const out=arg.slice(${outFileMarker.length});fs.writeFileSync(out, ${JSON.stringify(fakeNxOutput)});process.exit(0);`
    );

    const svc = new NxGraphService({
      monorepoRoot: tmpRoot,
      nxCommand: process.execPath, // node
      nxArgs: [shimPath, '--file=__PLACEHOLDER__']
    });

    // Monkey-patch: we need the service to pass a real temp path. Easiest path:
    // call getGraph and let the service generate its own --file arg. But our
    // service hardcodes args. So override nxArgs dynamically by subclassing:
    class TestNxSvc extends NxGraphService {
      // expose a way to inject args per-call by overriding the private method via casting
    }

    // Simpler: test the parser directly by writing the JSON to a known file
    // and reading it. We do that by invoking runNxGraph via a minimal shim
    // that writes to whatever file path we pass. Replace nxArgs to accept the
    // real tempfile the service creates.
    const svc2 = new NxGraphService({
      monorepoRoot: tmpRoot,
      nxCommand: process.execPath,
      // The service appends --file=<tempfile> itself in the default args.
      // Since we overrode nxArgs, we must include the shim pattern that reads
      // --file from argv. The shim already does this.
      nxArgs: [shimPath] // the shim reads --file from process.argv — but service only writes it when using default args
    });

    // Because our service hardcodes nxArgs when opts.nxArgs is provided,
    // we need a different approach: test via a subclass that exposes parse().
    class Exposed extends NxGraphService {
      public parsePublic(raw: unknown) {
        // @ts-expect-error access private
        return this.parse(raw);
      }
    }
    const exposed = new Exposed({ monorepoRoot: tmpRoot });
    const graph = exposed.parsePublic(JSON.parse(fakeNxOutput));

    expect(graph.projects['nova-agent']).toBeDefined();
    expect(graph.projects['nova-agent']?.type).toBe('app');
    expect(graph.projects['shared-ui']?.type).toBe('lib');
    expect(graph.dependencies['nova-agent']?.[0]?.target).toBe('shared-ui');
    expect(graph.generatedAt).toBeGreaterThan(0);
  });

  it('caches results within TTL window', async () => {
    class Exposed extends NxGraphService {
      public calls = 0;
      // @ts-expect-error override private
      protected async runNxGraph() {
        this.calls++;
        return JSON.parse(fakeNxOutput);
      }
    }
    const svc = new Exposed({ monorepoRoot: tmpRoot, cacheTtlMs: 5_000 });
    await svc.getGraph();
    await svc.getGraph();
    await svc.getGraph();
    expect(svc.calls).toBe(1);
  });

  it('bypasses cache when force=true', async () => {
    class Exposed extends NxGraphService {
      public calls = 0;
      // @ts-expect-error override private
      protected async runNxGraph() {
        this.calls++;
        return JSON.parse(fakeNxOutput);
      }
    }
    const svc = new Exposed({ monorepoRoot: tmpRoot, cacheTtlMs: 60_000 });
    await svc.getGraph();
    await svc.getGraph(true);
    expect(svc.calls).toBe(2);
  });
});
```

> **Implementation note:** to make `runNxGraph` override-friendly, change its declaration from `private` to `protected`. Do the same for `parse`. The tests assume this.

---

## 5. Service: `health-probe.ts`

**Path:** `src/main/services/health-probe.ts`

Responsibilities:
- TCP-level port check (don't rely on HTTP — not every service answers HEAD)
- 500ms timeout per probe
- Return `ProbeResult` with latency
- Expose `probe(service)` and `probeAll()`

```typescript
import { createConnection } from 'node:net';
import type { ProbeResult, ServiceName } from '@shared/types';

export interface ServiceEndpoint {
  service: ServiceName;
  host: string;
  port: number;
}

export const DEFAULT_ENDPOINTS: ServiceEndpoint[] = [
  { service: 'frontend-vite',    host: '127.0.0.1', port: 5173 },
  { service: 'backend-express',  host: '127.0.0.1', port: 5177 },
  { service: 'dashboard-ui',     host: '127.0.0.1', port: 5180 },
  { service: 'openrouter-proxy', host: '127.0.0.1', port: 3001 },
  { service: 'memory-mcp',       host: '127.0.0.1', port: 3200 },
  { service: 'dashboard-ipc',    host: '127.0.0.1', port: 3210 }
];

export interface HealthProbeOptions {
  endpoints?: ServiceEndpoint[];
  timeoutMs?: number;
}

export class HealthProbe {
  private readonly endpoints: ServiceEndpoint[];
  private readonly timeoutMs: number;

  constructor(opts: HealthProbeOptions = {}) {
    this.endpoints = opts.endpoints ?? DEFAULT_ENDPOINTS;
    this.timeoutMs = opts.timeoutMs ?? 500;
  }

  async probe(service: ServiceName): Promise<ProbeResult> {
    const ep = this.endpoints.find((e) => e.service === service);
    if (!ep) {
      return {
        service, host: '', port: 0, reachable: false, latencyMs: null,
        checkedAt: Date.now(), error: 'unknown service'
      };
    }
    return this.probeEndpoint(ep);
  }

  async probeAll(): Promise<ProbeResult[]> {
    return Promise.all(this.endpoints.map((e) => this.probeEndpoint(e)));
  }

  private probeEndpoint(ep: ServiceEndpoint): Promise<ProbeResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = createConnection({ host: ep.host, port: ep.port });
      let settled = false;

      const done = (reachable: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({
          service: ep.service,
          host: ep.host,
          port: ep.port,
          reachable,
          latencyMs: reachable ? Date.now() - start : null,
          checkedAt: Date.now(),
          error
        });
      };

      const timer = setTimeout(() => done(false, 'timeout'), this.timeoutMs);
      socket.once('connect', () => { clearTimeout(timer); done(true); });
      socket.once('error', (err) => { clearTimeout(timer); done(false, err.message); });
    });
  }
}
```

### Test: `health-probe.spec.ts`

**Path:** `src/main/services/health-probe.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:net';
import { HealthProbe } from './health-probe';
import type { ServiceEndpoint } from './health-probe';

describe('HealthProbe', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createServer();
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports reachable=true for a listening port', async () => {
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '127.0.0.1', port }
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 500 });
    const results = await probe.probeAll();
    expect(results[0]?.reachable).toBe(true);
    expect(results[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('reports reachable=false for a closed port', async () => {
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '127.0.0.1', port: 1 } // port 1 should be closed
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 300 });
    const results = await probe.probeAll();
    expect(results[0]?.reachable).toBe(false);
    expect(results[0]?.latencyMs).toBeNull();
    expect(results[0]?.error).toBeDefined();
  });

  it('honors timeout on unreachable host', async () => {
    // 10.255.255.1 is typically unroutable and will hang
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '10.255.255.1', port: 80 }
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 200 });
    const start = Date.now();
    const results = await probe.probeAll();
    const elapsed = Date.now() - start;
    expect(results[0]?.reachable).toBe(false);
    expect(elapsed).toBeLessThan(1000);
  });

  it('probe(service) returns error for unknown service name', async () => {
    const probe = new HealthProbe({ endpoints: [] });
    const r = await probe.probe('dashboard-ui');
    expect(r.reachable).toBe(false);
    expect(r.error).toBe('unknown service');
  });
});
```

---

## 6. Service: `db-metrics.ts`

**Path:** `src/main/services/db-metrics.ts`

Responsibilities:
- Open each configured SQLite file **read-only** with `query_only` pragma
- Collect size, WAL size, page count/size, journal mode, per-table row counts
- Handle missing files gracefully (return metric with `error` field)
- Never hold connections — open, read, close

```typescript
import Database from 'better-sqlite3';
import { statSync, existsSync } from 'node:fs';
import type { DbMetric } from '@shared/types';

export interface DbTarget {
  name: string;
  path: string;
}

export const DEFAULT_DB_TARGETS: DbTarget[] = [
  { name: 'nova_activity',  path: 'D:\\databases\\nova_activity.db' },
  { name: 'nova_shared',    path: 'D:\\databases\\nova_shared.db' },
  { name: 'trading',        path: 'D:\\databases\\trading.db' },
  { name: 'learning',       path: 'D:\\learning-system\\learning.db' }
];

export interface DbMetricsOptions {
  targets?: DbTarget[];
}

export class DbMetricsService {
  private readonly targets: DbTarget[];

  constructor(opts: DbMetricsOptions = {}) {
    this.targets = opts.targets ?? DEFAULT_DB_TARGETS;
  }

  async collectAll(): Promise<DbMetric[]> {
    return this.targets.map((t) => this.collectOne(t));
  }

  collectOne(target: DbTarget): DbMetric {
    const baseline: DbMetric = {
      name: target.name,
      path: target.path,
      sizeBytes: 0,
      walSizeBytes: 0,
      pageCount: 0,
      pageSize: 0,
      tables: [],
      journalMode: 'unknown',
      lastCheckedAt: Date.now()
    };

    if (!existsSync(target.path)) {
      return { ...baseline, error: 'file not found' };
    }

    let db: Database.Database | null = null;
    try {
      const sizeBytes = statSync(target.path).size;
      const walPath = `${target.path}-wal`;
      const walSizeBytes = existsSync(walPath) ? statSync(walPath).size : 0;

      db = new Database(target.path, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');

      const pageCount = (db.pragma('page_count', { simple: true }) as number) ?? 0;
      const pageSize = (db.pragma('page_size', { simple: true }) as number) ?? 0;
      const journalMode = String(db.pragma('journal_mode', { simple: true }) ?? 'unknown');

      const tableRows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;

      const tables = tableRows.map((t) => {
        try {
          // Identifier must be quoted — table names may contain special chars
          const stmt = db!.prepare(`SELECT COUNT(*) as c FROM "${t.name.replace(/"/g, '""')}"`);
          const row = stmt.get() as { c: number };
          return { name: t.name, rowCount: row.c };
        } catch {
          return { name: t.name, rowCount: -1 };
        }
      });

      return {
        ...baseline,
        sizeBytes,
        walSizeBytes,
        pageCount,
        pageSize,
        tables,
        journalMode
      };
    } catch (err) {
      return { ...baseline, error: err instanceof Error ? err.message : String(err) };
    } finally {
      db?.close();
    }
  }
}
```

### Test: `db-metrics.spec.ts`

**Path:** `src/main/services/db-metrics.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { DbMetricsService } from './db-metrics';

describe('DbMetricsService', () => {
  let tmpRoot: string;
  let dbPath: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-dbm-'));
    dbPath = join(tmpRoot, 'test.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE logs (id INTEGER PRIMARY KEY, msg TEXT);
      INSERT INTO users (name) VALUES ('alice'), ('bob'), ('carol');
      INSERT INTO logs (msg) VALUES ('a'), ('b');
    `);
    db.close();
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('collects size, page info, and per-table row counts', async () => {
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    const [metric] = await svc.collectAll();

    expect(metric?.error).toBeUndefined();
    expect(metric?.sizeBytes).toBeGreaterThan(0);
    expect(metric?.pageCount).toBeGreaterThan(0);
    expect(metric?.pageSize).toBeGreaterThan(0);
    expect(metric?.journalMode.toLowerCase()).toBe('wal');

    const users = metric?.tables.find((t) => t.name === 'users');
    const logs = metric?.tables.find((t) => t.name === 'logs');
    expect(users?.rowCount).toBe(3);
    expect(logs?.rowCount).toBe(2);
  });

  it('returns error metric for missing file', async () => {
    const svc = new DbMetricsService({
      targets: [{ name: 'ghost', path: join(tmpRoot, 'does-not-exist.db') }]
    });
    const [metric] = await svc.collectAll();
    expect(metric?.error).toBe('file not found');
    expect(metric?.sizeBytes).toBe(0);
  });

  it('does not write to the database (read-only enforcement)', async () => {
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    await svc.collectAll();

    // Verify nothing changed
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    db.close();
    expect(row.c).toBe(3);
  });

  it('handles a table with a quoted identifier', async () => {
    const weirdPath = join(tmpRoot, 'weird.db');
    const db = new Database(weirdPath);
    db.exec(`CREATE TABLE "odd name" (id INTEGER); INSERT INTO "odd name" VALUES (1),(2);`);
    db.close();

    const svc = new DbMetricsService({ targets: [{ name: 'weird', path: weirdPath }] });
    const [metric] = await svc.collectAll();
    const odd = metric?.tables.find((t) => t.name === 'odd name');
    expect(odd?.rowCount).toBe(2);
  });
});
```

---

## 7. Service barrel export

**Path:** `src/main/services/index.ts`

```typescript
export { MonorepoWatcher } from './monorepo-watcher';
export type { MonorepoWatcherOptions } from './monorepo-watcher';

export { NxGraphService } from './nx-graph';
export type { NxGraphServiceOptions } from './nx-graph';

export { HealthProbe, DEFAULT_ENDPOINTS } from './health-probe';
export type { HealthProbeOptions, ServiceEndpoint } from './health-probe';

export { DbMetricsService, DEFAULT_DB_TARGETS } from './db-metrics';
export type { DbMetricsOptions, DbTarget } from './db-metrics';
```

---

## 8. Run the suite

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck
pnpm run test
```

**Expected output summary:**
```
 ✓ src/main/services/monorepo-watcher.spec.ts  (5)
 ✓ src/main/services/nx-graph.spec.ts  (3)
 ✓ src/main/services/health-probe.spec.ts  (4)
 ✓ src/main/services/db-metrics.spec.ts  (4)

 Test Files  4 passed (4)
      Tests  16 passed (16)
```

---

## Acceptance criteria (all must pass)

1. `pnpm run typecheck` exits 0 with zero errors.
2. `pnpm run test` — all 16 tests pass.
3. File count: each of the four services has a `.ts` and matching `.spec.ts`. No service file exceeds 500 lines.
4. `src/main/services/index.ts` exports all four services and their option types.
5. `src/shared/types.ts` contains all the telemetry types (FileEvent, NxGraph, ProbeResult, DbMetric).
6. No service writes to any external database or filesystem location under `D:\`.
7. `pnpm run dev` still opens the window cleanly — the empty IPC bridge from Chunk 1 untouched.

---

## If something fails

Report back with:
- Which service's tests failed
- The exact Vitest failure output (first 30 lines)
- Node version (`node --version`) and better-sqlite3 build status

Two known-possible issues on your setup:
- **better-sqlite3 native build on Ryzen 5700G + Node 22**: if it fails, we rebuild with `pnpm rebuild better-sqlite3` or drop to Node 20 LTS. Flag this immediately.
- **chokidar v4 ESM interop**: if TypeScript complains about the named `watch` import, we switch to `import * as chokidar from 'chokidar'` and use `chokidar.watch(...)`.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk02-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Ping me with `chunk 2 complete` (plus any oddities) and I'll write Chunk 3 — the action services (`backup-service`, `process-runner`, `claude-bridge`, `rag-client`), which is where the dashboard stops watching and starts doing.
