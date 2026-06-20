import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentLoop } from '../useAgentLoop';
import { ComputerUseService } from '@/services/computerUseService';
import { toast } from '@/hooks/use-toast';
import type { AgentAction } from '../types';

const mockedComputerUse = vi.mocked(ComputerUseService);
const mockedToast = vi.mocked(toast);

vi.mock('@/services/computerUseService', () => ({
  ComputerUseService: {
    captureDisplay: vi.fn(),
    getFocusedWindow: vi.fn(),
    callMultimodalLlm: vi.fn(),
    simulateMouseAction: vi.fn(),
    simulateKeyboardAction: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

function buildLlmResponse(action: AgentAction): string {
  return `\`\`\`json\n${JSON.stringify({ thought: 'LLM thought.', action })}\n\`\`\``;
}

describe('useAgentLoop', () => {
  const activeWindow = { title: 'Window', process_name: 'app.exe', pid: 1 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockedComputerUse.captureDisplay.mockResolvedValue('base64-screenshot');
    mockedComputerUse.getFocusedWindow.mockResolvedValue(activeWindow);
    mockedComputerUse.callMultimodalLlm.mockResolvedValue(buildLlmResponse({ type: 'done' }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('updates goal when setGoal is called', () => {
    const { result } = renderHook(() => useAgentLoop());

    act(() => {
      result.current.setGoal('test goal');
    });

    expect(result.current.goal).toBe('test goal');
  });

  it('shows a toast and does not capture the display when starting without a goal', async () => {
    const { result } = renderHook(() => useAgentLoop());

    await act(async () => {
      await result.current.startAgentLoop();
    });

    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Input Required',
        description: 'Please enter a goal first.',
      }),
    );
    expect(mockedComputerUse.captureDisplay).not.toHaveBeenCalled();
  });

  it('captures the display, calls the multimodal LLM, and moves to awaiting_consent', async () => {
    mockedComputerUse.callMultimodalLlm.mockResolvedValue(
      buildLlmResponse({ type: 'mouse', action: 'click', x: 100, y: 200 }),
    );

    const { result } = renderHook(() => useAgentLoop());

    act(() => {
      result.current.setGoal('do something');
    });

    await act(async () => {
      await result.current.startAgentLoop();
    });

    expect(mockedComputerUse.captureDisplay).toHaveBeenCalledTimes(1);
    expect(mockedComputerUse.callMultimodalLlm).toHaveBeenCalledTimes(1);
    expect(result.current.loopStatus).toBe('awaiting_consent');
    expect(result.current.nextAction).toEqual({ type: 'mouse', action: 'click', x: 100, y: 200 });
  });

  it('auto-approves actions after the 1500ms delay when auto mode is enabled', async () => {
    mockedComputerUse.callMultimodalLlm.mockResolvedValue(buildLlmResponse({ type: 'done' }));

    const { result } = renderHook(() => useAgentLoop());

    act(() => {
      result.current.setGoal('auto task');
      result.current.setIsAutoMode(true);
    });

    await act(async () => {
      const startPromise = result.current.startAgentLoop();
      await vi.advanceTimersByTimeAsync(1500);
      await startPromise;
    });

    expect(mockedComputerUse.captureDisplay).toHaveBeenCalledTimes(1);
    expect(mockedComputerUse.callMultimodalLlm).toHaveBeenCalledTimes(1);
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task Complete',
        description: 'The agent has completed the task successfully!',
      }),
    );
    expect(result.current.isLoopRunning).toBe(false);
    expect(result.current.loopStatus).toBe('idle');
  });

  it('approves an action, records history, and schedules the next step after 800ms', async () => {
    mockedComputerUse.callMultimodalLlm
      .mockResolvedValueOnce(buildLlmResponse({ type: 'mouse', action: 'click', x: 10, y: 20 }))
      .mockResolvedValueOnce(buildLlmResponse({ type: 'done' }));

    const { result } = renderHook(() => useAgentLoop());

    act(() => {
      result.current.setGoal('step task');
    });

    await act(async () => {
      await result.current.startAgentLoop();
    });

    expect(result.current.loopStatus).toBe('awaiting_consent');
    const action = result.current.nextAction;
    expect(action).not.toBeNull();

    await act(async () => {
      const approvePromise = result.current.handleApproveAction(action!);
      await vi.advanceTimersByTimeAsync(800);
      await approvePromise;
    });

    expect(mockedComputerUse.simulateMouseAction).toHaveBeenCalledWith('click', 10, 20);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({
      type: 'mouse',
      detail: 'click at (10, 20)',
    });
    expect(mockedComputerUse.captureDisplay).toHaveBeenCalledTimes(2);
    expect(mockedComputerUse.callMultimodalLlm).toHaveBeenCalledTimes(2);
  });

  it('stops the loop when reject is called', async () => {
    mockedComputerUse.callMultimodalLlm.mockResolvedValue(
      buildLlmResponse({ type: 'mouse', action: 'click', x: 5, y: 5 }),
    );

    const { result } = renderHook(() => useAgentLoop());

    act(() => {
      result.current.setGoal('reject task');
    });

    await act(async () => {
      await result.current.startAgentLoop();
    });

    expect(result.current.loopStatus).toBe('awaiting_consent');

    act(() => {
      result.current.handleRejectAction();
    });

    expect(result.current.isLoopRunning).toBe(false);
    expect(result.current.loopStatus).toBe('idle');
    expect(result.current.nextAction).toBeNull();
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Action Rejected',
        description: 'Orchestration loop paused by user.',
      }),
    );
  });

  it('updates currentScreenshot on manual refresh', async () => {
    const { result } = renderHook(() => useAgentLoop());

    await act(async () => {
      await result.current.handleRefreshScreenshot();
    });

    expect(mockedComputerUse.captureDisplay).toHaveBeenCalledTimes(1);
    expect(result.current.currentScreenshot).toBe('base64-screenshot');
  });
});
