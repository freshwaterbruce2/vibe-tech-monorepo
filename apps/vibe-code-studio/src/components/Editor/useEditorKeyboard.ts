/**
 * Editor Keyboard Hook
 * Handles keyboard shortcuts for the editor
 */
import { useCallback, type MutableRefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { editor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

interface UseEditorKeyboardOptions {
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  monacoRef: MutableRefObject<typeof Monaco | null>;
  onSave?: () => void;
  onOpenFindReplace?: () => void;
  onToggleStats?: () => void;
  onOpenInlineEdit?: () => void;
  onCloseAllPanels?: () => void;
}

interface LineCommands {
  toggleComment: () => void;
  duplicateLine: () => void;
  moveLineUp: () => void;
  moveLineDown: () => void;
}

// Toggle comment on the current selection's lines.
function applyToggleComment(
  ed: editor.IStandaloneCodeEditor,
  _monaco: typeof Monaco
): void {
  const model = ed.getModel();
  const selection = ed.getSelection();
  if (!model || !selection) {return;}

  const startLine = selection.startLineNumber;
  const endLine = selection.endLineNumber;

  const edits: { range: Monaco.IRange; text: string }[] = [];

  for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
    const lineContent = model.getLineContent(lineNum);
    const trimmed = lineContent.trimStart();
    const indent = lineContent.length - trimmed.length;

    if (trimmed.startsWith('//')) {
      // Remove comment
      const commentIndex = lineContent.indexOf('//');
      const hasSpace = lineContent[commentIndex + 2] === ' ';
      edits.push({
        range: {
          startLineNumber: lineNum,
          startColumn: commentIndex + 1,
          endLineNumber: lineNum,
          endColumn: commentIndex + 3 + (hasSpace ? 1 : 0),
        },
        text: '',
      });
    } else if (trimmed.length > 0) {
      // Add comment
      edits.push({
        range: {
          startLineNumber: lineNum,
          startColumn: indent + 1,
          endLineNumber: lineNum,
          endColumn: indent + 1,
        },
        text: '// ',
      });
    }
  }

  if (edits.length > 0) {
    ed.executeEdits('toggle-comment', edits);
  }
}

// Duplicate the current line below itself.
function applyDuplicateLine(ed: editor.IStandaloneCodeEditor): void {
  const model = ed.getModel();
  const selection = ed.getSelection();
  if (!model || !selection) {return;}

  const line = selection.startLineNumber;
  const lineContent = model.getLineContent(line);

  ed.executeEdits('duplicate-line', [
    {
      range: {
        startLineNumber: line,
        startColumn: model.getLineMaxColumn(line),
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
      },
      text: `\n${  lineContent}`,
    },
  ]);

  // Move cursor to duplicated line
  ed.setPosition({ lineNumber: line + 1, column: selection.startColumn });
}

// Swap the current line with the line above it.
function applyMoveLineUp(ed: editor.IStandaloneCodeEditor): void {
  const model = ed.getModel();
  const selection = ed.getSelection();
  if (!model || !selection) {return;}

  const line = selection.startLineNumber;
  if (line <= 1) {return;}

  const currentLine = model.getLineContent(line);
  const prevLine = model.getLineContent(line - 1);

  ed.executeEdits('move-line-up', [
    {
      range: {
        startLineNumber: line - 1,
        startColumn: 1,
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
      },
      text: `${currentLine  }\n${  prevLine}`,
    },
  ]);

  ed.setPosition({ lineNumber: line - 1, column: selection.startColumn });
}

// Swap the current line with the line below it.
function applyMoveLineDown(ed: editor.IStandaloneCodeEditor): void {
  const model = ed.getModel();
  const selection = ed.getSelection();
  if (!model || !selection) {return;}

  const line = selection.startLineNumber;
  if (line >= model.getLineCount()) {return;}

  const currentLine = model.getLineContent(line);
  const nextLine = model.getLineContent(line + 1);

  ed.executeEdits('move-line-down', [
    {
      range: {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line + 1,
        endColumn: model.getLineMaxColumn(line + 1),
      },
      text: `${nextLine  }\n${  currentLine}`,
    },
  ]);

  ed.setPosition({ lineNumber: line + 1, column: selection.startColumn });
}

/**
 * Provides the line-manipulation commands (comment, duplicate, move) that
 * operate directly on the Monaco editor model.
 */
function useEditorLineCommands(
  editorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>,
  monacoRef: MutableRefObject<typeof Monaco | null>
): LineCommands {
  const toggleComment = useCallback(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) {return;}
    applyToggleComment(ed, monaco);
  }, [editorRef, monacoRef]);

  const duplicateLine = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {return;}
    applyDuplicateLine(ed);
  }, [editorRef]);

  const moveLineUp = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {return;}
    applyMoveLineUp(ed);
  }, [editorRef]);

  const moveLineDown = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {return;}
    applyMoveLineDown(ed);
  }, [editorRef]);

  return { toggleComment, duplicateLine, moveLineUp, moveLineDown };
}

