import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAppServices } from '../useAppServices';
import { unifiedAI } from '../../../../services/ai/UnifiedAIService';
import { useAIStore } from '../../../../stores/useAIStore';

// Mock all services
vi.mock('../../../services/ai/UnifiedAIService');
vi.mock('../../../services/FileSystemService');
vi.mock('../../../services/WorkspaceService');
vi.mock('../../../services/GitService');
vi.mock('../../../services/MultiFileEditor');
vi.mock('../../../services/ai/TaskPlanner');
vi.mock('../../../services/LiveEditorStream');
vi.mock('../../../services/ai/ExecutionEngine');
vi.mock('../../../services/BackgroundAgentSystem');

describe('useAppServices', () => {
  it('initializes all services', () => {
    const { result } = renderHook(() => useAppServices());

    expect(result.current.aiService).toBeDefined();
    expect(result.current.fileSystemService).toBeDefined();
    expect(result.current.workspaceService).toBeDefined();
    expect(result.current.gitService).toBeDefined();
    expect(result.current.multiFileEditor).toBeDefined();
    expect(result.current.taskPlanner).toBeDefined();
    expect(result.current.liveStream).toBeDefined();
    expect(result.current.executionEngine).toBeDefined();
    expect(result.current.backgroundAgentSystem).toBeDefined();
  });

  it('syncs the persisted model to the AI service on mount and on later changes', async () => {
    const setModelSpy = vi.spyOn(unifiedAI, 'setModel');
    useAIStore.getState().actions.setModel('moonshot/kimi-2.5-pro');

    const { unmount } = renderHook(() => useAppServices());

    // Boot: the service adopts the persisted selection.
    expect(setModelSpy).toHaveBeenCalledWith('moonshot/kimi-2.5-pro');

    // Live change: a later store update propagates via the subscription.
    await act(async () => {
      useAIStore.getState().actions.setModel('openai/gpt-5.2');
    });
    expect(setModelSpy).toHaveBeenCalledWith('openai/gpt-5.2');

    unmount();
    setModelSpy.mockRestore();
  });

  it('surfaces an AI initialization failure via serviceError', async () => {
    const initSpy = vi.spyOn(unifiedAI, 'initialize').mockRejectedValueOnce(new Error('init boom'));

    const { result } = renderHook(() => useAppServices());

    await waitFor(() => expect(result.current.serviceError).toBe('init boom'));

    initSpy.mockRestore();
  });
});
