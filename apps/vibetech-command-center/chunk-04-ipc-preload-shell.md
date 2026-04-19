# Chunk 4 — IPC Wiring, Preload Bridge, and Shell Integration

**Goal:** Wire the eight services into the Electron main process, expose them to the renderer through a typed IPC contract, and stand up a WebSocket sidecar for high-frequency streaming events. End state: the renderer can call any service from `window.commandCenter.*` with full TypeScript types.

**Session time budget:** ~1.5 hours.

**Explicitly NOT in this chunk:** panels (just a minimal test harness in App.tsx to prove the pipes work), MCP server exposure, packaging.

**Prerequisite:** Chunk 3 complete. All 34 service tests green.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk04_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. Architectural decisions

Two communication paths, deliberately separated:

**Request/response (IPC invoke)** — for one-shot operations. Call a service method, get a result. All typed. Examples: `nxGraph.get()`, `dbMetrics.collectAll()`, `backup.create(...)`, `claude.invoke(...)`.

**Streaming events (WebSocket on 3210)** — for high-frequency or long-running emissions. Examples: `MonorepoWatcher` file events (can be hundreds per second during `pnpm install`), `ClaudeBridge` stream-json events (dozens per minute during long sessions), process chunks.

Why not shove streams through Electron's native IPC? Three reasons:
1. `ipcMain.on` events fire on the main thread; a chatty file watcher can block it
2. WebSocket gives us backpressure semantics for free
3. Future: a second renderer window (or external tool like Claude Code invoking back) can subscribe to the same stream

Channel naming convention: `cc:<service>:<method>` for IPC, `cc.<service>.<event>` for WS topics.

---

## 2. Extend `src/shared/types.ts`

Append the IPC contract. Do not replace existing types.

```typescript
// ---------- IPC contract ----------

export interface IpcResponse<T> {
  ok: true;
  data: T;
  timestamp: number;
}
export interface IpcErrorResponse {
  ok: false;
  error: string;
  code?: string;
  timestamp: number;
}
export type IpcResult<T> = IpcResponse<T> | IpcErrorResponse;

// Channel name literals — single source of truth for channel strings
export const IPC_CHANNELS = {
  // nx-graph
  NX_GET: 'cc:nx:get',
  NX_REFRESH: 'cc:nx:refresh',
  // health
  HEALTH_PROBE_ALL: 'cc:health:probeAll',
  HEALTH_PROBE_ONE: 'cc:health:probeOne',
  // db
  DB_COLLECT_ALL: 'cc:db:collectAll',
  // backup
  BACKUP_CREATE: 'cc:backup:create',
  BACKUP_LIST: 'cc:backup:list',
  // process
  PROCESS_SPAWN: 'cc:process:spawn',
  PROCESS_KILL: 'cc:process:kill',
  PROCESS_LIST: 'cc:process:list',
  // claude
  CLAUDE_INVOKE: 'cc:claude:invoke',
  // rag
  RAG_SEARCH: 'cc:rag:search',
  // meta
  META_INFO: 'cc:meta:info',
  META_WS_PORT: 'cc:meta:wsPort'
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// Renderer-facing API surface — what window.commandCenter exposes
export interface CommandCenterAPI {
  version: string;

  nx: {
    get(force?: boolean): Promise<IpcResult<NxGraph>>;
    refresh(): Promise<IpcResult<NxGraph>>;
  };
  health: {
    probeAll(): Promise<IpcResult<ProbeResult[]>>;
    probeOne(service: ServiceName): Promise<IpcResult<ProbeResult>>;
  };
  db: {
    collectAll(): Promise<IpcResult<DbMetric[]>>;
  };
  backup: {
    create(req: BackupRequest): Promise<IpcResult<BackupResult>>;
    list(limit?: number): Promise<IpcResult<BackupLogEntry[]>>;
  };
  process: {
    spawn(spec: { command: string; args: string[]; cwd: string; timeoutMs?: number }): Promise<IpcResult<ProcessHandle>>;
    kill(id: string): Promise<IpcResult<boolean>>;
    list(): Promise<IpcResult<ProcessHandle[]>>;
  };
  claude: {
    invoke(inv: ClaudeInvocation): Promise<IpcResult<ClaudeInvocationResult>>;
  };
  rag: {
    search(query: RagSearchQuery): Promise<IpcResult<RagSearchResult>>;
  };
  meta: {
    info(): Promise<IpcResult<{ version: string; monorepoRoot: string; wsPort: number }>>;
  };

  // WebSocket helpers (renderer doesn't connect directly — the preload does)
  stream: {
    subscribe(topic: StreamTopic, handler: (payload: unknown) => void): () => void;
  };
}

export type StreamTopic =
  | 'cc.watcher.events'
  | 'cc.watcher.ready'
  | 'cc.watcher.error'
  | 'cc.claude.stream'
  | 'cc.process.chunk'
  | 'cc.process.exit';

export interface StreamMessage {
  topic: StreamTopic;
  payload: unknown;
  timestamp: number;
}

declare global {
  interface Window {
    commandCenter: CommandCenterAPI;
  }
}
```

