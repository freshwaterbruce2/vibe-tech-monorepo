/**
 * Editor State Hook
 * Manages editor state including completion stats, find/replace, and inline edit
 */
import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { editor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

import { trackCompletionAction } from '../../services/ai/completionTracker';

import type { CompletionStats, CursorPosition, FindMatchState, PrefetchStats, PrefetchStatus } from './types';

interface UseEditorStateOptions {
  onSaveFile?: () => void;
}

interface CompletionControlsArgs {
  setCompletionStats: React.Dispatch<React.SetStateAction<CompletionStats>>;
  setHasActiveCompletion: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCompletionStats: React.Dispatch<React.SetStateAction<boolean>>;
  setPrefetchStats: React.Dispatch<React.SetStateAction<PrefetchStats>>;
}

/**
 * Builds the completion/prefetch stat tracking callbacks.
 */
function useCompletionControls({
  setCompletionStats,
  setHasActiveCompletion,
  setShowCompletionStats,
  setPrefetchStats,
}: CompletionControlsArgs) {
  // Track completion acceptance
  const trackAcceptance = useCallback(() => {
    trackCompletionAction(true);
    setCompletionStats((prev) => ({
      ...prev,
      accepted: prev.accepted + 1,
    }));
    setHasActiveCompletion(false);
  }, [setCompletionStats, setHasActiveCompletion]);

  // Track completion rejection
  const trackRejection = useCallback(() => {
    trackCompletionAction(false);
    setCompletionStats((prev) => ({
      ...prev,
      rejected: prev.rejected + 1,
    }));
    setHasActiveCompletion(false);
  }, [setCompletionStats, setHasActiveCompletion]);

  // Update completion stats
  const updateCompletionStats = useCallback((stats: Partial<CompletionStats>) => {
    setCompletionStats((prev) => ({ ...prev, ...stats }));
  }, [setCompletionStats]);

  // Update prefetch stats
  const updatePrefetchStats = useCallback((stats: Partial<PrefetchStats>) => {
    setPrefetchStats((prev) => ({ ...prev, ...stats }));
  }, [setPrefetchStats]);

  // Toggle completion stats overlay
  const toggleCompletionStats = useCallback(() => {
    setShowCompletionStats((prev) => !prev);
  }, [setShowCompletionStats]);

  return {
    trackAcceptance,
    trackRejection,
    updateCompletionStats,
    updatePrefetchStats,
    toggleCompletionStats,
  };
}

interface PanelControlsArgs {
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  decorationsRef: MutableRefObject<string[]>;
  findReplaceOpen: boolean;
  inlineEditOpen: boolean;
  setFindReplaceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFindMatches: React.Dispatch<React.SetStateAction<FindMatchState>>;
  setInlineEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCode: React.Dispatch<React.SetStateAction<string>>;
  onSaveFile?: () => void;
}

/**
 * Builds the find/replace, inline-edit, save, and panel-close callbacks.
 */
function usePanelControls(args: PanelControlsArgs) {
  const {
    editorRef, decorationsRef, findReplaceOpen, inlineEditOpen,
    setFindReplaceOpen, setFindMatches, setInlineEditOpen, setSelectedCode, onSaveFile,
  } = args;
  const openFindReplace = useCallback(() => {
    setFindReplaceOpen(true);
  }, [setFindReplaceOpen]);

  const closeFindReplace = useCallback(() => {
    setFindReplaceOpen(false);
    // Clear decorations
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
    setFindMatches({ current: 0, total: 0 });
  }, [editorRef, decorationsRef, setFindReplaceOpen, setFindMatches]);

  const openInlineEdit = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {return;}
    const selection = ed.getSelection();
    if (selection && !selection.isEmpty()) {
      const model = ed.getModel();
      if (model) {
        const selectedText = model.getValueInRange(selection);
        setSelectedCode(selectedText);
        setInlineEditOpen(true);
      }
    }
  }, [editorRef, setSelectedCode, setInlineEditOpen]);

  const closeInlineEdit = useCallback(() => {
    setInlineEditOpen(false);
    setSelectedCode('');
  }, [setInlineEditOpen, setSelectedCode]);

  const handleSave = useCallback(() => {
    onSaveFile?.();
  }, [onSaveFile]);

  const closeAllPanels = useCallback(() => {
    if (findReplaceOpen) {closeFindReplace();}
    if (inlineEditOpen) {closeInlineEdit();}
  }, [findReplaceOpen, inlineEditOpen, closeFindReplace, closeInlineEdit]);

  return {
    openFindReplace,
    closeFindReplace,
    openInlineEdit,
    closeInlineEdit,
    handleSave,
    closeAllPanels,
  };
}

/**
 * Declares all editor refs and local state for the editor hook.
 */
function useEditorStateValues() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showAiStatus, setShowAiStatus] = useState(false);
  const [hasActiveCompletion, setHasActiveCompletion] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findMatches, setFindMatches] = useState<FindMatchState>({ current: 0, total: 0 });
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats>({
    totalSuggestions: 0,
    accepted: 0,
    rejected: 0,
    avgLatency: 0,
  });
  const [prefetchStats, setPrefetchStats] = useState<PrefetchStats>({
    cacheSize: 0,
    queueSize: 0,
    activeCount: 0,
    hitRate: 0,
    avgLatency: 0,
    memoryUsageMB: 0,
  });
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle');
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');

  return {
    editorRef, monacoRef, decorationsRef,
    aiSuggestion, setAiSuggestion,
    showAiStatus, setShowAiStatus,
    hasActiveCompletion, setHasActiveCompletion,
    cursorPosition, setCursorPosition,
    findReplaceOpen, setFindReplaceOpen,
    findMatches, setFindMatches,
    showCompletionStats, setShowCompletionStats,
    completionStats, setCompletionStats,
    prefetchStats, setPrefetchStats,
    prefetchStatus, setPrefetchStatus,
    inlineEditOpen, setInlineEditOpen,
    selectedCode, setSelectedCode,
  };
}

export function useEditorState(options: UseEditorStateOptions = {}) {
  const { onSaveFile } = options;
  const v = useEditorStateValues();

  const completionControls = useCompletionControls({
    setCompletionStats: v.setCompletionStats,
    setHasActiveCompletion: v.setHasActiveCompletion,
    setShowCompletionStats: v.setShowCompletionStats,
    setPrefetchStats: v.setPrefetchStats,
  });

  const panelControls = usePanelControls({
    editorRef: v.editorRef,
    decorationsRef: v.decorationsRef,
    findReplaceOpen: v.findReplaceOpen,
    inlineEditOpen: v.inlineEditOpen,
    setFindReplaceOpen: v.setFindReplaceOpen,
    setFindMatches: v.setFindMatches,
    setInlineEditOpen: v.setInlineEditOpen,
    setSelectedCode: v.setSelectedCode,
    onSaveFile,
  });

  return {
    ...v,
    ...completionControls,
    ...panelControls,
  };
}
