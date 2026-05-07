import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { NxAffectedService } from './nx-affected';
import type { AffectedProject } from '@shared/types';

vi.mock('node:fs');
vi.mock('node:child_process');

function createMockSpawn() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  const proc = {
    stderr: { on: (evt: string, cb: (...args: unknown[]) => void) => { (handlers[`stderr:${evt}`] ??= []).push(cb); } },
    on: (evt: string, cb: (...args: unknown[]) => void) => { (handlers[evt] ??= []).push(cb); },
    kill: vi.fn()
  };
  const trigger = {
    close: (code: number | null) => handlers['close']?.forEach((cb) => cb(code)),
    error: (err: Error) => handlers['error']?.forEach((cb) => cb(err))
  };
  return { proc, trigger };
}

class ExposedService extends NxAffectedService {
  public setCacheTs(ts: number) { (this as unknown as { cacheTs: number }).cacheTs = ts; }
  public getCacheTs(): number { return (this as unknown as { cacheTs: number }).cacheTs; }
}

describe('NxAffectedService', () => {
  let affectedData: unknown;
  let fullData: unknown;
  let spawnTriggers: Array<{ close: (code: number | null) => void; error: (err: Error) => void }>;
  let missingPaths: Set<string>;
  let stalePaths: Set<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    spawnTriggers = [];
    missingPaths = new Set();
    stalePaths = new Set();

    affectedData = { graph: { nodes: {}, dependencies: {} } };
    fullData = { graph: { nodes: {}, dependencies: {} } };

    vi.mocked(mkdtempSync).mockImplementation((prefix: string) =>
      prefix.toString().includes('affected') ? '\\tmp\\cc-nx-affected-mock' : '\\tmp\\cc-nx-full-mock'
    );

    vi.mocked(readFileSync).mockImplementation((path: unknown) => {
      const p = String(path);
      if (p.includes('affected')) return JSON.stringify(affectedData);
      return JSON.stringify(fullData);
    });

    vi.mocked(rmSync).mockImplementation(() => {});

    vi.mocked(existsSync).mockImplementation((path: string | Buffer | URL) => {
      return !missingPaths.has(String(path));
    });

    vi.mocked(statSync).mockImplementation((path: string | Buffer | URL) => {
      const p = String(path);
      if (stalePaths.has(p)) {
        return { mtimeMs: Date.now() - 25 * 60 * 60 * 1000 } as ReturnType<typeof statSync>;
      }
      return { mtimeMs: Date.now() } as ReturnType<typeof statSync>;
    });

    vi.mocked(spawn).mockImplementation(() => {
      const { proc, trigger } = createMockSpawn();
      spawnTriggers.push(trigger);
      return proc as unknown as ReturnType<typeof spawn>;
    });
  });

  function flushSpawns(code = 0) {
    while (spawnTriggers.length) {
      const t = spawnTriggers.shift()!;
      t.close(code);
    }
  }

  function buildGraph(opts: {
    affected?: string[];
    nodes?: Record<string, {
      type?: string;
      data?: {
        root?: string;
        tags?: string[];
        targets?: Record<string, { outputs?: string[]; options?: { outputPath?: string } } | unknown>;
      };
    }>;
    deps?: Record<string, Array<{ source: string; target: string }>>;
  }) {
    const nodes = opts.nodes ?? {};
    const deps = opts.deps ?? {};
    const affectedNames = opts.affected ?? Object.keys(nodes);

    const affectedNodes: Record<string, unknown> = {};
    for (const n of affectedNames) affectedNodes[n] = nodes[n] ?? { type: 'lib', data: {} };

    affectedData = { graph: { nodes: affectedNodes, dependencies: {} } };
    fullData = { graph: { nodes, dependencies: deps } };
  }

  describe('cache behaviour', () => {
    it('returns cached result within 15s TTL', async () => {
      buildGraph({
        affected: ['app-a'],
        nodes: { 'app-a': { type: 'app', data: { root: 'apps/app-a', tags: [] } } }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p1 = svc.getAffected(false);
      flushSpawns(0);
      await p1;

      const callsAfterFirst = vi.mocked(spawn).mock.calls.length;

      const p2 = svc.getAffected(false);
      await p2;
      const callsAfterSecond = vi.mocked(spawn).mock.calls.length;

      expect(callsAfterSecond).toBe(callsAfterFirst);
    });

    it('bypasses cache when force=true', async () => {
      buildGraph({
        affected: ['app-a'],
        nodes: { 'app-a': { type: 'app', data: { root: 'apps/app-a', tags: [] } } }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p1 = svc.getAffected(false);
      flushSpawns(0);
      await p1;

      const p2 = svc.getAffected(true);
      flushSpawns(0);
      await p2;

      expect(vi.mocked(spawn).mock.calls.length).toBe(4);
    });

    it('refresh always bypasses cache and updates cacheTs', async () => {
      buildGraph({
        affected: ['app-a'],
        nodes: { 'app-a': { type: 'app', data: { root: 'apps/app-a', tags: [] } } }
      });

      const svc = new ExposedService({ monorepoRoot: 'C:\\dev' });
      const before = Date.now();
      svc.setCacheTs(before - 20_000);

      const p = svc.refresh();
      flushSpawns(0);
      await p;

      expect(svc.getCacheTs()).toBeGreaterThanOrEqual(before);
      expect(vi.mocked(spawn).mock.calls.length).toBe(2);
    });
  });

  describe('parsing & dependency mapping', () => {
    it('maps affected project names to AffectedProject objects', async () => {
      buildGraph({
        affected: ['app-a', 'lib-b'],
        nodes: {
          'app-a': { type: 'app', data: { root: 'apps/app-a', tags: ['scope:ai'], targets: { build: {}, serve: {} } } },
          'lib-b': { type: 'lib', data: { root: 'packages/lib-b', tags: ['scope:shared'], targets: { build: {}, test: {} } } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects).toHaveLength(2);
      const names = result.projects.map((p: AffectedProject) => p.name);
      expect(names).toContain('app-a');
      expect(names).toContain('lib-b');
    });

    it('computes upstream and downstream correctly', async () => {
      buildGraph({
        affected: ['lib-b'],
        nodes: {
          'app-a': { type: 'app', data: { root: 'apps/app-a', tags: [] } },
          'lib-b': { type: 'lib', data: { root: 'packages/lib-b', tags: [] } },
          'app-c': { type: 'app', data: { root: 'apps/app-c', tags: [] } }
        },
        deps: {
          'app-a': [{ source: 'app-a', target: 'lib-b' }],
          'lib-b': [{ source: 'lib-b', target: 'app-c' }],
          'app-c': []
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      const libB = result.projects.find((p: AffectedProject) => p.name === 'lib-b')!;
      expect(libB.downstream).toContain('app-c');
      expect(libB.upstream).toContain('app-a');
    });

    it('extracts type, root, tags and targets from full graph', async () => {
      buildGraph({
        affected: ['app-a'],
        nodes: {
          'app-a': { type: 'app', data: { root: 'apps/app-a', tags: ['scope:ai'], targets: { build: {}, lint: {} } } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      const proj = result.projects[0]!;
      expect(proj.type).toBe('app');
      expect(proj.root).toBe('apps/app-a');
      expect(proj.tags).toEqual(['scope:ai']);
      expect(proj.targets).toEqual(expect.arrayContaining(['build', 'lint']));
    });

    it('defaults targets to [build] when none present', async () => {
      buildGraph({
        affected: ['lib-x'],
        nodes: {
          'lib-x': { type: 'lib', data: { root: 'packages/lib-x', tags: [] } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.targets).toEqual(['build']);
    });
  });

  describe('health score', () => {
    it('is 100 for a perfect project with no flags', async () => {
      buildGraph({
        affected: ['clean-app'],
        nodes: {
          'clean-app': { type: 'app', data: { root: 'apps/clean-app', tags: [] } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.healthScore).toBe(100);
    });

    it('subtracts 20 per flag', async () => {
      buildGraph({
        affected: ['risky-lib'],
        nodes: {
          'risky-lib': { type: 'lib', data: { root: 'packages/risky-lib', tags: [] } },
          app1: { type: 'app', data: { root: 'apps/app1', tags: [] } },
          app2: { type: 'app', data: { root: 'apps/app2', tags: [] } },
          app3: { type: 'app', data: { root: 'apps/app3', tags: [] } },
          app4: { type: 'app', data: { root: 'apps/app4', tags: [] } },
          app5: { type: 'app', data: { root: 'apps/app5', tags: [] } },
          app6: { type: 'app', data: { root: 'apps/app6', tags: [] } },
        },
        deps: {
          app1: [{ source: 'app1', target: 'risky-lib' }],
          app2: [{ source: 'app2', target: 'risky-lib' }],
          app3: [{ source: 'app3', target: 'risky-lib' }],
          app4: [{ source: 'app4', target: 'risky-lib' }],
          app5: [{ source: 'app5', target: 'risky-lib' }],
          app6: [{ source: 'app6', target: 'risky-lib' }],
        }
      });
      missingPaths.add(join('C:\\dev', 'packages/risky-lib', 'dist'));
      missingPaths.add(join('C:\\dev', 'packages/risky-lib', 'coverage'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      const proj = result.projects[0]!;
      expect(proj.healthScore).toBe(40);
      expect(proj.riskFlags).toHaveLength(3);
    });

    it('floors at 0', async () => {
      buildGraph({
        affected: ['doomed'],
        nodes: {
          'nova-agent': { type: 'app', data: { root: 'apps/nova-agent', tags: [] } },
          'vibe-code-studio': { type: 'app', data: { root: 'apps/vibe-code-studio', tags: [] } },
          app3: { type: 'app', data: { root: 'apps/app3', tags: [] } },
          app4: { type: 'app', data: { root: 'apps/app4', tags: [] } },
          app5: { type: 'app', data: { root: 'apps/app5', tags: [] } },
          app6: { type: 'app', data: { root: 'apps/app6', tags: [] } },
          'doomed': { type: 'lib', data: { root: 'packages/doomed', tags: [] } },
        },
        deps: {
          'nova-agent': [{ source: 'nova-agent', target: 'doomed' }],
          'vibe-code-studio': [{ source: 'vibe-code-studio', target: 'doomed' }],
          app3: [{ source: 'app3', target: 'doomed' }],
          app4: [{ source: 'app4', target: 'doomed' }],
          app5: [{ source: 'app5', target: 'doomed' }],
          app6: [{ source: 'app6', target: 'doomed' }],
        }
      });
      // CROSS_TIER_1 + HIGH_FAN_OUT + BUILD_STALE + NO_TEST_COVERAGE = 4 flags = 20 points
      missingPaths.add(join('C:\\dev', 'packages/doomed', 'dist'));
      missingPaths.add(join('C:\\dev', 'packages/doomed', 'coverage'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.healthScore).toBe(20);
    });
  });

  describe('risk flags', () => {
    it('sets CROSS_TIER_1 when upstream includes >=2 Tier-1 apps', async () => {
      buildGraph({
        affected: ['shared-core'],
        nodes: {
          'nova-agent': { type: 'app', data: { root: 'apps/nova-agent', tags: [] } },
          'vibe-code-studio': { type: 'app', data: { root: 'apps/vibe-code-studio', tags: [] } },
          'shared-core': { type: 'lib', data: { root: 'packages/shared-core', tags: [] } }
        },
        deps: {
          'nova-agent': [{ source: 'nova-agent', target: 'shared-core' }],
          'vibe-code-studio': [{ source: 'vibe-code-studio', target: 'shared-core' }],
          'shared-core': []
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      const proj = result.projects[0]!;
      expect(proj.riskFlags).toContain('CROSS_TIER_1');
    });

    it('counts @vibetech/command-center as a Tier-1 upstream project', async () => {
      buildGraph({
        affected: ['shared-core'],
        nodes: {
          'nova-agent': { type: 'app', data: { root: 'apps/nova-agent', tags: [] } },
          '@vibetech/command-center': { type: 'app', data: { root: 'apps/vibetech-command-center', tags: [] } },
          'shared-core': { type: 'lib', data: { root: 'packages/shared-core', tags: [] } },
        },
        deps: {
          'nova-agent': [{ source: 'nova-agent', target: 'shared-core' }],
          '@vibetech/command-center': [{ source: '@vibetech/command-center', target: 'shared-core' }],
          'shared-core': [],
        },
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('CROSS_TIER_1');
    });

    it('does not set CROSS_TIER_1 with only 1 Tier-1 upstream', async () => {
      buildGraph({
        affected: ['shared-core'],
        nodes: {
          'nova-agent': { type: 'app', data: { root: 'apps/nova-agent', tags: [] } },
          'shared-core': { type: 'lib', data: { root: 'packages/shared-core', tags: [] } }
        },
        deps: {
          'nova-agent': [{ source: 'nova-agent', target: 'shared-core' }],
          'shared-core': []
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).not.toContain('CROSS_TIER_1');
    });

    it('sets HIGH_FAN_OUT when upstream.length > 5', async () => {
      buildGraph({
        affected: ['fan-out'],
        nodes: {
          'fan-out': { type: 'lib', data: { root: 'packages/fan-out', tags: [] } },
          app1: { type: 'app', data: { root: 'apps/app1', tags: [] } },
          app2: { type: 'app', data: { root: 'apps/app2', tags: [] } },
          app3: { type: 'app', data: { root: 'apps/app3', tags: [] } },
          app4: { type: 'app', data: { root: 'apps/app4', tags: [] } },
          app5: { type: 'app', data: { root: 'apps/app5', tags: [] } },
          app6: { type: 'app', data: { root: 'apps/app6', tags: [] } },
        },
        deps: {
          app1: [{ source: 'app1', target: 'fan-out' }],
          app2: [{ source: 'app2', target: 'fan-out' }],
          app3: [{ source: 'app3', target: 'fan-out' }],
          app4: [{ source: 'app4', target: 'fan-out' }],
          app5: [{ source: 'app5', target: 'fan-out' }],
          app6: [{ source: 'app6', target: 'fan-out' }],
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('HIGH_FAN_OUT');
    });

    it('does not set HIGH_FAN_OUT when upstream.length <= 5', async () => {
      buildGraph({
        affected: ['modest'],
        nodes: {
          'modest': { type: 'lib', data: { root: 'packages/modest', tags: [] } },
          app1: { type: 'app', data: { root: 'apps/app1', tags: [] } },
          app2: { type: 'app', data: { root: 'apps/app2', tags: [] } },
          app3: { type: 'app', data: { root: 'apps/app3', tags: [] } },
          app4: { type: 'app', data: { root: 'apps/app4', tags: [] } },
          app5: { type: 'app', data: { root: 'apps/app5', tags: [] } },
        },
        deps: {
          app1: [{ source: 'app1', target: 'modest' }],
          app2: [{ source: 'app2', target: 'modest' }],
          app3: [{ source: 'app3', target: 'modest' }],
          app4: [{ source: 'app4', target: 'modest' }],
          app5: [{ source: 'app5', target: 'modest' }],
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).not.toContain('HIGH_FAN_OUT');
    });

    it('sets BUILD_STALE when dist is missing', async () => {
      buildGraph({
        affected: ['no-dist'],
        nodes: {
          'no-dist': { type: 'app', data: { root: 'apps/no-dist', tags: [] } }
        }
      });
      missingPaths.add(join('C:\\dev', 'apps/no-dist', 'dist'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('BUILD_STALE');
    });

    it('sets BUILD_STALE when dist mtime is >24h old', async () => {
      buildGraph({
        affected: ['old-dist'],
        nodes: {
          'old-dist': { type: 'app', data: { root: 'apps/old-dist', tags: [] } }
        }
      });
      stalePaths.add(join('C:\\dev', 'apps/old-dist', 'dist'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('BUILD_STALE');
    });

    it('does not set BUILD_STALE for recent dist', async () => {
      buildGraph({
        affected: ['fresh-dist'],
        nodes: {
          'fresh-dist': { type: 'app', data: { root: 'apps/fresh-dist', tags: [] } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).not.toContain('BUILD_STALE');
    });

    it('uses configured Nx build outputs instead of assuming dist', async () => {
      buildGraph({
        affected: ['command-center'],
        nodes: {
          'command-center': {
            type: 'app',
            data: {
              root: 'apps/vibetech-command-center',
              tags: [],
              targets: { build: { outputs: ['{projectRoot}/out'] } },
            },
          },
        },
      });
      missingPaths.add(join('C:\\dev', 'apps/vibetech-command-center', 'dist'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).not.toContain('BUILD_STALE');
    });

    it('sets BUILD_STALE when configured Nx build output is missing', async () => {
      buildGraph({
        affected: ['command-center'],
        nodes: {
          'command-center': {
            type: 'app',
            data: {
              root: 'apps/vibetech-command-center',
              tags: [],
              targets: { build: { outputs: ['{projectRoot}/out'] } },
            },
          },
        },
      });
      missingPaths.add(join('C:\\dev', 'apps/vibetech-command-center', 'out'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('BUILD_STALE');
    });

    it('sets NO_TEST_COVERAGE when coverage dir is missing', async () => {
      buildGraph({
        affected: ['no-cov'],
        nodes: {
          'no-cov': { type: 'app', data: { root: 'apps/no-cov', tags: [] } }
        }
      });
      missingPaths.add(join('C:\\dev', 'apps/no-cov', 'coverage'));

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).toContain('NO_TEST_COVERAGE');
    });

    it('does not set NO_TEST_COVERAGE when coverage dir exists', async () => {
      buildGraph({
        affected: ['has-cov'],
        nodes: {
          'has-cov': { type: 'app', data: { root: 'apps/has-cov', tags: [] } }
        }
      });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);
      const result = await p;

      expect(result.projects[0]!.riskFlags).not.toContain('NO_TEST_COVERAGE');
    });
  });

  describe('error handling', () => {
    it('throws descriptive error when nx command exits non-zero', async () => {
      buildGraph({ affected: ['a'], nodes: { a: { type: 'app', data: { root: 'apps/a' } } } });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(1);

      await expect(p).rejects.toThrow(/exited 1/);
    });

    it('throws when readFileSync returns invalid JSON', async () => {
      buildGraph({ affected: ['a'], nodes: { a: { type: 'app', data: { root: 'apps/a' } } } });
      vi.mocked(readFileSync).mockReturnValue('not json');

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);
      flushSpawns(0);

      await expect(p).rejects.toThrow();
    });

    it('throws descriptive error on spawn error event', async () => {
      buildGraph({ affected: ['a'], nodes: { a: { type: 'app', data: { root: 'apps/a' } } } });

      const svc = new NxAffectedService({ monorepoRoot: 'C:\\dev' });
      const p = svc.getAffected(false);

      const err = new Error('spawn ENOENT');
      while (spawnTriggers.length) {
        const t = spawnTriggers.shift()!;
        t.error(err);
      }

      await expect(p).rejects.toThrow('spawn ENOENT');
    });
  });
});
