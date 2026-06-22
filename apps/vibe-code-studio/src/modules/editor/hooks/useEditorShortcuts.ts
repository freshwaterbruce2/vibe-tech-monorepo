import type { RefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { editor } from 'monaco-editor';

/**
 * Prevent the default key behavior and run the named Monaco editor action.
 */
function runEditorAction(
  editorRef: RefObject<editor.IStandaloneCodeEditor | null>,
  actionId: string,
  e: KeyboardEvent
): void {
  e.preventDefault();
  const editorInstance = editorRef.current;
  if (editorInstance) {
    editorInstance.getAction(actionId)?.run();
  }
}

export function useEditorShortcuts(editorRef: RefObject<editor.IStandaloneCodeEditor | null>) {
  // Toggle comment
  useHotkeys('ctrl+/, cmd+/', (e) => runEditorAction(editorRef, 'editor.action.commentLine', e));

  // Duplicate line
  useHotkeys('ctrl+d, cmd+d', (e) =>
    runEditorAction(editorRef, 'editor.action.copyLinesDownAction', e)
  );

  // Move line up
  useHotkeys('alt+up', (e) => runEditorAction(editorRef, 'editor.action.moveLinesUpAction', e));

  // Move line down
  useHotkeys('alt+down', (e) => runEditorAction(editorRef, 'editor.action.moveLinesDownAction', e));

  // Format document
  useHotkeys('shift+alt+f, shift+option+f', (e) =>
    runEditorAction(editorRef, 'editor.action.formatDocument', e)
  );

  // Go to line
  useHotkeys('ctrl+g, cmd+g', (e) => runEditorAction(editorRef, 'editor.action.gotoLine', e));

  // Select all occurrences
  useHotkeys('ctrl+shift+l, cmd+shift+l', (e) =>
    runEditorAction(editorRef, 'editor.action.selectHighlights', e)
  );

  return null;
}
