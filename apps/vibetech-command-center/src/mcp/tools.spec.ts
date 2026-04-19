import { describe, it, expect, vi } from 'vitest';
import { registerTools } from './tools';
import type { ServiceContainer } from '../main/service-container';

function makeFakeContainer(): ServiceContainer {
  return {
    watcher: {} as ServiceContainer['watcher'],
    nxGraph: {
      getGraph: vi.fn().mockResolvedValue({
        projects: {
          'nova-agent':  { name: 'nova-agent',  type: 'app', root: 'apps/nova-agent',  tags: ['scope:ai'], implicitDependencies: [] },
          'shared-ui':   { name: 'shared-ui',   type: 'lib', root: 'packages/shared-ui', tags: [], implicitDependencies: [] }
        },
        dependencies: { 'nova-agent': [{ source: 'nova-agent', target: 'shared-ui', type: 'static' }], 'shared-ui': [] },
        generatedAt: Date.now()
      })
    } as unknown as ServiceContainer['nxGraph'],
    health: {
      probeAll: vi.fn().mockResolvedValue([
        { service: 'dashboard-ui', host: '127.0.0.1', port: 5180, reachable: true, latencyMs: 1, checkedAt: 1 }
      ]),
      probe: vi.fn()
    } as unknown as ServiceContainer['health'],
    dbMetrics: {
      collectAll: vi.fn().mockResolvedValue([
        { name: 'trading', path: 'D:\\databases\\trading.db', sizeBytes: 10_000_000, walSizeBytes: 1_000_000, pageCount: 100, pageSize: 4096, tables: [], journalMode: 'wal', lastCheckedAt: Date.now() },
        { name: 'bloated', path: 'D:\\databases\\bloated.db', sizeBytes: 600 * 1024 * 1024, walSizeBytes: 200 * 1024 * 1024, pageCount: 100, pageSize: 4096, tables: [], journalMode: 'wal', lastCheckedAt: Date.now() }
      ])
    } as unknown as ServiceContainer['dbMetrics'],
    backup: {
      createBackup: vi.fn().mockResolvedValue({ success: true, zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 1024, sourcePath: '.', label: 'unit', startedAt: 1, completedAt: 2, durationMs: 1 }),
      listRecent: vi.fn().mockReturnValue([{ zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 1024, createdAt: Date.now(), label: null }])
    } as unknown as ServiceContainer['backup'],
    runner: {
      list: vi.fn().mockReturnValue([
        { id: 'p1', command: 'node.exe', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null },
        { id: 'p2', command: 'node.exe', args: [], cwd: '.', pid: 2, status: 'exited', startedAt: 2, exitCode: 0 }
      ]),
      spawn: vi.fn(), kill: vi.fn()
    } as unknown as ServiceContainer['runner'],
    claude: {
      invoke: vi.fn().mockResolvedValue({ invocationId: 'inv', sessionId: 's1', success: true, exitCode: 0, resultText: 'ok', durationMs: 100, totalCostUsd: 0.01, numTurns: 1 })
    } as unknown as ServiceContainer['claude'],
    rag: {
      search: vi.fn().mockResolvedValue({ query: 'test', hits: [], latencyMs: 10, source: 'unavailable' })
    } as unknown as ServiceContainer['rag'],
    wsPort: 0
  };
}

describe('MCP tool registry', () => {
  it('registers at least 10 tools', () => {
    const tools = registerTools(makeFakeContainer());
    expect(tools.length).toBeGreaterThanOrEqual(10);
  });

  it('every tool has unique name, description, and valid schema', () => {
    const tools = registerTools(makeFakeContainer());
    const names = new Set<string>();
    for (const t of tools) {
      expect(t.name).toMatch(/^dashboard_[a-z_]+$/);
      expect(names.has(t.name)).toBe(false);
      names.add(t.name);
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe('object');
      expect(t.inputSchema.properties).toBeDefined();
    }
  });

  it('dashboard_list_apps filters out libs', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_apps')!;
    const result = await t.handler({}) as { count: number; apps: Array<{ name: string }> };
    expect(result.count).toBe(1);
    expect(result.apps[0]?.name).toBe('nova-agent');
  });

  it('dashboard_list_apps respects filter_tag', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_apps')!;
    const r1 = await t.handler({ filter_tag: 'scope:ai' }) as { count: number };
    expect(r1.count).toBe(1);
    const r2 = await t.handler({ filter_tag: 'scope:nothing' }) as { count: number };
    expect(r2.count).toBe(0);
  });

  it('dashboard_db_metrics flags bloated databases', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_db_metrics')!;
    const result = await t.handler({}) as Array<{ name: string; warnings: string[] }>;
    const bloated = result.find((d) => d.name === 'bloated');
    expect(bloated?.warnings).toContain('WAL_LARGE');
    expect(bloated?.warnings).toContain('SIZE_LARGE');
    const trading = result.find((d) => d.name === 'trading');
    expect(trading?.warnings).toHaveLength(0);
  });

  it('dashboard_stat_path reports missing paths', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_stat_path')!;
    const result = await t.handler({ path: 'C:\\does\\not\\exist\\anywhere\\xyz' }) as { exists: boolean };
    expect(result.exists).toBe(false);
  });

  it('dashboard_invoke_claude rejects non-app names', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_invoke_claude')!;
    await expect(t.handler({ app_name: 'shared-ui', prompt: 'hi' })).rejects.toThrow(/not an app/);
  });

  it('dashboard_invoke_claude passes correct cwd for valid app', async () => {
    const c = makeFakeContainer();
    const tools = registerTools(c);
    const t = tools.find((x) => x.name === 'dashboard_invoke_claude')!;
    await t.handler({ app_name: 'nova-agent', prompt: 'review' });
    expect(c.claude.invoke).toHaveBeenCalledWith(expect.objectContaining({
      cwd: 'C:\\dev\\apps\\nova-agent',
      allowedTools: ['Read', 'Glob', 'Grep'],
      permissionMode: 'plan'
    }));
  });

  it('dashboard_list_processes filters by status', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_list_processes')!;
    const running = await t.handler({ status: 'running' }) as { count: number };
    expect(running.count).toBe(1);
    const exited = await t.handler({ status: 'exited' }) as { count: number };
    expect(exited.count).toBe(1);
    const all = await t.handler({}) as { count: number };
    expect(all.count).toBe(2);
  });

  it('dashboard_overview aggregates without throwing on partial failures', async () => {
    const c = makeFakeContainer();
    (c.nxGraph.getGraph as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('nx down'));
    const tools = registerTools(c);
    const t = tools.find((x) => x.name === 'dashboard_overview')!;
    const result = await t.handler({}) as { monorepo: { apps_count: number } };
    expect(result).toBeDefined();
    expect(result.monorepo.apps_count).toBe(0);
  });

  it('dashboard_overview flags bloated DBs in alerts', async () => {
    const tools = registerTools(makeFakeContainer());
    const t = tools.find((x) => x.name === 'dashboard_overview')!;
    const result = await t.handler({}) as { databases: { alerts: Array<{ name: string }> } };
    expect(result.databases.alerts.some((a) => a.name === 'bloated')).toBe(true);
  });
});
