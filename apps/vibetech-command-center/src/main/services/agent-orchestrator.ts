import { join } from 'node:path';
import { normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import type { ProcessRunner } from './process-runner';
import type {
  ProcessHandle,
  ProcessChunk,
  McpServerStatus,
  McpTransport,
  AgentTaskSpec,
  AgentTaskLauncher,
  AgentTaskStatus,
  LogSearchFilters
} from '../../shared/types';

export interface AgentOrchestratorOptions {
  monorepoRoot: string;
  runner: ProcessRunner;
}

interface McpRegistryEntry {
  name: string;
  transport: McpTransport;
  port?: number;
  cwd: string;
  command: string;
  args: string[];
}

const MAX_LOG_RING = 5000;

export class AgentOrchestratorService {
  private tasks = new Map<string, AgentTaskSpec>();
  private logRing = new Map<string, ProcessChunk[]>();
  private readonly mcpRegistry: McpRegistryEntry[];

  constructor(private opts: AgentOrchestratorOptions) {
    this.opts.runner.on('chunk', (chunk: ProcessChunk) => this.onChunk(chunk));
    this.opts.runner.on('exit', (handle: ProcessHandle) => this.onExit(handle));

    this.mcpRegistry = [
      { name: 'desktop-commander-v3', transport: 'stdio', cwd: 'apps/desktop-commander-v3', command: 'pnpm', args: ['mcp:start'] },
      { name: 'mcp-gateway', transport: 'stdio', cwd: 'apps/mcp-gateway', command: 'pnpm', args: ['mcp:start'] },
      { name: 'mcp-rag-server', transport: 'stdio', cwd: 'apps/mcp-rag-server', command: 'pnpm', args: ['mcp:start'] },
      { name: 'mcp-skills-server', transport: 'stdio', cwd: 'apps/mcp-skills-server', command: 'pnpm', args: ['mcp:start'] },
      { name: 'memory-mcp', transport: 'stdio', cwd: 'apps/memory-mcp', command: 'pnpm', args: ['mcp:start'] },
      { name: 'nova-sqlite-mcp', transport: 'stdio', cwd: 'backend/nova-sqlite-mcp', command: 'pnpm', args: ['mcp:start'] },
      { name: 'workspace-mcp-server', transport: 'stdio', cwd: 'apps/workspace-mcp-server', command: 'pnpm', args: ['mcp:start'] }
    ];
  }

  async probeMcpServers(): Promise<McpServerStatus[]> {
    const now = Date.now();
    const results: McpServerStatus[] = [];

    for (const entry of this.mcpRegistry) {
      if (entry.transport === 'http' && entry.port) {
        const healthy = await this.tcpProbe(entry.port);
        results.push({
          name: entry.name,
          transport: entry.transport,
          port: entry.port,
          healthy,
          runtimeStatus: healthy ? 'running' : 'unreachable',
          lastProbeAt: now,
          error: healthy ? undefined : `port ${entry.port} unreachable`
        });
      } else {
        const absoluteCwd = join(this.opts.monorepoRoot, entry.cwd);
        const normalizedCwd = normalize(absoluteCwd).toLowerCase();
        const running = this.opts.runner.list().some(
          (p) => normalize(p.cwd).toLowerCase() === normalizedCwd && p.status === 'running'
        );
        const healthy = running;
        let runtimeStatus: McpServerStatus['runtimeStatus'];
        let error: string | undefined;
        if (running) {
          runtimeStatus = 'running';
        } else {
          if (!existsSync(absoluteCwd)) {
            runtimeStatus = 'missing';
            error = `cwd does not exist: ${absoluteCwd}`;
          } else if (!existsSync(join(absoluteCwd, 'package.json'))) {
            runtimeStatus = 'missing';
            error = `package.json missing in ${absoluteCwd}`;
          } else {
            runtimeStatus = 'installed-not-running';
            error = 'installed, not running';
          }
        }
        results.push({
          name: entry.name,
          transport: entry.transport,
          healthy,
          runtimeStatus,
          lastProbeAt: now,
          error
        });
      }
    }

    return results;
  }

  async runTask(spec: AgentTaskLauncher): Promise<ProcessHandle> {
    if (!spec.project || typeof spec.project !== 'string' || spec.project.length === 0) {
      throw new Error('invalid project');
    }
    if (!spec.target || typeof spec.target !== 'string' || spec.target.length === 0) {
      throw new Error('invalid target');
    }

    const args = ['exec', 'nx', spec.target, spec.project, ...(spec.args ?? [])];
    const handle = this.opts.runner.spawn({
      command: 'pnpm',
      args,
      cwd: this.opts.monorepoRoot
    });

    const task: AgentTaskSpec = {
      id: handle.id,
      project: spec.project,
      target: spec.target,
      args: spec.args ?? [],
      status: 'running' as AgentTaskStatus,
      startedAt: handle.startedAt,
      exitCode: null
    };
    this.tasks.set(handle.id, task);

    return handle;
  }

  listTasks(): AgentTaskSpec[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  searchLogs(filters: LogSearchFilters): ProcessChunk[] {
    const results: ProcessChunk[] = [];
    for (const chunks of this.logRing.values()) {
      for (const chunk of chunks) {
        if (filters.processId && chunk.processId !== filters.processId) continue;
        if (filters.stream && chunk.stream !== filters.stream) continue;
        if (filters.since !== undefined && chunk.timestamp < filters.since) continue;
        results.push(chunk);
      }
    }
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  private onChunk(chunk: ProcessChunk): void {
    if (!this.tasks.has(chunk.processId)) return;
    let ring = this.logRing.get(chunk.processId);
    if (!ring) {
      ring = [];
      this.logRing.set(chunk.processId, ring);
    }
    ring.push(chunk);
    if (ring.length > MAX_LOG_RING) {
      ring.shift();
    }
  }

  private onExit(handle: ProcessHandle): void {
    const task = this.tasks.get(handle.id);
    if (!task) return;
    if (handle.status === 'killed') {
      task.status = 'killed';
    } else if (handle.status === 'error' || handle.exitCode !== 0) {
      task.status = 'error';
    } else {
      task.status = 'exited';
    }
    task.exitedAt = handle.exitedAt ?? Date.now();
    task.exitCode = handle.exitCode;
  }

  private async tcpProbe(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = createConnection({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve(true);
      });
      socket.setTimeout(1000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        resolve(false);
      });
    });
  }
}
