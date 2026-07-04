import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runMock, buildMock, cancelMock } = vi.hoisted(() => ({
  runMock: vi.fn(),
  buildMock: vi.fn(),
  cancelMock: vi.fn(),
}));

vi.mock('../../services/tasks/taskRunnerIntegration', () => ({
  runWorkspaceTask: runMock,
  runDefaultBuildTask: buildMock,
  cancelWorkspaceTask: cancelMock,
}));

import { useAICommandPalette } from '../../hooks/useAICommandPalette';
import { startTaskSafely, useTaskCommands } from '../../hooks/useTaskCommands';
import { logger } from '../../services/Logger';
import { useProblemsStore } from '../../stores/problemsStore';
import { useTasksStore } from '../../stores/tasksStore';
import type { VcsTask } from '../../services/tasks/types';

const task = (label: string): VcsTask => ({ label, type: 'shell', command: 'pnpm' });

beforeEach(() => {
  useProblemsStore.setState({ bySource: {}, panelOpen: false });
  useTasksStore.setState({ tasks: [], running: {}, lastExitCodes: {}, loadError: null });
  runMock.mockReset().mockResolvedValue(0);
  buildMock.mockReset().mockResolvedValue(0);
  cancelMock.mockReset();
});

describe('startTaskSafely', () => {
  it('logs a warning instead of rejecting when the task fails to start', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    startTaskSafely(() => Promise.reject(new Error('boom')), 'build');
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('build'), expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('useTaskCommands', () => {
  it('always offers Toggle Problems and Run Build Task', () => {
    const { result } = renderHook(() => useTaskCommands());
    const ids = result.current.map(c => c.id);
    expect(ids).toContain('view-toggle-problems');
    expect(ids).toContain('task-run-default-build');
    result.current.find(c => c.id === 'view-toggle-problems')!.action();
    expect(useProblemsStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'task-run-default-build')!.action();
    expect(buildMock).toHaveBeenCalledTimes(1);
  });

  it('offers Run for idle tasks and Cancel for running ones', () => {
    useTasksStore.setState({
      tasks: [task('build'), task('watch')],
      running: { watch: { sessionId: 's1', startedAt: 1 } },
      lastExitCodes: {},
      loadError: null,
    });
    const { result } = renderHook(() => useTaskCommands());
    const ids = result.current.map(c => c.id);
    expect(ids).toContain('task-run-build');
    expect(ids).toContain('task-cancel-watch');
    expect(ids).not.toContain('task-run-watch');
    result.current.find(c => c.id === 'task-run-build')!.action();
    expect(runMock).toHaveBeenCalledWith('build');
    result.current.find(c => c.id === 'task-cancel-watch')!.action();
    expect(cancelMock).toHaveBeenCalledWith('watch');
  });
});

describe('useAICommandPalette integration', () => {
  it('includes task commands alongside the built-in commands', () => {
    useTasksStore.setState({
      tasks: [task('lint')],
      running: {},
      lastExitCodes: {},
      loadError: null,
    });
    const { result } = renderHook(() => useAICommandPalette({}));
    const ids = result.current.commands.map(c => c.id);
    expect(ids).toContain('task-run-lint');
    expect(ids).toContain('view-toggle-problems');
    expect(ids).toContain('file-new');
  });

  it('toggleCommandPalette flips the open state', () => {
    const { result } = renderHook(() => useAICommandPalette({}));
    expect(result.current.commandPaletteOpen).toBe(false);
    act(() => result.current.toggleCommandPalette());
    expect(result.current.commandPaletteOpen).toBe(true);
    act(() => result.current.setCommandPaletteOpen(false));
    expect(result.current.commandPaletteOpen).toBe(false);
  });
});
