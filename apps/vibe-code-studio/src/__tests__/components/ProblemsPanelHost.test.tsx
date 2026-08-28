import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadMock, buildMock } = vi.hoisted(() => ({
  loadMock: vi.fn(),
  buildMock: vi.fn(),
}));

vi.mock('../../services/tasks/taskRunnerIntegration', () => ({
  loadWorkspaceTasks: loadMock,
  runDefaultBuildTask: buildMock,
}));

import { ProblemsPanelHost } from '../../components/ProblemsPanel/ProblemsPanelHost';
import { handleTaskRunnerKeydown } from '../../components/ProblemsPanel/taskRunnerKeydown';
import { logger } from '../../services/Logger';
import { useProblemsStore } from '../../stores/problemsStore';
import { useEditorStore } from '../../stores/useEditorStore';

const keydown = (key: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: true, ...init });

beforeEach(() => {
  useProblemsStore.setState({ bySource: {}, panelOpen: false });
  loadMock.mockReset().mockResolvedValue({ ok: true, tasks: [] });
  buildMock.mockReset().mockResolvedValue(0);
});

describe('handleTaskRunnerKeydown', () => {
  it('Ctrl+Shift+M toggles the Problems panel', () => {
    handleTaskRunnerKeydown(keydown('M'));
    expect(useProblemsStore.getState().panelOpen).toBe(true);
    handleTaskRunnerKeydown(keydown('M'));
    expect(useProblemsStore.getState().panelOpen).toBe(false);
  });

  it('Ctrl+Shift+B triggers the default build task', () => {
    handleTaskRunnerKeydown(keydown('B'));
    expect(buildMock).toHaveBeenCalledTimes(1);
  });

  it('logs instead of throwing when the build trigger rejects', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    buildMock.mockRejectedValue(new Error('no tasks'));
    handleTaskRunnerKeydown(keydown('B'));
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('ignores keys without the Ctrl+Shift chord or other letters', () => {
    handleTaskRunnerKeydown(keydown('M', { ctrlKey: false }));
    handleTaskRunnerKeydown(keydown('X'));
    expect(useProblemsStore.getState().panelOpen).toBe(false);
    expect(buildMock).not.toHaveBeenCalled();
  });
});

describe('ProblemsPanelHost', () => {
  it('renders the panel from store state and closes via the panel button', () => {
    useProblemsStore.getState().actions.setPanelOpen(true);
    render(<ProblemsPanelHost />);
    expect(screen.getByTestId('problems-panel')).toBeTruthy();
    act(() => {
      screen.getByLabelText('Close problems panel').click();
    });
    expect(useProblemsStore.getState().panelOpen).toBe(false);
    expect(screen.queryByTestId('problems-panel')).toBeNull();
  });

  it('responds to window keydown while mounted', () => {
    render(<ProblemsPanelHost />);
    act(() => {
      globalThis.dispatchEvent(keydown('M'));
    });
    expect(useProblemsStore.getState().panelOpen).toBe(true);
  });

  it('loads workspace tasks when a workspace folder is set', async () => {
    useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
    render(<ProblemsPanelHost />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(loadMock).toHaveBeenCalledWith('V:\\ws');
  });

  it('warns when tasks.json fails to load and skips without a workspace', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    loadMock.mockResolvedValue({ ok: false, error: 'Schema error at tasks.0.label' });
    useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
    render(<ProblemsPanelHost />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Schema error'));
    warnSpy.mockRestore();

    loadMock.mockClear();
    useEditorStore.setState({ workspaceFolder: null });
    render(<ProblemsPanelHost />);
    expect(loadMock).not.toHaveBeenCalled();
  });
});
