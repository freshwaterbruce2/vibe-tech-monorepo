import { beforeEach, describe, expect, it, vi } from 'vitest';

// Controllable terminal double backing the integration's real TaskRunnerService.
const { mockTerminal, mockReadFile } = vi.hoisted(() => {
  const handlers = new Map<
    string,
    { onData: (data: string) => void; onExit: (code: number | null) => void }
  >();
  let counter = 0;
  return {
    mockReadFile: vi.fn(),
    mockTerminal: {
      handlers,
      resetCounter: () => {
        counter = 0;
      },
      createSession: vi.fn((): string => `session-${++counter}`),
      startShell: vi.fn(
        async (
          id: string,
          onData: (data: string) => void,
          onExit: (code: number | null) => void
        ) => {
          handlers.set(id, { onData, onExit });
        }
      ),
      writeInput: vi.fn(),
      closeSession: vi.fn(),
      emitData(id: string, data: string) {
        handlers.get(id)?.onData(data);
      },
      emitExit(id: string, code: number | null) {
        handlers.get(id)?.onExit(code);
      },
    },
  };
});

vi.mock('../../../services/TerminalService', () => ({ terminalService: mockTerminal }));
vi.mock('../../../services/FileSystemService', () => ({
  FileSystemService: class {
    readFile = mockReadFile;
  },
}));

import {
  cancelWorkspaceTask,
  getTaskRunner,
  loadWorkspaceTasks,
  runDefaultBuildTask,
  runWorkspaceTask,
  setTaskRunnerForTests,
} from '../../../services/tasks/taskRunnerIntegration';
import { useProblemsStore } from '../../../stores/problemsStore';
import { useTasksStore } from '../../../stores/tasksStore';

const TASKS_JSON = JSON.stringify({
  version: '2.0.0',
  tasks: [
    {
      label: 'build',
      command: 'pnpm',
      args: ['build'],
      group: { kind: 'build', isDefault: true },
      problemMatcher: '$tsc',
    },
    { label: 'clean', command: 'pnpm', args: ['clean'] },
  ],
});

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  setTaskRunnerForTests(null);
  useProblemsStore.setState({ bySource: {}, panelOpen: false });
  useTasksStore.setState({ tasks: [], running: {}, lastExitCodes: {}, loadError: null });
  mockTerminal.handlers.clear();
  mockTerminal.resetCounter();
  mockReadFile.mockReset();
});

describe('taskRunnerIntegration', () => {
  it('getTaskRunner returns a memoized singleton', () => {
    expect(getTaskRunner()).toBe(getTaskRunner());
  });

  it('loadWorkspaceTasks mirrors parsed tasks into tasksStore', async () => {
    mockReadFile.mockResolvedValue(TASKS_JSON);
    const result = await loadWorkspaceTasks('V:\\ws');
    expect(result.ok).toBe(true);
    expect(useTasksStore.getState().tasks).toHaveLength(2);
    expect(useTasksStore.getState().loadError).toBeNull();
  });

  it('loadWorkspaceTasks mirrors parse errors into tasksStore', async () => {
    mockReadFile.mockResolvedValue('{ broken');
    const result = await loadWorkspaceTasks('V:\\ws');
    expect(result.ok).toBe(false);
    expect(useTasksStore.getState().loadError).toMatch(/Invalid JSON/);
  });

  it('runs a matcher task end-to-end: panel opens, stores track lifecycle', async () => {
    mockReadFile.mockResolvedValue(TASKS_JSON);
    await loadWorkspaceTasks('V:\\ws');
    const promise = runWorkspaceTask('build');
    await flush();
    expect(useProblemsStore.getState().panelOpen).toBe(true);
    expect(useTasksStore.getState().running['build']).toBeDefined();
    mockTerminal.emitData('session-1', 'src/a.ts(4,2): error TS1005: oops\r\n');
    mockTerminal.emitExit('session-1', 1);
    await expect(promise).resolves.toBe(1);
    const problems = useProblemsStore.getState().bySource['build'];
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 4, code: 'TS1005' });
    const tasks = useTasksStore.getState();
    expect(tasks.running['build']).toBeUndefined();
    expect(tasks.lastExitCodes['build']).toBe(1);
  });

  it('does not open the panel for tasks without a problem matcher', async () => {
    mockReadFile.mockResolvedValue(TASKS_JSON);
    await loadWorkspaceTasks('V:\\ws');
    const promise = runWorkspaceTask('clean');
    await flush();
    expect(useProblemsStore.getState().panelOpen).toBe(false);
    mockTerminal.emitExit('session-1', 0);
    await promise;
  });

  it('runDefaultBuildTask runs the isDefault build task and cancel works', async () => {
    mockReadFile.mockResolvedValue(TASKS_JSON);
    await loadWorkspaceTasks('V:\\ws');
    const promise = runDefaultBuildTask();
    await flush();
    expect(useTasksStore.getState().running['build']).toBeDefined();
    expect(cancelWorkspaceTask('build')).toBe(true);
    expect(useTasksStore.getState().running['build']).toBeUndefined();
    await expect(promise).resolves.toBeNull();
  });

  it('runDefaultBuildTask is a no-op without a default build task', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ version: '2.0.0', tasks: [{ label: 'x', command: 'y' }] })
    );
    await loadWorkspaceTasks('V:\\ws');
    await expect(runDefaultBuildTask()).resolves.toBeNull();
    expect(cancelWorkspaceTask('x')).toBe(false);
  });
});
