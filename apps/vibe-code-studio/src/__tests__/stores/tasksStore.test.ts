import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTasksActions, useTasksStore } from '../../stores/tasksStore';
import type { VcsTask } from '../../services/tasks/types';

const task = (label: string): VcsTask => ({ label, type: 'shell', command: 'pnpm' });

beforeEach(() => {
  useTasksStore.setState({ tasks: [], running: {}, lastExitCodes: {}, loadError: null });
});

describe('tasksStore actions', () => {
  it('setTasks replaces the list and clears any load error', () => {
    const { actions } = useTasksStore.getState();
    actions.setLoadError('bad json');
    actions.setTasks([task('build')]);
    const state = useTasksStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.loadError).toBeNull();
  });

  it('setLoadError stores the error message', () => {
    useTasksStore.getState().actions.setLoadError('Schema error at tasks.0.label');
    expect(useTasksStore.getState().loadError).toContain('Schema error');
  });

  it('markRunning / markStopped track lifecycle and exit codes', () => {
    const { actions } = useTasksStore.getState();
    actions.markRunning('build', 'session-1', 1000);
    expect(useTasksStore.getState().running['build']).toEqual({
      sessionId: 'session-1',
      startedAt: 1000,
    });
    actions.markStopped('build', 2);
    const state = useTasksStore.getState();
    expect(state.running['build']).toBeUndefined();
    expect(state.lastExitCodes['build']).toBe(2);
  });

  it('exposes actions via the useTasksActions hook', () => {
    const { result } = renderHook(() => useTasksActions());
    expect(typeof result.current.setTasks).toBe('function');
  });
});
