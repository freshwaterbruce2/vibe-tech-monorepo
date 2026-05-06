import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type { AffectedGraph, AffectedProject, RiskFlag } from '../../shared/types';

export interface NxAffectedOptions {
  monorepoRoot: string;
}

const TIER_1_APPS = new Set([
  'nova-agent',
  'vibe-code-studio',
  'vibe-tutor',
  '@vibetech/command-center'
]);

const BUILD_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

interface NxTargetConfig {
  outputs?: string[];
  options?: {
    outputPath?: string;
  };
}

interface NxProjectData {
  root?: string;
  sourceRoot?: string;
  tags?: string[];
  targets?: Record<string, NxTargetConfig | unknown>;
  implicitDependencies?: string[];
}

interface NxGraphNode {
  type?: string;
  data?: NxProjectData;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export class NxAffectedService {
  private cache: AffectedGraph | null = null;
  private cacheTs = 0;
  private readonly ttlMs = 15_000;

  constructor(private readonly opts: NxAffectedOptions) {}

  async getAffected(force = false): Promise<AffectedGraph> {
    if (!force && this.cache && Date.now() - this.cacheTs < this.ttlMs) {
      return this.cache;
    }
    const result = await this.buildAffectedGraph();
    this.cache = result;
    this.cacheTs = Date.now();
    return result;
  }

  async refresh(): Promise<AffectedGraph> {
    return this.getAffected(true);
  }

  private async buildAffectedGraph(): Promise<AffectedGraph> {
    const [affectedRaw, fullRaw] = await Promise.all([
      this.runNxAffectedGraph(),
      this.runNxFullGraph()
    ]);

    const affectedGraph = affectedRaw as {
      graph?: {
        nodes?: Record<string, NxGraphNode>;
        dependencies?: Record<string, Array<{ source: string; target: string; type?: string }>>;
      };
    };

    const fullGraph = fullRaw as {
      graph?: {
        nodes?: Record<string, NxGraphNode>;
        dependencies?: Record<string, Array<{ source: string; target: string; type?: string }>>;
      };
    };

    const affectedNodes = affectedGraph.graph?.nodes ?? {};
    const fullNodes = fullGraph.graph?.nodes ?? {};
    const fullDeps = fullGraph.graph?.dependencies ?? {};

    const affectedProjectNames = Object.keys(affectedNodes);
    const projects: AffectedProject[] = [];

    for (const name of affectedProjectNames) {
      const node = fullNodes[name];
      const data = node?.data;

      const downstream: string[] = [];
      const upstream: string[] = [];

      // downstream = projects this depends on (where this project is the source)
      const directDeps = fullDeps[name] ?? [];
      for (const dep of directDeps) {
        if (dep.target !== name && !downstream.includes(dep.target)) {
          downstream.push(dep.target);
        }
      }

      // upstream = projects that depend on this (where this project is the target)
      for (const [sourceName, depList] of Object.entries(fullDeps)) {
        for (const dep of depList) {
          if (dep.target === name && !upstream.includes(sourceName)) {
            upstream.push(sourceName);
          }
        }
      }

      const targets = data?.targets ? Object.keys(data.targets) : ['build'];

      const riskFlags: RiskFlag[] = [];

      // CROSS_TIER_1: upstream includes at least two Tier 1 apps
      const upstreamTier1 = upstream.filter((u) => TIER_1_APPS.has(u));
      if (upstreamTier1.length >= 2) {
        riskFlags.push('CROSS_TIER_1');
      }

      // HIGH_FAN_OUT: many dependents means a change has broad blast radius.
      if (upstream.length > 5) {
        riskFlags.push('HIGH_FAN_OUT');
      }

      // BUILD_STALE: configured build output mtime older than 24h or missing.
      const root = data?.root ?? '';
      if (!this.hasFreshBuildOutput(root, data?.targets)) {
        riskFlags.push('BUILD_STALE');
      }

      // NO_TEST_COVERAGE: no coverage/ dir exists
      const coveragePath = join(this.opts.monorepoRoot, root, 'coverage');
      if (!existsSync(coveragePath)) {
        riskFlags.push('NO_TEST_COVERAGE');
      }

      const healthScore = Math.max(0, 100 - riskFlags.length * 20);

      projects.push({
        name,
        type: (node?.type === 'app' ? 'app' : 'lib'),
        root,
        tags: data?.tags ?? [],
        targets,
        upstream,
        downstream,
        healthScore,
        riskFlags
      });
    }

    return {
      base: 'origin/main',
      head: 'HEAD',
      projects,
      generatedAt: Date.now()
    };
  }

  private hasFreshBuildOutput(root: string, targets: NxProjectData['targets']): boolean {
    const outputPaths = this.getBuildOutputPaths(root, targets);
    const staleBefore = Date.now() - BUILD_STALE_THRESHOLD_MS;

    return outputPaths.some((outputPath) => {
      if (!existsSync(outputPath)) {
        return false;
      }

      return statSync(outputPath).mtimeMs >= staleBefore;
    });
  }

  private getBuildOutputPaths(root: string, targets: NxProjectData['targets']): string[] {
    const buildTarget = targets?.['build'];
    const outputs = this.getBuildTargetOutputs(buildTarget);
    const patterns = outputs.length > 0 ? outputs : [join(root, 'dist')];
    const paths = patterns.map((pattern) => this.resolveOutputPath(pattern, root));

    return Array.from(new Set(paths));
  }

  private getBuildTargetOutputs(buildTarget: unknown): string[] {
    if (!isObject(buildTarget)) {
      return [];
    }

    const outputPatterns = getStringArray(buildTarget['outputs']);
    if (outputPatterns.length > 0) {
      return outputPatterns;
    }

    const options = buildTarget['options'];
    if (isObject(options) && typeof options['outputPath'] === 'string') {
      return [options['outputPath']];
    }

    return [];
  }

  private resolveOutputPath(pattern: string, root: string): string {
    const normalizedPattern = pattern.replace(/[/\\]\*\*?$/, '');

    if (normalizedPattern.startsWith('{workspaceRoot}/') || normalizedPattern.startsWith('{workspaceRoot}\\')) {
      return join(this.opts.monorepoRoot, normalizedPattern.slice('{workspaceRoot}/'.length));
    }

    if (normalizedPattern === '{workspaceRoot}') {
      return this.opts.monorepoRoot;
    }

    if (normalizedPattern.startsWith('{projectRoot}/') || normalizedPattern.startsWith('{projectRoot}\\')) {
      return join(this.opts.monorepoRoot, root, normalizedPattern.slice('{projectRoot}/'.length));
    }

    if (normalizedPattern === '{projectRoot}') {
      return join(this.opts.monorepoRoot, root);
    }

    if (isAbsolute(normalizedPattern)) {
      return normalizedPattern;
    }

    return join(this.opts.monorepoRoot, normalizedPattern);
  }

  private async runNxAffectedGraph(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tmp = mkdtempSync(join(tmpdir(), 'cc-nx-affected-'));
      const out = join(tmp, 'graph.json');
      const cmd = 'pnpm.cmd';
      const args = ['exec', 'nx', 'graph', '--affected', '--base=origin/main', '--head=HEAD', `--file=${out}`];
      const timeoutMs = 60_000;

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
        reject(new Error(`nx affected graph timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code !== 0) {
          rmSync(tmp, { recursive: true, force: true });
          reject(new Error(`nx affected graph exited ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        try {
          const text = readFileSync(out, 'utf8');
          rmSync(tmp, { recursive: true, force: true });
          resolve(JSON.parse(text));
        } catch (e) {
          rmSync(tmp, { recursive: true, force: true });
          reject(e);
        }
      });

      proc.on('error', (e: Error) => {
        clearTimeout(timer);
        rmSync(tmp, { recursive: true, force: true });
        reject(e);
      });
    });
  }

  private async runNxFullGraph(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tmp = mkdtempSync(join(tmpdir(), 'cc-nx-full-'));
      const out = join(tmp, 'graph.json');
      const cmd = 'pnpm.cmd';
      const args = ['exec', 'nx', 'graph', `--file=${out}`];
      const timeoutMs = 60_000;

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
        reject(new Error(`nx full graph timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code !== 0) {
          rmSync(tmp, { recursive: true, force: true });
          reject(new Error(`nx full graph exited ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        try {
          const text = readFileSync(out, 'utf8');
          rmSync(tmp, { recursive: true, force: true });
          resolve(JSON.parse(text));
        } catch (e) {
          rmSync(tmp, { recursive: true, force: true });
          reject(e);
        }
      });

      proc.on('error', (e: Error) => {
        clearTimeout(timer);
        rmSync(tmp, { recursive: true, force: true });
        reject(e);
      });
    });
  }
}
