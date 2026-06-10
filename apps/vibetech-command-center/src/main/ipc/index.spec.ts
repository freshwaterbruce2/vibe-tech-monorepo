import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers = new Map<string, (evt: unknown, ...args: unknown[]) => Promise<unknown>>();
const listeners = new Map<string, (evt: unknown, ...args: unknown[]) => void>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, h: (evt: unknown, ...args: unknown[]) => Promise<unknown>) => { handlers.set(ch, h); }),
    removeHandler: vi.fn((ch: string) => { handlers.delete(ch); }),
    on: vi.fn((ch: string, l: (evt: unknown, ...args: unknown[]) => void) => { listeners.set(ch, l); }),
    removeAllListeners: vi.fn((ch: string) => { listeners.delete(ch); })
  }
}));

import { registerIpcHandlers, unregisterIpcHandlers } from './index';
import { IPC_CHANNELS } from '@shared/types';
import type { ServiceContainer } from '../service-container';

function makeFakeContainer(): ServiceContainer {
  return {
    watcher: {} as ServiceContainer['watcher'],
    nxGraph: {
      getGraph: vi.fn().mockResolvedValue({ projects: {}, dependencies: {}, generatedAt: 1 })
    } as unknown as ServiceContainer['nxGraph'],
    nxAffected: {
      getAffected: vi.fn().mockResolvedValue({ base: 'origin/main', head: 'HEAD', projects: [], generatedAt: 1 }),
      refresh: vi.fn().mockResolvedValue({ base: 'origin/main', head: 'HEAD', projects: [], generatedAt: 1 })
    } as unknown as ServiceContainer['nxAffected'],
    health: {
      probeAll: vi.fn().mockResolvedValue([]),
      probe: vi.fn().mockResolvedValue({ service: 'dashboard-ui', host: '127.0.0.1', port: 5180, reachable: false, latencyMs: null, checkedAt: 1 })
    } as unknown as ServiceContainer['health'],
    dbMetrics: {
      collectAll: vi.fn().mockResolvedValue([])
    } as unknown as ServiceContainer['dbMetrics'],
    backup: {
      createBackup: vi.fn().mockResolvedValue({ success: true, zipPath: 'x.zip', sizeBytes: 1, sourcePath: 'x', label: null, startedAt: 1, completedAt: 2, durationMs: 1 }),
      listRecent: vi.fn().mockReturnValue([])
    } as unknown as ServiceContainer['backup'],
    runner: {
      spawn: vi.fn().mockReturnValue({ id: 'x', command: 'y', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null }),
      kill: vi.fn().mockReturnValue(true),
      list: vi.fn().mockReturnValue([])
    } as unknown as ServiceContainer['runner'],
    claude: {
      invoke: vi.fn().mockResolvedValue({ invocationId: 'i', sessionId: null, success: true, exitCode: 0, resultText: 'ok', durationMs: 1, totalCostUsd: null, numTurns: null })
    } as unknown as ServiceContainer['claude'],
    rag: {
      search: vi.fn().mockResolvedValue({ query: 't', hits: [], latencyMs: 1, source: 'unavailable' })
    } as unknown as ServiceContainer['rag'],
    dbExplorer: {
      listDatabases: vi.fn().mockResolvedValue([]),
      getSchema: vi.fn().mockResolvedValue([]),
      runQuery: vi.fn().mockResolvedValue({ columns: [], rows: [], rowCount: 0, truncated: false, executionMs: 0 })
    } as unknown as ServiceContainer['dbExplorer'],
    agent: {
      probeMcpServers: vi.fn().mockResolvedValue([]),
      runTask: vi.fn().mockResolvedValue({ id: 'a1', command: 'pnpm', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null }),
      listTasks: vi.fn().mockReturnValue([]),
      searchLogs: vi.fn().mockReturnValue([])
    } as unknown as ServiceContainer['agent'],
    memory: {
      getSnapshot: vi.fn().mockResolvedValue({
        stats: [],
        recentEpisodic: [],
        recentSemantic: [],
        recentProcedural: [],
        decayItems: [],
        consolidationStatus: { lastRunAt: null, itemsSummarized: 0, itemsPruned: 0 },
        generatedAt: Date.now()
      }),
      search: vi.fn().mockResolvedValue([]),
      computeDecay: vi.fn().mockResolvedValue([]),
      triggerConsolidation: vi.fn().mockResolvedValue({ success: false, message: 'read-only' })
    } as unknown as ServiceContainer['memory'],
    webmcp: {
      syncTools: vi.fn().mockReturnValue({ connected: true, toolCount: 1, lastSyncAt: 1, pendingExecutions: 0 }),
      listTools: vi.fn().mockReturnValue([]),
      getStatus: vi.fn().mockReturnValue({ connected: false, toolCount: 0, lastSyncAt: null, pendingExecutions: 0 }),
      executeTool: vi.fn().mockResolvedValue({ success: true }),
      handleExecuteResult: vi.fn()
    } as unknown as ServiceContainer['webmcp'],
    wsPort: 3210
  };
}

describe('IPC handlers', () => {
  beforeEach(() => { handlers.clear(); listeners.clear(); });

  it('registers all channels', () => {
    registerIpcHandlers(makeFakeContainer());
    for (const ch of Object.values(IPC_CHANNELS)) {
      // WEBMCP_EXECUTE_RESULT is a fire-and-forget reply path (ipcMain.on),
      // every other channel is a request/response handler (ipcMain.handle).
      if (ch === IPC_CHANNELS.WEBMCP_EXECUTE_RESULT) {
        expect(listeners.has(ch)).toBe(true);
      } else {
        expect(handlers.has(ch)).toBe(true);
      }
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
    const result = await h({}, {}) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid');
  });

  it('routes webmcp sync to the gateway with the sending webContents', async () => {
    const c = makeFakeContainer();
    registerIpcHandlers(c);
    const h = handlers.get(IPC_CHANNELS.WEBMCP_SYNC_TOOLS)!;
    const sender = { send: vi.fn(), isDestroyed: vi.fn(), once: vi.fn() };
    const tools = [{ name: 't', description: '', inputSchema: {}, type: 'imperative' }];
    const result = await h({ sender }, tools) as { ok: boolean; data?: unknown };
    expect(result.ok).toBe(true);
    expect(c.webmcp.syncTools).toHaveBeenCalledWith(tools, sender);
  });

  it('returns err envelope when webmcp execute fails', async () => {
    const c = makeFakeContainer();
    (c.webmcp.executeTool as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not connected'));
    registerIpcHandlers(c);
    const h = handlers.get(IPC_CHANNELS.WEBMCP_EXECUTE)!;
    const result = await h({}, 'tool', {}) as { ok: boolean; error?: string; code?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not connected');
    expect(result.code).toBe('WEBMCP_EXECUTE_FAILED');
  });

  it('forwards execute results from the renderer to the gateway', () => {
    const c = makeFakeContainer();
    registerIpcHandlers(c);
    const l = listeners.get(IPC_CHANNELS.WEBMCP_EXECUTE_RESULT)!;
    const res = { requestId: 'r1', ok: true, result: 42 };
    l({}, res);
    expect(c.webmcp.handleExecuteResult).toHaveBeenCalledWith(res);
  });

  it('unregisters all channels', () => {
    registerIpcHandlers(makeFakeContainer());
    expect(handlers.size).toBeGreaterThan(0);
    expect(listeners.size).toBeGreaterThan(0);
    unregisterIpcHandlers();
    expect(handlers.size).toBe(0);
    expect(listeners.size).toBe(0);
  });
});
