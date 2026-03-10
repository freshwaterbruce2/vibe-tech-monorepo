import type { RefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { editor } from 'monaco-editor';

export function useEditorShortcuts(editorRef: RefObject<editor.IStandaloneCodeEditor | null>) {
  // Toggle comment
  useHotkeys('ctrl+/, cmd+/', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.commentLine')?.run();
    }
  });

  // Duplicate line
  useHotkeys('ctrl+d, cmd+d', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.copyLinesDownAction')?.run();
    }
  });

  // Move line up
  useHotkeys('alt+up', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.moveLinesUpAction')?.run();
    }
  });

  // Move line down
  useHotkeys('alt+down', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.moveLinesDownAction')?.run();
    }
  });

  // Format document
  useHotkeys('shift+alt+f, shift+option+f', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.formatDocument')?.run();
    }
  });

  // Go to line
  useHotkeys('ctrl+g, cmd+g', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.gotoLine')?.run();
    }
  });

  // Select all occurrences
  useHotkeys('ctrl+shift+l, cmd+shift+l', (e) => {
    e.preventDefault();
    const editorInstance = editorRef.current;
    if (editorInstance) {
      editorInstance.getAction('editor.action.selectHighlights')?.run();
    }
  });

  return null;
}