interface EditorHotkeysOptions {
  toggleComment: () => void;
  duplicateLine: () => void;
  moveLineUp: () => void;
  moveLineDown: () => void;
  onSave?: () => void;
  onOpenFindReplace?: () => void;
  onToggleStats?: () => void;
  onOpenInlineEdit?: () => void;
  onCloseAllPanels?: () => void;
}

/**
 * Registers all editor keyboard shortcuts and wires them to the line
 * commands and panel callbacks.
 */
function useEditorHotkeys(opts: EditorHotkeysOptions) {
  const {
    toggleComment, duplicateLine, moveLineUp, moveLineDown,
    onSave, onOpenFindReplace, onToggleStats, onOpenInlineEdit, onCloseAllPanels,
  } = opts;
  const formTags = { enableOnFormTags: true };
  useHotkeys('ctrl+s, meta+s', (e) => {
    e.preventDefault();
    onSave?.();
  }, formTags);
  useHotkeys('ctrl+/, meta+/', (e) => {
    e.preventDefault();
    toggleComment();
  }, formTags);
  useHotkeys('ctrl+d, meta+d', (e) => {
    e.preventDefault();
    duplicateLine();
  }, formTags);
  useHotkeys('alt+up', (e) => {
    e.preventDefault();
    moveLineUp();
  }, formTags);
  useHotkeys('alt+down', (e) => {
    e.preventDefault();
    moveLineDown();
  }, formTags);
  useHotkeys('ctrl+f, meta+f', (e) => {
    e.preventDefault();
    onOpenFindReplace?.();
  }, formTags);
  useHotkeys('ctrl+h, meta+h', (e) => {
    e.preventDefault();
    onOpenFindReplace?.();
  }, formTags);
  useHotkeys('ctrl+k, meta+k', (e) => {
    e.preventDefault();
    onOpenInlineEdit?.();
  }, formTags);
  useHotkeys('escape', () => {
    onCloseAllPanels?.();
  }, formTags);
  useHotkeys('ctrl+shift+s, meta+shift+s', (e) => {
    e.preventDefault();
    onToggleStats?.();
  }, formTags);
}

export function useEditorKeyboard(options: UseEditorKeyboardOptions) {
  const {
    editorRef,
    monacoRef,
    onSave,
    onOpenFindReplace,
    onToggleStats,
    onOpenInlineEdit,
    onCloseAllPanels,
  } = options;

  const { toggleComment, duplicateLine, moveLineUp, moveLineDown } = useEditorLineCommands(
    editorRef,
    monacoRef
  );

  useEditorHotkeys({
    toggleComment,
    duplicateLine,
    moveLineUp,
    moveLineDown,
    onSave,
    onOpenFindReplace,
    onToggleStats,
    onOpenInlineEdit,
    onCloseAllPanels,
  });

  return {
    toggleComment,
    duplicateLine,
    moveLineUp,
    moveLineDown,
  };
}