> The `CommandCenterAPI` type replaces the Chunk 1 placeholder. Export it cleanly — the preload imports it.

---

## 3. Main process: service container

**Path:** `src/main/service-container.ts`

Single point of lifecycle control. Services are instantiated once at app start, shut down cleanly on quit.

```typescript
import {
  MonorepoWatcher,
  NxGraphService,
  HealthProbe,
  DbMetricsService,
  BackupService,
  ProcessRunner,
  ClaudeBridge,
  RagClient
} from './services';

export interface ServiceContainer {
  watcher: MonorepoWatcher;
  nxGraph: NxGraphService;
  health: HealthProbe;
  dbMetrics: DbMetricsService;
  backup: BackupService;
  runner: ProcessRunner;
  claude: ClaudeBridge;
  rag: RagClient;
  wsPort: number;
}

export interface ServiceContainerOptions {
  monorepoRoot: string;
  wsPort: number;
}

export function createServiceContainer(opts: ServiceContainerOptions): ServiceContainer {
  const runner = new ProcessRunner();
  const watcher = new MonorepoWatcher({ monorepoRoot: opts.monorepoRoot, debounceMs: 250 });
  const nxGraph = new NxGraphService({ monorepoRoot: opts.monorepoRoot });
  const health = new HealthProbe();
  const dbMetrics = new DbMetricsService();
  const backup = new BackupService();
  const claude = new ClaudeBridge({}, runner);
  const rag = new RagClient();

  return { watcher, nxGraph, health, dbMetrics, backup, runner, claude, rag, wsPort: opts.wsPort };
}

export async function disposeServiceContainer(c: ServiceContainer): Promise<void> {
  try { await c.watcher.stop(); } catch {}
  try { await c.rag.disconnect(); } catch {}
  // Kill any lingering processes
  for (const p of c.runner.list()) {
    if (p.status === 'running') c.runner.kill(p.id);
  }
}
```

---

## 4. Main process: WebSocket hub

**Path:** `src/main/ws-hub.ts`

Single-consumer WebSocket on `127.0.0.1:<wsPort>`. Broadcasts `StreamMessage` frames. Only one renderer connects; this is not a public server.

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import type { StreamTopic, StreamMessage } from '@shared/types';

export interface WsHubOptions {
  port: number;
  host?: string;          // default 127.0.0.1
}

