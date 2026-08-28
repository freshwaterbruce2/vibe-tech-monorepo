import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NxGraphService } from './nx-graph';

describe('NxGraphService', () => {
  let tmpRoot: string;
  let fakeNxOutput: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-nxgraph-'));

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
    class Exposed extends NxGraphService {
      public parsePublic(raw: unknown) {
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
      protected override async runNxGraph() {
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
      protected override async runNxGraph() {
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
