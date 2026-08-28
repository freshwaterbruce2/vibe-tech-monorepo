import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TaskRunnerError,
  TaskRunnerService,
  buildCommandLine,
  quoteArg,
  type TaskRunnerDeps,
  type TaskTerminal,
} from '../../../services/tasks/TaskRunnerService';
import type { VcsTask } from '../../../services/tasks/types';

class MockTerminal implements TaskTerminal {
  written = new Map<string, string[]>();
  closed: string[] = [];
  private handlers = new Map<
    string,
    { onData: (data: string) => void; onExit: (code: number | null) => void }
  >();
  private counter = 0;

  createSession = vi.fn((_cwd?: string): string => {
    this.counter++;
    return `session-${this.counter}`;
  });

  async startShell(
    sessionId: string,
    onData: (data: string) => void,
    onExit: (code: number | null) => void
  ): Promise<void> {
    this.handlers.set(sessionId, { onData, onExit });
  }

  writeInput(sessionId: string, data: string): void {
    const lines = this.written.get(sessionId) ?? [];
    lines.push(data);
    this.written.set(sessionId, lines);
  }

  closeSession(sessionId: string): void {
    this.closed.push(sessionId);
  }

  emitData(sessionId: string, data: string): void {
    this.handlers.get(sessionId)?.onData(data);
  }

  emitExit(sessionId: string, code: number | null): void {
    this.handlers.get(sessionId)?.onExit(code);
  }
}

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

function tasksJson(tasks: object[]): string {
  return JSON.stringify({ version: '2.0.0', tasks });
}

interface Harness {
  terminal: MockTerminal;
  runner: TaskRunnerService;
  deps: TaskRunnerDeps;
  files: Map<string, string>;
}

function makeHarness(): Harness {
  const terminal = new MockTerminal();
  const files = new Map<string, string>();
  const deps: TaskRunnerDeps = {
    terminal,
    readFile: async (path: string) => {
      const content = files.get(path);
      if (content === undefined) throw new Error('ENOENT');
      return content;
    },
    onDiagnostics: vi.fn(),
    clearDiagnostics: vi.fn(),
    onOutput: vi.fn(),
    onTaskStart: vi.fn(),
    onTaskEnd: vi.fn(),
  };
  return { terminal, runner: new TaskRunnerService(deps), deps, files };
}

describe('quoteArg / buildCommandLine', () => {
  it('quotes only when needed and escapes embedded single quotes', () => {
    expect(quoteArg('build')).toBe('build');
    expect(quoteArg('my file.ts')).toBe("'my file.ts'");
    expect(quoteArg("it's")).toBe("'it''s'");
    expect(quoteArg('')).toBe("''");
  });

  it('builds a pwsh line propagating the exit code', () => {
    const task: VcsTask = { label: 'b', type: 'shell', command: 'pnpm', args: ['run', 'a b'] };
    expect(buildCommandLine(task)).toBe("pnpm run 'a b'; exit $LASTEXITCODE\r");
    expect(buildCommandLine({ label: 'x', type: 'shell', command: 'ls' })).toBe(
      'ls; exit $LASTEXITCODE\r'
    );
  });
});

describe('loadTasks', () => {
  it('treats a missing tasks.json as zero tasks, not an error', async () => {
    const { runner } = makeHarness();
    const result = await runner.loadTasks('V:\\ws');
    expect(result).toEqual({ ok: true, tasks: [] });
    expect(runner.getTasks()).toEqual([]);
  });

  it('loads valid tasks and finds the default build task', async () => {
    const { runner, files } = makeHarness();
    files.set(
      'V:\\ws/.vcs/tasks.json',
      tasksJson([
        { label: 'build', command: 'pnpm', group: { kind: 'build', isDefault: true } },
        { label: 'lint', command: 'pnpm' },
      ])
    );
    const result = await runner.loadTasks('V:\\ws');
    expect(result.ok).toBe(true);
    expect(runner.getTasks()).toHaveLength(2);
    expect(runner.getDefaultBuildTask()?.label).toBe('build');
  });

  it('keeps previous tasks and reports the error on invalid content', async () => {
    const { runner, files } = makeHarness();
    files.set('V:\\ws/.vcs/tasks.json', tasksJson([{ label: 'a', command: 'x' }]));
    await runner.loadTasks('V:\\ws');
    files.set('V:\\ws/.vcs/tasks.json', '{ broken');
    const result = await runner.loadTasks('V:\\ws');
    expect(result.ok).toBe(false);
    expect(runner.getTasks()).toHaveLength(1);
  });
});

