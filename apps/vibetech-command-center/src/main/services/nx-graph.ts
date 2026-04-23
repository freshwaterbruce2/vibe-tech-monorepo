import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NxGraph, NxProject, NxDependency } from '../../shared/types';

export interface NxGraphServiceOptions {
  monorepoRoot: string;
  cacheTtlMs?: number;
  nxCommand?: string;       // default: 'pnpm.cmd'
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

  protected async runNxGraph(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tmp = mkdtempSync(join(tmpdir(), 'cc-nx-'));
      const out = join(tmp, 'graph.json');
      const cmd = this.opts.nxCommand ?? 'pnpm.cmd';
      const args = this.opts.nxArgs ?? ['exec', 'nx', 'graph', `--file=${out}`];
      const timeoutMs = this.opts.timeoutMs ?? 30_000;

      const proc = spawn(cmd, args, {
        cwd: this.opts.monorepoRoot,
        shell: true,
        windowsHide: true
      });

      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        proc.kill();
        rmSync(tmp, { recursive: true, force: true });
        reject(new Error(`nx graph timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
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

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        rmSync(tmp, { recursive: true, force: true });
        reject(err);
      });
    });
  }

  protected parse(raw: unknown): NxGraph {
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
