/**
 * Regression tests for the Error Fix Assistant "Apply Fix" path.
 *
 * v1.2.1 open item 1: generation worked but Apply silently did nothing.
 * Root causes covered here:
 *  - Bug A: `editor.executeEdits` return value was ignored — a rejected edit
 *           (read-only / stale document) still showed "Fix Applied" and closed
 *           the panel (false success, nothing applied).
 *  - Bug B: after a tab switch the panel survives (old ErrorDetector is
 *           disposed, so onErrorResolved never clears it) and Apply edited the
 *           WRONG file's model at the old line numbers.
 *  - Bug C: runtime errors carry `file: '', line: 0`; getLineMaxColumn(0)
 *           threw on every apply attempt.
 *  - Bug D: missing editor/currentError bailed silently (console-only).
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FixSuggestion } from '../../../services/AutoFixService';
import { useAppHandlers, type UseAppHandlersProps } from '../useAppHandlers';

vi.mock('../../../services/SearchService', () => ({
  SearchService: class {
    searchInFiles = vi.fn();
    replaceInFile = vi.fn();
  },
}));
vi.mock('monacopilot', () => ({ registerCompletion: vi.fn() }));

const FILE_PATH = '/V:/monorepo/apps/demo/src/broken.ts';

function makeSuggestion(overrides: Partial<FixSuggestion> = {}): FixSuggestion {
  return {
    id: 'fix-err-1-1',
    title: 'Add missing import',
    description: 'Adds the missing import',
    code: "import { thing } from './thing';",
    startLine: 3,
    endLine: 3,
    confidence: 'high',
    ...overrides,
  };
}

function makeError(overrides: Record<string, unknown> = {}) {
  return {
    id: 'err-1',
    type: 'typescript',
    severity: 'error',
    message: "Cannot find name 'thing'",
    file: FILE_PATH,
    line: 3,
    column: 1,
    ...overrides,
  } as never;
}

function makeEditor({
  uriPath = FILE_PATH,
  lineCount = 10,
  applied = true,
}: { uriPath?: string; lineCount?: number; applied?: boolean } = {}) {
  const executeEdits = vi.fn().mockReturnValue(applied);
  const model = {
    uri: { path: uriPath },
    getLineCount: vi.fn().mockReturnValue(lineCount),
    getLineMaxColumn: vi.fn().mockReturnValue(42),
  };
  return {
    editor: { getModel: () => model, executeEdits } as never,
    executeEdits,
    model,
  };
}

function makeProps(overrides: Partial<UseAppHandlersProps> = {}): UseAppHandlersProps {
  const noop = vi.fn();
  return {
    aiService: {} as never,
    fileSystemService: { readFile: vi.fn().mockResolvedValue(undefined) } as never,
    multiFileEditor: { applyChanges: vi.fn() } as never,
    multiFileEditPlan: null,
    multiFileChanges: [],
    currentFile: null,
    openFiles: [],
    workspaceFolder: null,
    editorRef: { current: null },
    autoFixServiceRef: { current: null },
    errorDetectorRef: { current: null },
    codeActionProviderRef: { current: null },
    tabCompletionProviderRef: { current: null },
    setCurrentError: vi.fn(),
    setCurrentFix: vi.fn(),
    setErrorFixPanelOpen: vi.fn(),
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
    currentError: makeError(),
    aiChatOpen: false,
    activeVisualPanel: 'none',
    ...overrides,
  } as UseAppHandlersProps;
}

describe('useAppHandlers — Apply Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the edit at the suggestion range and closes the panel', () => {
    const { editor, executeEdits } = makeEditor();
    const props = makeProps({ editorRef: { current: editor } as never });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion());
    });

    expect(executeEdits).toHaveBeenCalledTimes(1);
    const [source, edits] = executeEdits.mock.calls[0];
    expect(source).toBe('auto-fix');
    expect(edits[0].range).toEqual({
      startLineNumber: 3,
      startColumn: 1,
      endLineNumber: 3,
      endColumn: 42,
    });
    expect(props.showSuccess).toHaveBeenCalledWith('Fix Applied', 'Add missing import');
    expect(props.setErrorFixPanelOpen).toHaveBeenCalledWith(false);
    expect(props.setCurrentError).toHaveBeenCalledWith(null);
    expect(props.setCurrentFix).toHaveBeenCalledWith(null);
    expect(props.showError).not.toHaveBeenCalled();
  });

  it('Bug A: surfaces rejected edits instead of false success and keeps the panel open', () => {
    const { editor, executeEdits } = makeEditor({ applied: false });
    const props = makeProps({ editorRef: { current: editor } as never });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion());
    });

    expect(executeEdits).toHaveBeenCalledTimes(1);
    expect(props.showError).toHaveBeenCalledWith(
      'Fix Failed',
      expect.stringContaining('rejected')
    );
    expect(props.showSuccess).not.toHaveBeenCalled();
    expect(props.setErrorFixPanelOpen).not.toHaveBeenCalled();
    expect(props.setCurrentError).not.toHaveBeenCalled();
  });

  it('Bug B: refuses to edit when a different file is active in the editor', () => {
    const { editor, executeEdits } = makeEditor({
      uriPath: '/V:/monorepo/apps/demo/src/other.ts',
    });
    const props = makeProps({ editorRef: { current: editor } as never });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion());
    });

    expect(executeEdits).not.toHaveBeenCalled();
    expect(props.showError).toHaveBeenCalledWith(
      'Fix Failed',
      expect.stringContaining('different file')
    );
    expect(props.setErrorFixPanelOpen).not.toHaveBeenCalled();
  });

  it('Bug C: runtime errors with line 0 fail visibly instead of throwing', () => {
    const { editor, executeEdits } = makeEditor();
    const props = makeProps({
      editorRef: { current: editor } as never,
      currentError: makeError({ type: 'runtime', file: '', line: 0 }),
    });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion({ startLine: 0, endLine: 0 }));
    });

    expect(executeEdits).not.toHaveBeenCalled();
    expect(props.showError).toHaveBeenCalledWith(
      'Fix Failed',
      expect.stringContaining('outside the file')
    );
  });

  it('rejects stale line numbers beyond the current document length', () => {
    const { editor, executeEdits } = makeEditor({ lineCount: 5 });
    const props = makeProps({ editorRef: { current: editor } as never });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion({ startLine: 8, endLine: 9 }));
    });

    expect(executeEdits).not.toHaveBeenCalled();
    expect(props.showError).toHaveBeenCalledWith(
      'Fix Failed',
      expect.stringContaining('outside the file')
    );
  });

  it('Bug D: missing editor surfaces a visible error instead of a silent bail', () => {
    const props = makeProps({ editorRef: { current: null } });
    const { result } = renderHook(() => useAppHandlers(props));

    act(() => {
      result.current.handleApplyFix(makeSuggestion());
    });

    expect(props.showError).toHaveBeenCalledWith(
      'Fix Failed',
      expect.stringContaining('Editor is not ready')
    );
    expect(props.showSuccess).not.toHaveBeenCalled();
  });
});