describe('runTask', () => {
  let h: Harness;

  beforeEach(async () => {
    h = makeHarness();
    h.files.set(
      'V:\\ws/.vcs/tasks.json',
      tasksJson([
        { label: 'build', command: 'pnpm', args: ['build'], problemMatcher: '$tsc' },
        { label: 'test', command: 'pnpm', args: ['test'], dependsOn: 'build' },
        { label: 'noisy', command: 'echo', args: ['hi'] },
        { label: 'a', command: 'x', dependsOn: 'b' },
        { label: 'b', command: 'x', dependsOn: 'a' },
      ])
    );
    await h.runner.loadTasks('V:\\ws');
  });

  it('runs a task end-to-end: session, command, diagnostics, exit code', async () => {
    const promise = h.runner.runTask('build');
    await flush();
    expect(h.deps.clearDiagnostics).toHaveBeenCalledWith('build');
    expect(h.deps.onTaskStart).toHaveBeenCalledWith('build', 'session-1');
    expect(h.runner.isRunning('build')).toBe(true);
    expect(h.terminal.written.get('session-1')).toEqual(['pnpm build; exit $LASTEXITCODE\r']);
    h.terminal.emitData('session-1', 'src/a.ts(1,2): error TS1005: oops\r\npartial');
    expect(h.deps.onDiagnostics).toHaveBeenCalledTimes(1);
    h.terminal.emitData('session-1', ' tail\r\n');
    h.terminal.emitExit('session-1', 2);
    await expect(promise).resolves.toBe(2);
    expect(h.runner.isRunning('build')).toBe(false);
    expect(h.terminal.closed).toContain('session-1');
    expect(h.deps.onTaskEnd).toHaveBeenCalledWith('build', 2);
    expect(h.deps.onOutput).toHaveBeenCalled();
  });

  it('runs dependsOn prerequisites sequentially before the task', async () => {
    const promise = h.runner.runTask('test');
    await flush();
    expect(h.deps.onTaskStart).toHaveBeenCalledWith('build', 'session-1');
    expect(h.deps.onTaskStart).not.toHaveBeenCalledWith('test', expect.anything());
    h.terminal.emitExit('session-1', 0);
    await flush();
    expect(h.deps.onTaskStart).toHaveBeenCalledWith('test', 'session-2');
    h.terminal.emitExit('session-2', 0);
    await expect(promise).resolves.toBe(0);
  });

  it('ignores output when the task has no problem matcher', async () => {
    const promise = h.runner.runTask('noisy');
    await flush();
    h.terminal.emitData('session-1', 'src/a.ts(1,2): error TS1005: oops\r\n');
    expect(h.deps.onDiagnostics).not.toHaveBeenCalled();
    h.terminal.emitExit('session-1', 0);
    await promise;
  });

  it('runs a diamond dependsOn graph without repeating shared prerequisites', async () => {
    h.files.set(
      'V:\\ws/.vcs/tasks.json',
      tasksJson([
        { label: 'shared', command: 'x' },
        { label: 'left', command: 'x', dependsOn: 'shared' },
        { label: 'right', command: 'x', dependsOn: 'shared' },
        { label: 'top', command: 'x', dependsOn: ['left', 'right'] },
      ])
    );
    await h.runner.loadTasks('V:\\ws');
    const promise = h.runner.runTask('top');
    for (let session = 1; session <= 4; session++) {
      await flush();
      h.terminal.emitExit(`session-${session}`, 0);
    }
    await expect(promise).resolves.toBe(0);
    // shared ran exactly once: 4 sessions total for 4 distinct tasks
    expect(h.terminal.createSession).toHaveBeenCalledTimes(4);
    const startOrder = (h.deps.onTaskStart as ReturnType<typeof vi.fn>).mock.calls.map(
      call => call[0]
    );
    expect(startOrder).toEqual(['shared', 'left', 'right', 'top']);
  });

  it('aborts the rest of a dependsOn chain when a prerequisite is cancelled', async () => {
    const promise = h.runner.runTask('test');
    await flush();
    expect(h.runner.cancelTask('build')).toBe(true);
    await expect(promise).resolves.toBeNull();
    expect(h.deps.onTaskStart).not.toHaveBeenCalledWith('test', expect.anything());
  });

  it('throws for unknown labels and circular dependsOn', async () => {
    await expect(h.runner.runTask('nope')).rejects.toThrow(TaskRunnerError);
    await expect(h.runner.runTask('a')).rejects.toThrow(/Circular dependsOn/);
  });

  it('rejects a second concurrent run of the same task', async () => {
    const first = h.runner.runTask('build');
    await flush();
    await expect(h.runner.runTask('build')).rejects.toThrow(/already running/);
    h.terminal.emitExit('session-1', 0);
    await first;
  });
});

describe('cancelTask', () => {
  it('closes the running session and reports a null exit', async () => {
    const h = makeHarness();
    h.files.set('V:\\ws/.vcs/tasks.json', tasksJson([{ label: 'watch', command: 'pnpm' }]));
    await h.runner.loadTasks('V:\\ws');
    const promise = h.runner.runTask('watch');
    await flush();
    expect(h.runner.cancelTask('watch')).toBe(true);
    await expect(promise).resolves.toBeNull();
    expect(h.terminal.closed).toContain('session-1');
    expect(h.deps.onTaskEnd).toHaveBeenCalledWith('watch', null);
    expect(h.runner.isRunning('watch')).toBe(false);
    // Late natural exit after cancel must not double-settle or re-fire callbacks
    h.terminal.emitExit('session-1', 0);
    expect(h.deps.onTaskEnd).toHaveBeenCalledTimes(1);
  });

  it('returns false when the task is not running', () => {
    const h = makeHarness();
    expect(h.runner.cancelTask('ghost')).toBe(false);
  });
});