export class WsHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private readonly port: number;
  private readonly host: string;

  constructor(opts: WsHubOptions) {
    this.port = opts.port;
    this.host = opts.host ?? '127.0.0.1';
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: this.host });
      this.wss.once('listening', () => resolve());
      this.wss.once('error', reject);
      this.wss.on('connection', (sock) => {
        this.clients.add(sock);
        sock.on('close', () => this.clients.delete(sock));
        sock.on('error', () => this.clients.delete(sock));
      });
    });
  }

  async stop(): Promise<void> {
    for (const c of this.clients) { try { c.close(); } catch {} }
    this.clients.clear();
    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
    this.wss = null;
  }

  broadcast(topic: StreamTopic, payload: unknown): void {
    if (this.clients.size === 0) return;
    const msg: StreamMessage = { topic, payload, timestamp: Date.now() };
    const json = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(json); } catch { /* ignore */ }
      }
    }
  }

  get clientCount(): number { return this.clients.size; }
}
```

---

## 5. Main process: IPC handlers

**Path:** `src/main/ipc/index.ts`

Replace the Chunk 1 placeholder. One registrar that wires every channel with consistent error envelopes.

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type {
  IpcResult, NxGraph, ProbeResult, DbMetric,
  BackupRequest, BackupResult, BackupLogEntry,
  ProcessHandle, ClaudeInvocation, ClaudeInvocationResult,
  RagSearchQuery, RagSearchResult, ServiceName
} from '@shared/types';
import type { ServiceContainer } from '../service-container';

const ok = <T>(data: T): IpcResult<T> => ({ ok: true, data, timestamp: Date.now() });
const err = (e: unknown, code?: string): IpcResult<never> => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
  code,
  timestamp: Date.now()
});

export function registerIpcHandlers(c: ServiceContainer): void {
  // --- nx-graph ---
  ipcMain.handle(IPC_CHANNELS.NX_GET, async (_evt, force?: boolean): Promise<IpcResult<NxGraph>> => {
    try { return ok(await c.nxGraph.getGraph(force === true)); }
    catch (e) { return err(e, 'NX_GET_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.NX_REFRESH, async (): Promise<IpcResult<NxGraph>> => {
    try { return ok(await c.nxGraph.getGraph(true)); }
    catch (e) { return err(e, 'NX_REFRESH_FAILED'); }
  });

  // --- health ---
  ipcMain.handle(IPC_CHANNELS.HEALTH_PROBE_ALL, async (): Promise<IpcResult<ProbeResult[]>> => {
    try { return ok(await c.health.probeAll()); }
    catch (e) { return err(e, 'HEALTH_PROBE_ALL_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.HEALTH_PROBE_ONE, async (_evt, service: ServiceName): Promise<IpcResult<ProbeResult>> => {
    try { return ok(await c.health.probe(service)); }
    catch (e) { return err(e, 'HEALTH_PROBE_ONE_FAILED'); }
  });

  // --- db ---
  ipcMain.handle(IPC_CHANNELS.DB_COLLECT_ALL, async (): Promise<IpcResult<DbMetric[]>> => {
    try { return ok(await c.dbMetrics.collectAll()); }
    catch (e) { return err(e, 'DB_COLLECT_FAILED'); }
  });

  // --- backup ---
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (_evt, req: BackupRequest): Promise<IpcResult<BackupResult>> => {
    try {
      if (!req || typeof req.sourcePath !== 'string') throw new Error('invalid backup request');
      return ok(await c.backup.createBackup(req));
    } catch (e) { return err(e, 'BACKUP_CREATE_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (_evt, limit?: number): Promise<IpcResult<BackupLogEntry[]>> => {
    try { return ok(c.backup.listRecent(limit ?? 20)); }
    catch (e) { return err(e, 'BACKUP_LIST_FAILED'); }
  });

  // --- process ---
  ipcMain.handle(IPC_CHANNELS.PROCESS_SPAWN, async (
    _evt, spec: { command: string; args: string[]; cwd: string; timeoutMs?: number }
  ): Promise<IpcResult<ProcessHandle>> => {
    try {
      if (!spec || typeof spec.command !== 'string' || !Array.isArray(spec.args)) {
        throw new Error('invalid process spec');
      }
      return ok(c.runner.spawn({ ...spec, args: spec.args }));
    } catch (e) { return err(e, 'PROCESS_SPAWN_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.PROCESS_KILL, async (_evt, id: string): Promise<IpcResult<boolean>> => {
    try { return ok(c.runner.kill(id)); }
    catch (e) { return err(e, 'PROCESS_KILL_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.PROCESS_LIST, async (): Promise<IpcResult<ProcessHandle[]>> => {
    try { return ok(c.runner.list()); }
    catch (e) { return err(e, 'PROCESS_LIST_FAILED'); }
  });

  // --- claude ---
  ipcMain.handle(IPC_CHANNELS.CLAUDE_INVOKE, async (_evt, inv: ClaudeInvocation): Promise<IpcResult<ClaudeInvocationResult>> => {
    try {
      if (!inv || typeof inv.prompt !== 'string' || typeof inv.cwd !== 'string') {
        throw new Error('invalid claude invocation');
      }
      return ok(await c.claude.invoke(inv));
    } catch (e) { return err(e, 'CLAUDE_INVOKE_FAILED'); }
  });

  // --- rag ---
  ipcMain.handle(IPC_CHANNELS.RAG_SEARCH, async (_evt, query: RagSearchQuery): Promise<IpcResult<RagSearchResult>> => {
    try {
      if (!query || typeof query.query !== 'string') throw new Error('invalid rag query');
      return ok(await c.rag.search(query));
    } catch (e) { return err(e, 'RAG_SEARCH_FAILED'); }
  });

  // --- meta ---
  ipcMain.handle(IPC_CHANNELS.META_INFO, async (): Promise<IpcResult<{ version: string; monorepoRoot: string; wsPort: number }>> => {
    try {
      return ok({ version: '0.1.0', monorepoRoot: 'C:\\dev', wsPort: c.wsPort });
    } catch (e) { return err(e, 'META_INFO_FAILED'); }
  });
}

export function unregisterIpcHandlers(): void {
  for (const ch of Object.values(IPC_CHANNELS)) ipcMain.removeHandler(ch);
}
```

