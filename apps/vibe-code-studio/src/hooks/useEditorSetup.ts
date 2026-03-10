import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

/**
 * Minimal editor setup hook used by Editor.tsx.
 * Keeps a shared ref to the Monaco editor instance and forwards the mount callback.
 */
export function useEditorSetup(
  _file: { path: string } | null,
  _deepSeekService?: unknown,
  onEditorMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void,
  liveStream?: { setEditor?: (editor: editor.IStandaloneCodeEditor) => void }
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editorInstance;

    // Provide editor to live stream service if available
    if (liveStream && typeof liveStream.setEditor === 'function') {
      liveStream.setEditor(editorInstance);
    }

    // Call upstream mount handler
    onEditorMount?.(editorInstance, monaco);
  };

  // Expose ref and mount handler
  return {
    editorRef,
    handleEditorDidMount,
  };
}

export type UseEditorSetupReturn = ReturnType<typeof useEditorSetup>;
