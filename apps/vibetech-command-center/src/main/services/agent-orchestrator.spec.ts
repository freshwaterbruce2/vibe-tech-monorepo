import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { AgentOrchestratorService } from './agent-orchestrator';
import type { ProcessHandle, ProcessChunk } from '../../shared/types';
import type { ProcessRunner } from './process-runner';

vi.mock('node:fs');
vi.mock('node:net');

class MockRunner extends EventEmitter {
  tracked = new Map();
  list = vi.fn().mockReturnValue([]);
  spawn = vi.fn();
  kill = vi.fn();
  get = vi.fn();
  waitFor = vi.fn();
  updateStatus = vi.fn();
  emitChunk = vi.fn();
}

function createMockHandle(overrides?: Partial<ProcessHandle>): ProcessHandle {
  return {
    id: 'proc-1',
    command: 'pnpm',
    args: ['exec', 'nx', 'build', 'my-app'],
    cwd: 'C:\\dev',
    pid: 1234,
    status: 'running',
    startedAt: Date.now(),
    exitCode: null,
    ...overrides
  };
}

describe('AgentOrchestratorService', () => {
  let runner: MockRunner;
  let service: AgentOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = new MockRunner();
    service = new AgentOrchestratorService({ monorepoRoot: 'C:\\dev', runner: runner as unknown as ProcessRunner });
  });

  describe('constructor', () => {
    it('initializes with monorepoRoot and runner', () => {
      expect(service).toBeInstanceOf(AgentOrchestratorService);
    });
  });

  describe('probeMcpServers', () => {
    it('returns status for all registered MCP servers', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const results = await service.probeMcpServers();
      expect(results).toHaveLength(7);
      expect(results[0]).toMatchObject({
        name: expect.any(String),
        transport: 'stdio',
        runtimeStatus: expect.any(String),
        lastProbeAt: expect.any(Number)
      });
    });

    it('marks stdio server healthy when matching process is running in runner', async () => {
      runner.list.mockReturnValue([
        { cwd: 'C:\\dev\\apps\\desktop-commander-v3', status: 'running' }
      ]);
      vi.mocked(existsSync).mockReturnValue(false);
      const results = await service.probeMcpServers();
      const dc = results.find((r) => r.name === 'desktop-commander-v3')!;
      expect(dc.healthy).toBe(true);
      expect(dc.runtimeStatus).toBe('running');
    });

    it('marks installed stdio server unhealthy when no matching process is running', async () => {
      runner.list.mockReturnValue([]);
      vi.mocked(existsSync).mockReturnValue(true);
      const results = await service.probeMcpServers();
      const dc = results.find((r) => r.name === 'desktop-commander-v3')!;
      expect(dc.healthy).toBe(false);
      expect(dc.runtimeStatus).toBe('installed-not-running');
      expect(dc.error).toBe('installed, not running');
    });

    it('marks stdio server unhealthy when no matching process found and cwd/package.json missing', async () => {
      runner.list.mockReturnValue([]);
      vi.mocked(existsSync).mockReturnValue(false);
      const results = await service.probeMcpServers();
      const dc = results.find((r) => r.name === 'desktop-commander-v3')!;
      expect(dc.healthy).toBe(false);
      expect(dc.runtimeStatus).toBe('missing');
      expect(dc.error).toContain('cwd does not exist');
    });

    it('includes correct name, transport, and lastProbeAt', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const before = Date.now();
      const results = await service.probeMcpServers();
      const after = Date.now();
      const dc = results.find((r) => r.name === 'desktop-commander-v3')!;
      expect(dc.name).toBe('desktop-commander-v3');
      expect(dc.transport).toBe('stdio');
      expect(dc.lastProbeAt).toBeGreaterThanOrEqual(before);
      expect(dc.lastProbeAt).toBeLessThanOrEqual(after);
    });
  });

  describe('runTask', () => {
    it('validates project is a non-empty string', async () => {
      await expect(service.runTask({ project: '', target: 'build' })).rejects.toThrow('invalid project');
    });

    it('validates target is a non-empty string', async () => {
      await expect(service.runTask({ project: 'my-app', target: '' })).rejects.toThrow('invalid target');
    });

    it('spawns pnpm exec nx <target> <project> with correct cwd', async () => {
      const handle = createMockHandle();
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build', args: ['--skip-nx-cache'] });
      expect(runner.spawn).toHaveBeenCalledWith({
        command: 'pnpm',
        args: ['exec', 'nx', 'build', 'my-app', '--skip-nx-cache'],
        cwd: 'C:\\dev'
      });
    });

    it('tracks task in internal map with status running', async () => {
      const handle = createMockHandle({ id: 'task-1' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'test' });
      const tasks = service.listTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        id: 'task-1',
        project: 'my-app',
        target: 'test',
        status: 'running'
      });
    });

    it('returns the ProcessHandle from runner.spawn()', async () => {
      const handle = createMockHandle();
      runner.spawn.mockReturnValue(handle);
      const result = await service.runTask({ project: 'my-app', target: 'lint' });
      expect(result).toBe(handle);
    });
  });

  describe('task lifecycle', () => {
    it('onChunk stores chunks in ring buffer', async () => {
      const handle = createMockHandle({ id: 'task-chunk' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });

      const chunk1: ProcessChunk = { processId: 'task-chunk', stream: 'stdout', data: 'hello', timestamp: 1000 };
      const chunk2: ProcessChunk = { processId: 'task-chunk', stream: 'stderr', data: 'err', timestamp: 2000 };
      runner.emit('chunk', chunk1);
      runner.emit('chunk', chunk2);

      const logs = service.searchLogs({});
      expect(logs).toHaveLength(2);
      expect(logs[0]!.data).toBe('hello');
      expect(logs[1]!.data).toBe('err');
    });

    it('ring buffer caps at 5000 entries', async () => {
      const handle = createMockHandle({ id: 'task-ring' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });

      for (let i = 0; i < 5100; i++) {
        runner.emit('chunk', { processId: 'task-ring', stream: 'stdout', data: `line-${i}`, timestamp: i });
      }
      const logs = service.searchLogs({ processId: 'task-ring' });
      expect(logs).toHaveLength(5000);
      expect(logs[0]!.data).toBe('line-100');
    });

    it('onExit updates status to exited when exitCode is 0', async () => {
      const handle = createMockHandle({ id: 'task-exit' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });

      runner.emit('exit', { ...handle, status: 'exited', exitCode: 0, exitedAt: Date.now() });
      const tasks = service.listTasks();
      expect(tasks[0]!.status).toBe('exited');
      expect(tasks[0]!.exitCode).toBe(0);
      expect(tasks[0]!.exitedAt).toBeDefined();
    });

    it('onExit updates status to error when exitCode is non-zero', async () => {
      const handle = createMockHandle({ id: 'task-err' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });

      runner.emit('exit', { ...handle, status: 'exited', exitCode: 1, exitedAt: Date.now() });
      const tasks = service.listTasks();
      expect(tasks[0]!.status).toBe('error');
      expect(tasks[0]!.exitCode).toBe(1);
    });

    it('onExit sets status to killed when handle status is killed', async () => {
      const handle = createMockHandle({ id: 'task-kill' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });

      runner.emit('exit', { ...handle, status: 'killed', exitCode: null, exitedAt: Date.now() });
      const tasks = service.listTasks();
      expect(tasks[0]!.status).toBe('killed');
    });

    it('ignores chunks and exits for unknown processIds', async () => {
      runner.emit('chunk', { processId: 'unknown', stream: 'stdout', data: 'x', timestamp: 1 });
      runner.emit('exit', { id: 'unknown', command: 'x', args: [], cwd: '', pid: null, status: 'exited', startedAt: 1, exitCode: 0 });
      expect(service.listTasks()).toHaveLength(0);
      expect(service.searchLogs({})).toHaveLength(0);
    });
  });

  describe('searchLogs', () => {
    beforeEach(async () => {
      const handle = createMockHandle({ id: 'log-search' });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'my-app', target: 'build' });
      runner.emit('chunk', { processId: 'log-search', stream: 'stdout', data: 'a', timestamp: 1000 });
      runner.emit('chunk', { processId: 'log-search', stream: 'stderr', data: 'b', timestamp: 2000 });
      runner.emit('chunk', { processId: 'log-search', stream: 'stdout', data: 'c', timestamp: 3000 });
    });

    it('filters by processId exact match', () => {
      expect(service.searchLogs({ processId: 'log-search' })).toHaveLength(3);
      expect(service.searchLogs({ processId: 'other' })).toHaveLength(0);
    });

    it('filters by stream stdout or stderr', () => {
      expect(service.searchLogs({ stream: 'stdout' })).toHaveLength(2);
      expect(service.searchLogs({ stream: 'stderr' })).toHaveLength(1);
    });

    it('filters by since (timestamp >= since)', () => {
      expect(service.searchLogs({ since: 1500 })).toHaveLength(2);
      expect(service.searchLogs({ since: 2500 })).toHaveLength(1);
      expect(service.searchLogs({ since: 4000 })).toHaveLength(0);
    });

    it('returns results sorted by timestamp ascending', () => {
      const logs = service.searchLogs({});
      expect(logs.map((l) => l.timestamp)).toEqual([1000, 2000, 3000]);
    });

    it('returns empty array when no matches', () => {
      expect(service.searchLogs({ processId: 'nope' })).toEqual([]);
    });
  });

  describe('listTasks', () => {
    it('returns all tasks sorted by startedAt descending', async () => {
      const h1 = createMockHandle({ id: 't1', startedAt: 1000 });
      const h2 = createMockHandle({ id: 't2', startedAt: 2000 });
      runner.spawn.mockReturnValueOnce(h1).mockReturnValueOnce(h2);
      await service.runTask({ project: 'a', target: 'build' });
      await service.runTask({ project: 'b', target: 'test' });
      const tasks = service.listTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]!.id).toBe('t2');
      expect(tasks[1]!.id).toBe('t1');
    });

    it('includes correct status, exitCode, and timestamps', async () => {
      const handle = createMockHandle({ id: 't1', startedAt: 5000 });
      runner.spawn.mockReturnValue(handle);
      await service.runTask({ project: 'app', target: 'lint' });
      const tasks = service.listTasks();
      expect(tasks[0]).toMatchObject({
        id: 't1',
        project: 'app',
        target: 'lint',
        status: 'running',
        startedAt: 5000,
        exitCode: null
      });
    });
  });
});