---

## 6. Main process: stream wiring

**Path:** `src/main/stream-bridge.ts`

Connects service emitters to the WebSocket hub. Started once after services and WS are both up.

```typescript
import type { ServiceContainer } from './service-container';
import type { WsHub } from './ws-hub';
import type { FileEvent, ProcessChunk, ProcessHandle, ClaudeStreamEvent } from '@shared/types';

export function wireStreams(c: ServiceContainer, hub: WsHub): () => void {
  const onEvents = (events: FileEvent[]) => hub.broadcast('cc.watcher.events', events);
  const onReady = () => hub.broadcast('cc.watcher.ready', null);
  const onWatcherErr = (err: Error) => hub.broadcast('cc.watcher.error', { message: err.message });
  const onChunk = (chunk: ProcessChunk) => hub.broadcast('cc.process.chunk', chunk);
  const onExit = (handle: ProcessHandle) => hub.broadcast('cc.process.exit', handle);
  const onClaudeStream = (evt: ClaudeStreamEvent) => hub.broadcast('cc.claude.stream', evt);

  c.watcher.on('events', onEvents);
  c.watcher.on('ready', onReady);
  c.watcher.on('error', onWatcherErr);
  c.runner.on('chunk', onChunk);
  c.runner.on('exit', onExit);
  c.claude.on('stream', onClaudeStream);

  return () => {
    c.watcher.off('events', onEvents);
    c.watcher.off('ready', onReady);
    c.watcher.off('error', onWatcherErr);
    c.runner.off('chunk', onChunk);
    c.runner.off('exit', onExit);
    c.claude.off('stream', onClaudeStream);
  };
}
```

---

## 7. Main process: rewire `src/main/index.ts`

Replace the Chunk 1 stub:

```typescript
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { createServiceContainer, disposeServiceContainer, type ServiceContainer } from './service-container';
import { WsHub } from './ws-hub';
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc';
import { wireStreams } from './stream-bridge';

const isDev = !app.isPackaged;
const WS_PORT = 3210;
const MONOREPO_ROOT = 'C:\\dev';

let container: ServiceContainer | null = null;
let hub: WsHub | null = null;
let unwire: (() => void) | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Vibe-Tech Command Center',
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

async function bootstrap(): Promise<void> {
  container = createServiceContainer({ monorepoRoot: MONOREPO_ROOT, wsPort: WS_PORT });
  hub = new WsHub({ port: WS_PORT });
  await hub.start();
  unwire = wireStreams(container, hub);
  registerIpcHandlers(container);
  container.watcher.start();
}

async function shutdown(): Promise<void> {
  unregisterIpcHandlers();
  if (unwire) { unwire(); unwire = null; }
  if (hub) { await hub.stop(); hub = null; }
  if (container) { await disposeServiceContainer(container); container = null; }
}

app.whenReady().then(async () => {
  await bootstrap();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await shutdown();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (event) => {
  if (container || hub) {
    event.preventDefault();
    await shutdown();
    app.exit(0);
  }
});
```

---

## 8. Preload: the bridge

**Path:** `src/preload/index.ts`

Replace the Chunk 1 stub. This is the only file in the renderer-side boundary with Node access. Every renderer call goes through `ipcRenderer.invoke`. WebSocket client lives here too — the renderer subscribes through the preload, not directly.

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type StreamTopic, type StreamMessage, type CommandCenterAPI } from '@shared/types';

