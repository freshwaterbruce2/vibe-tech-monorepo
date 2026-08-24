import { useCallback, type RefObject } from 'react';
import type { editor } from 'monaco-editor';

/**
 * Hook that provides common editor actions such as toggling comments,
 * duplicating lines, moving lines up/down, and triggering AI completion.
 * It expects a ref to the monaco editor instance.
 */
export const useEditorActions = (editorRef: RefObject<editor.IStandaloneCodeEditor | null>) => {
  const toggleComment = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.commentLine')?.run();
    }
  }, [editorRef]);

  const duplicateLine = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.copyLinesDownAction')?.run();
    }
  }, [editorRef]);

  const moveLineUp = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.moveLinesUpAction')?.run();
    }
  }, [editorRef]);

  const moveLineDown = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.moveLinesDownAction')?.run();
    }
  }, [editorRef]);

  // Manually trigger the monacopilot inline completion registered during
  // handleEditorMount (useAppHandlers). Monaco renders the suggestion inline;
  // Tab commits it. This is what Ctrl+Space / Cmd+Space invokes.
  const triggerAiCompletion = useCallback(async () => {
    editorRef.current?.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
  }, [editorRef]);

  return { toggleComment, duplicateLine, moveLineUp, moveLineDown, triggerAiCompletion };
};
