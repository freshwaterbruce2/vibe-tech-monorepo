/**
 * Integration test for the multi-file edit "Apply" path.
 *
 * Regression coverage for the two bugs that previously made Apply silently fail:
 *  - Bug A: `multiFileEditor` was an empty `{}` stub, so `applyChanges` was undefined.
 *  - Bug B: the handler read `window.__multiFileEditPlan` / `window.__multiFileChanges`
 *           globals that nothing ever set, so the plan was always null and Apply aborted.
 *
 * These tests exercise `handleApplyMultiFileChanges` from `useAppHandlers` with the live
 * plan/changes passed in as props (the fix) and a mocked `MultiFileEditor`.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileChange, MultiFileEditPlan } from '@vibetech/types';

import { useAppHandlers, type UseAppHandlersProps } from '../useAppHandlers';
import { useAIStore } from '../../../stores/useAIStore';

// Keep the hook render light: SearchService is instantiated via useMemo on render,
// and monacopilot is an external dep only used inside handleEditorMount.
vi.mock('../../../services/SearchService', () => ({
  SearchService: class {
    searchInFiles = vi.fn();
    replaceInFile = vi.fn();
  },
}));
vi.mock('monacopilot', () => ({ registerCompletion: vi.fn() }));

function makeChange(path: string): FileChange {
  return {
    path,
    originalContent: `// old ${path}`,
    newContent: `// new ${path}`,
    diff: `- // old ${path}\n+ // new ${path}\n`,
    changeType: 'modify',
    reason: 'test',
  } as unknown as FileChange;
}

function makePlan(): MultiFileEditPlan {
  return {
    id: 'plan-1',
    description: 'Test multi-file edit',
    files: [{ path: 'a.ts', reason: 'test' }],
    dependencies: [],
    estimatedImpact: 'low',
    createdAt: new Date(),
  } as unknown as MultiFileEditPlan;
}

function makeProps(overrides: Partial<UseAppHandlersProps> = {}): UseAppHandlersProps {
  const noop = vi.fn();
  const applyChanges = vi.fn().mockResolvedValue({
    success: true,
    appliedFiles: ['a.ts'],
    failedFiles: [],
    rollbackAvailable: false,
  });

  return {
    aiService: {} as never,
    fileSystemService: { readFile: vi.fn().mockResolvedValue(undefined) } as never,
    multiFileEditor: { applyChanges } as never,
    multiFileEditPlan: makePlan(),
    multiFileChanges: [makeChange('a.ts'), makeChange('b.ts')],
    currentFile: null,
    openFiles: [],
    workspaceFolder: null,
    editorRef: { current: null },
    autoFixServiceRef: { current: null },
    errorDetectorRef: { current: null },
    codeActionProviderRef: { current: null },
    tabCompletionProviderRef: { current: null },
    setCurrentError: noop,
    setCurrentFix: noop,
    setErrorFixPanelOpen: noop,
    setFixLoading: noop,
    setFixError: noop,
    setMultiFileEditPlan: vi.fn(),
    setMultiFileChanges: vi.fn(),
    setMultiFileApprovalOpen: vi.fn(),
    setActiveVisualPanel: noop,
    setCurrentModel: noop,
    setCurrentProvider: noop,
    setAiChatOpen: noop,
    setCurrentFile: noop,
    setOpenFiles: noop,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    handleFileChange: noop,
    handleOpenFileRaw: vi.fn().mockResolvedValue(undefined),
    handleAIMessage: vi.fn().mockResolvedValue(undefined),
    currentError: null,
    aiChatOpen: false,
    activeVisualPanel: 'none',
    ...overrides,
  } as UseAppHandlersProps;
}

describe('useAppHandlers — multi-file Apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prove the handler no longer relies on these globals (Bug B).
    delete (window as unknown as Record<string, unknown>)['__multiFileEditPlan'];
    delete (window as unknown as Record<string, unknown>)['__multiFileChanges'];
  });

  it('applies only the selected changes via MultiFileEditor.applyChanges', async () => {
    const props = makeProps();
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleApplyMultiFileChanges(['a.ts']);
    });

    const applyChanges = props.multiFileEditor.applyChanges as ReturnType<typeof vi.fn>;
    expect(applyChanges).toHaveBeenCalledTimes(1);
    const passedChanges = applyChanges.mock.calls[0][0] as FileChange[];
    expect(passedChanges.map(c => c.path)).toEqual(['a.ts']); // 'b.ts' filtered out
  });

  it('closes the panel and reports success on a successful apply', async () => {
    const props = makeProps();
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleApplyMultiFileChanges(['a.ts']);
    });

    expect(props.showSuccess).toHaveBeenCalled();
    expect(props.setMultiFileApprovalOpen).toHaveBeenCalledWith(false);
    expect(props.setMultiFileEditPlan).toHaveBeenCalledWith(null);
    expect(props.setMultiFileChanges).toHaveBeenCalledWith([]);
  });

  it('does not call applyChanges when there is no plan (Bug B guard)', async () => {
    const props = makeProps({ multiFileEditPlan: null });
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleApplyMultiFileChanges(['a.ts']);
    });

    expect(props.multiFileEditor.applyChanges).not.toHaveBeenCalled();
  });

  it('surfaces an error when applyChanges fails', async () => {
    const failing = vi.fn().mockResolvedValue({
      success: false,
      appliedFiles: [],
      failedFiles: [{ path: 'a.ts', error: 'boom' }],
      error: 'boom',
      rollbackAvailable: false,
    });
    const props = makeProps({ multiFileEditor: { applyChanges: failing } as never });
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleApplyMultiFileChanges(['a.ts']);
    });

    expect(failing).toHaveBeenCalled();
    expect(props.showError).toHaveBeenCalledWith('Apply Failed', 'boom');
  });

  it('rejecting clears plan/changes and closes the panel', () => {
    const props = makeProps();
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleRejectMultiFileChanges();
    });

    expect(props.setMultiFileApprovalOpen).toHaveBeenCalledWith(false);
    expect(props.setMultiFileEditPlan).toHaveBeenCalledWith(null);
    expect(props.setMultiFileChanges).toHaveBeenCalledWith([]);
  });
});

describe('useAppHandlers — model change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAIStore.getState().actions.setModel('moonshot/kimi-2.5-pro');
  });

  it('persists the selected model to the AI store and the service', async () => {
    const setModel = vi.fn();
    const setCurrentModel = vi.fn();
    const props = makeProps({
      aiService: { setModel } as never,
      setCurrentModel,
    });
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleModelChange({ id: 'openai/gpt-5.2' } as never);
    });

    expect(setCurrentModel).toHaveBeenCalledWith('openai/gpt-5.2');
    expect(setModel).toHaveBeenCalledWith('openai/gpt-5.2');
    expect(useAIStore.getState().currentModel).toBe('openai/gpt-5.2');
  });

  it('surfaces an error when the AI service rejects the model', async () => {
    const setModel = vi.fn(() => {
      throw new Error('bad model');
    });
    const showError = vi.fn();
    const props = makeProps({ aiService: { setModel } as never, showError });
    const { result } = renderHook(() => useAppHandlers(props));

    await act(async () => {
      await result.current.handleModelChange({ id: 'openai/gpt-5.2' } as never);
    });

    expect(showError).toHaveBeenCalledWith('Model Error', 'bad model');
  });
});