// WebSocket lifecycle — lazy connect on first subscribe, reconnect on drop
let ws: WebSocket | null = null;
let wsPort: number | null = null;
const subscribers = new Map<StreamTopic, Set<(payload: unknown) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureWs(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 2000);
      ws!.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    });
    return;
  }
  if (wsPort === null) {
    const info = await ipcRenderer.invoke(IPC_CHANNELS.META_INFO);
    if (info?.ok) wsPort = info.data.wsPort;
    else wsPort = 3210;
  }
  ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as StreamMessage;
      const handlers = subscribers.get(msg.topic);
      if (handlers) for (const h of handlers) {
        try { h(msg.payload); } catch { /* swallow */ }
      }
    } catch { /* ignore malformed */ }
  });
  ws.addEventListener('close', () => {
    ws = null;
    if (subscribers.size > 0 && !reconnectTimer) {
      reconnectTimer = setTimeout(() => { reconnectTimer = null; ensureWs().catch(() => {}); }, 1500);
    }
  });
  ws.addEventListener('error', () => { /* close will fire */ });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ws connect timeout')), 3000);
    ws!.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    ws!.addEventListener('error', () => { clearTimeout(t); reject(new Error('ws connect error')); }, { once: true });
  });
}

const api: CommandCenterAPI = {
  version: '0.1.0',

  nx: {
    get: (force) => ipcRenderer.invoke(IPC_CHANNELS.NX_GET, force),
    refresh: () => ipcRenderer.invoke(IPC_CHANNELS.NX_REFRESH)
  },
  health: {
    probeAll: () => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ALL),
    probeOne: (service) => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ONE, service)
  },
  db: {
    collectAll: () => ipcRenderer.invoke(IPC_CHANNELS.DB_COLLECT_ALL)
  },
  backup: {
    create: (req) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, req),
    list: (limit) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST, limit)
  },
  process: {
    spawn: (spec) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_SPAWN, spec),
    kill: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_KILL, id),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_LIST)
  },
  claude: {
    invoke: (inv) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_INVOKE, inv)
  },
  rag: {
    search: (q) => ipcRenderer.invoke(IPC_CHANNELS.RAG_SEARCH, q)
  },
  meta: {
    info: () => ipcRenderer.invoke(IPC_CHANNELS.META_INFO)
  },

  stream: {
    subscribe(topic, handler) {
      let set = subscribers.get(topic);
      if (!set) { set = new Set(); subscribers.set(topic, set); }
      set.add(handler);
      ensureWs().catch(() => { /* renderer receives nothing until reconnect */ });
      return () => {
        const s = subscribers.get(topic);
        if (!s) return;
        s.delete(handler);
        if (s.size === 0) subscribers.delete(topic);
      };
    }
  }
};

contextBridge.exposeInMainWorld('commandCenter', api);
```

---

## 9. Renderer: minimal smoke-test harness

Replace `src/renderer/App.tsx` with a single-page diagnostic UI that exercises every IPC path and the stream. This is throwaway UI — Chunks 5-6 rewrite it as real panels.

```typescript
import React, { useEffect, useState } from 'react';
import type { ProbeResult, DbMetric, FileEvent, NxGraph, BackupLogEntry } from '@shared/types';

interface SmokeState {
  meta: { version: string; monorepoRoot: string; wsPort: number } | null;
  health: ProbeResult[] | null;
  dbs: DbMetric[] | null;
  nx: NxGraph | null;
  backups: BackupLogEntry[] | null;
  fileEvents: FileEvent[];
  wsConnected: boolean;
  error: string | null;
}

const initial: SmokeState = {
  meta: null, health: null, dbs: null, nx: null, backups: null,
  fileEvents: [], wsConnected: false, error: null
};

