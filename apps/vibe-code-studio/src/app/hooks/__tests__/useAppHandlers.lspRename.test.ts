/**
 * Spec 07 Phase 1d wiring test: `useAppHandlers` installs an LSP rename sink
 * (via `initLspRenameRequest`) that turns a rename WorkspaceEdit into the
 * existing multi-file preview flow — plan + changes state and the approval
 * panel — instead of applying edits directly.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileChange, MultiFileEditPlan } from '@vibetech/types';

import { invokeRenameRequest, resetLspForTests } from '../../../services/lsp/lspIntegration';
import type { RenameFileEdits } from '../../../services/lsp/lspRename';
import { useAppHandlers, type UseAppHandlersProps } from '../useAppHandlers';

// Keep the hook render light (same seams as useAppHandlers.multiFileApply.test.ts).
vi.mock('../../../services/SearchService', () => ({
  SearchService: class {
    searchInFiles = vi.fn();
    replaceInFile = vi.fn();
  },
}));
vi.mock('monacopilot', () => ({ registerCompletion: vi.fn() }));

const A_PATH = 'C:\\ws\\a.ts';
const renameEdits = (newText: string): RenameFileEdits[] => [
  {
    path: A_PATH,
    edits: [
      {
        range: { start: { line: 0, character: 6 }, end: { line: 0, character: 9 } },
        newText,
      },
    ],
  },
];

function makeProps(overrides: Partial<UseAppHandlersProps> = {}): UseAppHandlersProps {
  const noop = vi.fn();
  return {
    aiService: {} as never,
    fileSystemService: { readFile: vi.fn().mockResolvedValue('const foo = 1;') } as never,
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

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

describe('useAppHandlers — LSP rename wiring (spec 07 Phase 1d)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLspForTests();
  });

  it('previews a rename through the multi-file approval flow', async () => {
    const props = makeProps();
    renderHook(() => useAppHandlers(props));

    act(() => invokeRenameRequest('bar', renameEdits('bar')));

    await waitFor(() => expect(props.setMultiFileApprovalOpen).toHaveBeenCalledWith(true));
    const setPlan = props.setMultiFileEditPlan as ReturnType<typeof vi.fn>;
    const plan = setPlan.mock.calls[0][0] as MultiFileEditPlan;
    expect(plan.description).toBe("Rename symbol to 'bar' across 1 file(s)");
    const setChanges = props.setMultiFileChanges as ReturnType<typeof vi.fn>;
    const changes = setChanges.mock.calls[0][0] as FileChange[];
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      path: A_PATH,
      originalContent: 'const foo = 1;',
      newContent: 'const bar = 1;',
      changeType: 'modify',
    });
    expect(props.showError).not.toHaveBeenCalled();
  });

  it('does nothing when the rename is a no-op everywhere', async () => {
    const props = makeProps();
    renderHook(() => useAppHandlers(props));

    act(() => invokeRenameRequest('foo', renameEdits('foo'))); // identical replacement
    await flush();

    expect(props.setMultiFileEditPlan).not.toHaveBeenCalled();
    expect(props.setMultiFileApprovalOpen).not.toHaveBeenCalled();
    expect(props.showError).not.toHaveBeenCalled();
  });

  it('surfaces a Rename Failed toast when a file cannot be read', async () => {
    const props = makeProps({
      fileSystemService: { readFile: vi.fn().mockResolvedValue(undefined) } as never,
    });
    renderHook(() => useAppHandlers(props));

    act(() => invokeRenameRequest('bar', renameEdits('bar')));

    await waitFor(() =>
      expect(props.showError).toHaveBeenCalledWith('Rename Failed', `Cannot read ${A_PATH}`)
    );
    expect(props.setMultiFileApprovalOpen).not.toHaveBeenCalled();
  });

  it('reports non-Error rejections as Unknown error', async () => {
    const props = makeProps({
      fileSystemService: { readFile: vi.fn().mockRejectedValue('boom') } as never,
    });
    renderHook(() => useAppHandlers(props));

    act(() => invokeRenameRequest('bar', renameEdits('bar')));

    await waitFor(() =>
      expect(props.showError).toHaveBeenCalledWith('Rename Failed', 'Unknown error')
    );
  });
});
