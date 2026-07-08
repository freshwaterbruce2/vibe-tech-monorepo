/**
 * useAgentsMdCommands tests — spec 03 AC #11 palette surfacing.
 *
 * Covers the no-workspace guard, load-on-workspace, run entries (action →
 * runAgentsMdCommand through startTaskSafely), cancel entries for running
 * labels (action → cancelWorkspaceTask), reload on standards-settings change,
 * and the unmount/stale-load guard.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadMock, runMock, cancelMock } = vi.hoisted(() => ({
  loadMock: vi.fn(),
  runMock: vi.fn(),
  cancelMock: vi.fn(),
}));

vi.mock('../../services/tasks/taskRunnerIntegration', () => ({
  loadAgentsMdCommands: loadMock,
  runAgentsMdCommand: runMock,
  cancelWorkspaceTask: cancelMock,
}));

import { useAgentsMdCommands } from '../../hooks/useAgentsMdCommands';
import {
  resetStandardsSettingsForTests,
  setStandardsSetting,
} from '../../services/ai/standards/standardsSettings';
import type { AgentsMdCommand } from '../../services/tasks/agentsMdCommands';
import { useEditorStore } from '../../stores/useEditorStore';
import { useTasksStore } from '../../stores/tasksStore';

const WS = 'C:/ws';
const BUILD: AgentsMdCommand = { id: 'c1', command: 'pnpm build', sourcePath: `${WS}/AGENTS.md` };

beforeEach(() => {
  delete (window as unknown as { electron?: unknown }).electron;
  localStorage.clear();
  resetStandardsSettingsForTests();
  useEditorStore.setState({ workspaceFolder: null });
  useTasksStore.setState({ tasks: [], running: {}, lastExitCodes: {}, loadError: null });
  loadMock.mockReset().mockResolvedValue([BUILD]);
  runMock.mockReset().mockResolvedValue(0);
  cancelMock.mockReset().mockReturnValue(true);
});

describe('useAgentsMdCommands', () => {
  it('returns no commands and never loads without a workspace folder', () => {
    const { result } = renderHook(() => useAgentsMdCommands());

    expect(result.current).toEqual([]);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it('surfaces run entries for parsed commands once the workspace loads', async () => {
    useEditorStore.setState({ workspaceFolder: WS });

    const { result } = renderHook(() => useAgentsMdCommands());

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(loadMock).toHaveBeenCalledWith(WS);
    const entry = result.current[0];
    expect(entry).toMatchObject({
      id: 'agents-md-run-c1',
      title: 'AGENTS.md: Run "pnpm build"',
      description: `From ${WS}/AGENTS.md`,
      category: 'Tasks',
    });

    act(() => entry.action());
    await waitFor(() => expect(runMock).toHaveBeenCalledWith(BUILD, WS));
  });

  it('shows a cancel entry while the command label is running', async () => {
    useEditorStore.setState({ workspaceFolder: WS });
    useTasksStore.setState({
      running: { 'AGENTS.md: pnpm build': { sessionId: 's1', startedAt: 1 } },
    });

    const { result } = renderHook(() => useAgentsMdCommands());

    await waitFor(() => expect(result.current).toHaveLength(1));
    const entry = result.current[0];
    expect(entry).toMatchObject({
      id: 'agents-md-cancel-c1',
      title: 'AGENTS.md: Cancel "pnpm build"',
    });

    act(() => entry.action());
    expect(cancelMock).toHaveBeenCalledWith('AGENTS.md: pnpm build');
  });

  it('reloads when the standards settings change (toggle flip)', async () => {
    useEditorStore.setState({ workspaceFolder: WS });
    const { result } = renderHook(() => useAgentsMdCommands());
    await waitFor(() => expect(result.current).toHaveLength(1));

    loadMock.mockResolvedValue([]);
    await act(async () => {
      await setStandardsSetting('agentsMdCommands', false);
    });

    await waitFor(() => expect(result.current).toEqual([]));
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it('ignores loads that resolve after unmount (stale-load guard)', async () => {
    useEditorStore.setState({ workspaceFolder: WS });
    let resolveLoad: (commands: AgentsMdCommand[]) => void = () => undefined;
    loadMock.mockImplementation(
      () => new Promise<AgentsMdCommand[]>(resolve => (resolveLoad = resolve))
    );

    const { result, unmount } = renderHook(() => useAgentsMdCommands());
    expect(result.current).toEqual([]);

    unmount();
    await act(async () => {
      resolveLoad([BUILD]);
      await Promise.resolve();
    });

    // No state update after unmount — nothing throws, list stayed empty.
    expect(result.current).toEqual([]);
  });
});