export function App(): JSX.Element {
  const [state, setState] = useState<SmokeState>(initial);

  useEffect(() => {
    const cc = window.commandCenter;
    if (!cc) { setState((s) => ({ ...s, error: 'commandCenter bridge missing' })); return; }

    (async () => {
      try {
        const [meta, health, dbs, nx, backups] = await Promise.all([
          cc.meta.info(),
          cc.health.probeAll(),
          cc.db.collectAll(),
          cc.nx.get(),
          cc.backup.list(5)
        ]);
        setState((s) => ({
          ...s,
          meta: meta.ok ? meta.data : null,
          health: health.ok ? health.data : null,
          dbs: dbs.ok ? dbs.data : null,
          nx: nx.ok ? nx.data : null,
          backups: backups.ok ? backups.data : null,
          error: [meta, health, dbs, nx, backups].find((r) => !r.ok)
            ? [meta, health, dbs, nx, backups].filter((r) => !r.ok).map((r: { error?: string }) => r.error).join('; ')
            : null
        }));
      } catch (e) {
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
      }
    })();

    const unsubEvents = cc.stream.subscribe('cc.watcher.events', (payload) => {
      const events = payload as FileEvent[];
      setState((s) => ({ ...s, fileEvents: [...events.slice(-10), ...s.fileEvents].slice(0, 20), wsConnected: true }));
    });
    const unsubReady = cc.stream.subscribe('cc.watcher.ready', () => {
      setState((s) => ({ ...s, wsConnected: true }));
    });

    return () => { unsubEvents(); unsubReady(); };
  }, []);

  return (
    <div className="min-h-screen p-8 font-mono text-sm">
      <h1 className="text-3xl font-bold text-pulse-cyan mb-6" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
        Command Center — Chunk 4 Smoke Test
      </h1>

      {state.error && (
        <div className="mb-4 p-3 bg-red-950 text-red-300 rounded border border-red-800">
          Error: {state.error}
        </div>
      )}

      <Section title="meta">
        <pre className="text-slate-300">{JSON.stringify(state.meta, null, 2)}</pre>
      </Section>

      <Section title={`health (${state.health?.length ?? 0} endpoints)`}>
        <table className="w-full text-left">
          <thead className="text-slate-500"><tr><th>service</th><th>port</th><th>reachable</th><th>latency</th></tr></thead>
          <tbody>
            {(state.health ?? []).map((h) => (
              <tr key={h.service} className="border-t border-slate-800">
                <td>{h.service}</td><td>{h.port}</td>
                <td className={h.reachable ? 'text-emerald-400' : 'text-rose-400'}>{String(h.reachable)}</td>
                <td>{h.latencyMs ?? '-'}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`databases (${state.dbs?.length ?? 0})`}>
        <table className="w-full text-left">
          <thead className="text-slate-500"><tr><th>name</th><th>size</th><th>tables</th><th>journal</th><th>error</th></tr></thead>
          <tbody>
            {(state.dbs ?? []).map((d) => (
              <tr key={d.name} className="border-t border-slate-800">
                <td>{d.name}</td>
                <td>{(d.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                <td>{d.tables.length}</td>
                <td>{d.journalMode}</td>
                <td className="text-rose-400">{d.error ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`nx projects (${Object.keys(state.nx?.projects ?? {}).length})`}>
        <div className="text-slate-400">
          {Object.keys(state.nx?.projects ?? {}).slice(0, 12).join(', ')}
          {Object.keys(state.nx?.projects ?? {}).length > 12 ? '...' : ''}
        </div>
      </Section>

      <Section title={`recent backups (${state.backups?.length ?? 0})`}>
        <ul className="text-slate-400">
          {(state.backups ?? []).map((b) => (
            <li key={b.zipPath}>
              {new Date(b.createdAt).toLocaleString()} — {(b.sizeBytes / 1024 / 1024).toFixed(1)} MB — {b.label ?? '-'}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`file events stream (ws: ${state.wsConnected ? 'OK' : '—'})`}>
        <div className="text-xs text-slate-400 max-h-48 overflow-auto">
          {state.fileEvents.length === 0 ? (
            <em>edit any file in C:\dev\apps\* or C:\dev\packages\* to see events...</em>
          ) : state.fileEvents.map((e, i) => (
            <div key={i}>{new Date(e.timestamp).toLocaleTimeString()} {e.type} {e.appName ?? e.packageName ?? '?'} — {e.path}</div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <details open className="mb-4 border border-slate-800 rounded">
      <summary className="cursor-pointer p-3 bg-slate-900 text-pulse-cyan font-bold">{title}</summary>
      <div className="p-3 bg-slate-950">{children}</div>
    </details>
  );
}
```

---

## 10. Tests: IPC wiring

**Path:** `src/main/ipc/index.spec.ts`

Mocks Electron's `ipcMain` and verifies handlers register and produce correct envelope shapes.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers = new Map<string, (evt: unknown, ...args: unknown[]) => Promise<unknown>>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, h: (evt: unknown, ...args: unknown[]) => Promise<unknown>) => { handlers.set(ch, h); }),
    removeHandler: vi.fn((ch: string) => { handlers.delete(ch); })
  }
}));

import { registerIpcHandlers, unregisterIpcHandlers } from './index';
import { IPC_CHANNELS } from '@shared/types';
import type { ServiceContainer } from '../service-container';

function makeFakeContainer(): ServiceContainer {
  return {
    watcher: {} as ServiceContainer['watcher'],
    nxGraph: { getGraph: vi.fn().mockResolvedValue({ projects: {}, dependencies: {}, generatedAt: 1 }) } as unknown as ServiceContainer['nxGraph'],
    health: {
      probeAll: vi.fn().mockResolvedValue([]),
      probe: vi.fn().mockResolvedValue({ service: 'dashboard-ui', host: '127.0.0.1', port: 5180, reachable: false, latencyMs: null, checkedAt: 1 })
    } as unknown as ServiceContainer['health'],
    dbMetrics: { collectAll: vi.fn().mockResolvedValue([]) } as unknown as ServiceContainer['dbMetrics'],
    backup: {
      createBackup: vi.fn().mockResolvedValue({ success: true, zipPath: 'x.zip', sizeBytes: 1, sourcePath: 'x', label: null, startedAt: 1, completedAt: 2, durationMs: 1 }),
      listRecent: vi.fn().mockReturnValue([])
    } as unknown as ServiceContainer['backup'],
    runner: {
      spawn: vi.fn().mockReturnValue({ id: 'x', command: 'y', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null }),
      kill: vi.fn().mockReturnValue(true),
      list: vi.fn().mockReturnValue([])
    } as unknown as ServiceContainer['runner'],
    claude: { invoke: vi.fn().mockResolvedValue({ invocationId: 'i', sessionId: null, success: true, exitCode: 0, resultText: 'ok', durationMs: 1, totalCostUsd: null, numTurns: null }) } as unknown as ServiceContainer['claude'],
    rag: { search: vi.fn().mockResolvedValue({ query: 't', hits: [], latencyMs: 1, source: 'unavailable' }) } as unknown as ServiceContainer['rag'],
    wsPort: 3210
  };
}

describe('IPC handlers', () => {
  beforeEach(() => { handlers.clear(); });

  it('registers all channels', () => {
    registerIpcHandlers(makeFakeContainer());
    for (const ch of Object.values(IPC_CHANNELS)) {
      expect(handlers.has(ch)).toBe(true);
    }
  });

  it('returns ok envelope on success', async () => {
    registerIpcHandlers(makeFakeContainer());
    const h = handlers.get(IPC_CHANNELS.NX_GET)!;
    const result = await h({}) as { ok: boolean; data?: unknown };
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('returns err envelope when service throws', async () => {
    const c = makeFakeContainer();
    (c.nxGraph.getGraph as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    registerIpcHandlers(c);
    const h = handlers.get(IPC_CHANNELS.NX_GET)!;
    const result = await h({}) as { ok: boolean; error?: string; code?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
    expect(result.code).toBe('NX_GET_FAILED');
  });

  it('validates backup request payload', async () => {
    registerIpcHandlers(makeFakeContainer());
    const h = handlers.get(IPC_CHANNELS.BACKUP_CREATE)!;
    const result = await h({}, {} as object) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid');
  });

  it('unregisters all channels', () => {
    registerIpcHandlers(makeFakeContainer());
    expect(handlers.size).toBeGreaterThan(0);
    unregisterIpcHandlers();
    expect(handlers.size).toBe(0);
  });
});
```

---

## 11. Tests: WebSocket hub

**Path:** `src/main/ws-hub.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { WsHub } from './ws-hub';
import type { StreamMessage } from '@shared/types';

describe('WsHub', () => {
  let hub: WsHub;
  let port: number;

  beforeEach(async () => {
    // pick ephemeral port by listening on 0 then closing — simplest race-free way
    const probe = new (await import('ws')).WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((r) => probe.once('listening', () => r()));
    port = (probe.address() as { port: number }).port;
    probe.close();
    await new Promise((r) => setTimeout(r, 50));
    hub = new WsHub({ port });
    await hub.start();
  });

  afterEach(async () => { await hub.stop(); });

  it('accepts connections and broadcasts to all clients', async () => {
    const received: StreamMessage[] = [];
    const c1 = new WebSocket(`ws://127.0.0.1:${port}`);
    const c2 = new WebSocket(`ws://127.0.0.1:${port}`);
    await Promise.all([
      new Promise((r) => c1.once('open', r)),
      new Promise((r) => c2.once('open', r))
    ]);
    c1.on('message', (d) => received.push(JSON.parse(d.toString())));
    c2.on('message', (d) => received.push(JSON.parse(d.toString())));

    await new Promise((r) => setTimeout(r, 50));
    hub.broadcast('cc.watcher.ready', { hello: 'world' });
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toHaveLength(2);
    expect(received[0]?.topic).toBe('cc.watcher.ready');
    c1.close(); c2.close();
  });

  it('does not throw when no clients connected', () => {
    expect(() => hub.broadcast('cc.watcher.ready', null)).not.toThrow();
    expect(hub.clientCount).toBe(0);
  });

  it('tracks clientCount', async () => {
    const c = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((r) => c.once('open', r));
    await new Promise((r) => setTimeout(r, 50));
    expect(hub.clientCount).toBe(1);
    c.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(hub.clientCount).toBe(0);
  });
});
```

---

## 12. Run everything

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck
pnpm run test
pnpm run dev
```

**Test totals expected:**
```
 Test Files  10 passed (10)
      Tests  43+ passed
```

**Dev launch expected:**
- Electron window opens with the Chunk 4 smoke-test harness
- `meta` section shows version 0.1.0, monorepoRoot C:\dev, wsPort 3210
- `health` section shows 6 services (most will be `false` — that's fine, we haven't started them)
- `databases` section shows 4 rows (those with `error: file not found` for DBs not present on your machine are expected)
- `nx projects` section shows your ~28 apps + ~26 packages project names
- `recent backups` shows the zips created during Chunks 0-3
- **Manual check**: touch a file at `C:\dev\apps\nova-agent\src\anyfile.ts` → the file events stream section updates within 1 second

---

## Acceptance criteria

1. `pnpm run typecheck` exits 0.
2. `pnpm run test` — all tests pass, no skips.
3. `pnpm run dev` opens the smoke-test harness without console errors.
4. All 5 IPC sections populate within 5 seconds of window load.
5. Touching a file in `C:\dev\apps\*\src` causes a row to appear in the file events stream within 1 second.
6. Closing the window exits cleanly (check Task Manager — no orphaned `Electron.exe` or `node.exe` from Claude/RAG stubs).
7. No service file or main-process file exceeds 500 lines.

---

## Known hazards to flag

1. **WebSocket port conflict** — if something else holds 3210, WsHub.start() rejects. Dashboard won't launch. The ephemeral-port trick in the WsHub test avoids it there, but in production we hardcode 3210. Fast fix: change `WS_PORT` constant in `main/index.ts`.

2. **Preload WebSocket CSP** — Electron's default renderer CSP allows WebSocket connections to `localhost`. If you later tighten CSP, `ws://127.0.0.1:3210` needs to be in `connect-src`. Not an issue in Chunk 4, flagging for Chunk 8 packaging.

3. **nx graph on first load** — first call shells `pnpm exec nx graph` which can take 3-5 seconds on the Ryzen with a cold Nx cache. The smoke test parallelizes all 5 IPC calls, so the UI appears to freeze briefly during initial load. Acceptable — Chunk 5 will add skeleton loaders.

4. **context isolation + preload types** — the preload uses `contextBridge.exposeInMainWorld` which copies values, not references. Functions survive, but Node-only objects (Buffers, etc.) do not. Every return value across the boundary is JSON-serializable by design. Current types comply.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk04-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Ping me with `chunk 4 complete` (plus any oddities) and I'll write Chunk 5 — the first three real panels (AppsGrid, DbHealth, BackupLog) that replace the smoke-test harness with the actual dashboard UI. Zustand store, TanStack Query, Vibe-Tech brand tokens applied.
