/**
 * useEditorMountHandler - Editor mount, auto-fix, and code insertion handlers
 */

import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { registerCompletion } from 'monacopilot';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import type * as MonacoNS from 'monaco-editor';
import { AutoFixCodeActionProvider } from '../../services/AutoFixCodeActionProvider';
import type { FixSuggestion, GeneratedFix } from '../../services/AutoFixService';
import { AutoFixService } from '../../services/AutoFixService';
import type { DetectedError } from '../../services/ErrorDetector';
import { ErrorDetector } from '../../services/ErrorDetector';
import { logger } from '../../services/Logger';
import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';
import type { EditorFile } from '../../types';

export interface UseEditorMountHandlerProps {
  aiService: UnifiedAIService;
  currentFile: EditorFile | null;
  currentError: DetectedError | null;

  editorRef: MutableRefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;
  autoFixServiceRef: MutableRefObject<AutoFixService | null>;
  errorDetectorRef: MutableRefObject<ErrorDetector | null>;
  codeActionProviderRef: MutableRefObject<{ dispose: () => void } | null>;
  tabCompletionProviderRef: MutableRefObject<{ dispose: () => void } | null>;

  setCurrentError: Dispatch<SetStateAction<DetectedError | null>>;
  setCurrentFix: (fix: GeneratedFix | null) => void;
  setErrorFixPanelOpen: (open: boolean) => void;
  setFixLoading: (loading: boolean) => void;
  setFixError: (error: string) => void;

  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

export function useEditorMountHandler(props: UseEditorMountHandlerProps) {
  const {
    aiService,
    currentFile,
    currentError,
    editorRef,
    autoFixServiceRef,
    errorDetectorRef,
    codeActionProviderRef,
    tabCompletionProviderRef,
    setCurrentError,
    setCurrentFix,
    setErrorFixPanelOpen,
    setFixLoading,
    setFixError,
    showSuccess,
    showError,
  } = props;

  // Handle editor mount - initialize error detection
  const handleEditorMount = useCallback((editor: MonacoEditorNS.IStandaloneCodeEditor | unknown, monaco: typeof MonacoNS | unknown) => {
    const typedEditor = editor as MonacoEditorNS.IStandaloneCodeEditor;
    const typedMonaco = monaco as typeof MonacoNS;
    logger.debug('[AutoFix] Editor mounted, initializing error detection');
    editorRef.current = typedEditor;

    // Clean up previous instances to avoid leaks and stale listeners
    errorDetectorRef.current?.dispose();
    codeActionProviderRef.current?.dispose();
    tabCompletionProviderRef.current?.dispose();

    // Initialize AutoFixService
    autoFixServiceRef.current = new AutoFixService(aiService);

    // Initialize ErrorDetector
    errorDetectorRef.current = new ErrorDetector({
      editor: typedEditor,
      monaco: typedMonaco,
      onError: (error: DetectedError) => {
        if (typeof window !== 'undefined' && (window as any).env?.VITE_DEEPSEEK_API_KEY === 'mock-deepseek-key-123') {
          logger.debug('[AutoFix] Skipping error fix generation in E2E tests to avoid connection starvation');
          return;
        }
        logger.debug('[AutoFix] Error detected:', error);
        setCurrentError(error);
        setErrorFixPanelOpen(true);
        setFixLoading(true);
        setFixError('');
        setCurrentFix(null);

        autoFixServiceRef.current?.generateFix(error, typedEditor)
          .then((fix) => {
            setCurrentFix(fix);
            setFixLoading(false);
          })
          .catch((err) => {
            setFixError(err.message ?? 'Failed to generate fix');
            setFixLoading(false);
          });
      },
      onErrorResolved: (errorId: string) => {
        logger.debug('[AutoFix] Error resolved:', errorId);
        setCurrentError((prev) => {
          if (prev?.id === errorId) {
            setErrorFixPanelOpen(false);
            setCurrentFix(null);
            return null;
          }
          return prev;
        });
      },
    });

    // Register Monaco Code Actions Provider
    if (autoFixServiceRef.current && errorDetectorRef.current) {
      const provider = new AutoFixCodeActionProvider({
        autoFixService: autoFixServiceRef.current,
        errorDetector: errorDetectorRef.current,
        onFixApplied: (fixTitle: string) => showSuccess('Fix Applied', fixTitle),
        onFixFailed: (error: Error) => showError('Fix Failed', error.message),
      });

      const disposable = typedMonaco.languages.registerCodeActionProvider('*', provider);
      codeActionProviderRef.current = disposable;
      provider.registerCommandHandlers(typedEditor, typedMonaco);
    }

    // Register Tab Completion Provider (inline completions via monacopilot)
    logger.debug('[TabCompletion] Registering inline completion provider (monacopilot)');
    const completionRegistration = registerCompletion(typedMonaco, typedEditor, {
      language: currentFile?.language || 'typescript',
      requestHandler: async ({ body }) => {
        try {
          const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
          if (isTauri) {
            const { invoke } = await import('@tauri-apps/api/core');
            const { listen } = await import('@tauri-apps/api/event');

            const provider = aiService.activeProvider;
            const model = aiService.getModel();
            const apiKey = await aiService.getApiKeyForCurrentModel();

            if (!apiKey) {
              throw new Error(`API Key not configured for provider: ${provider}`);
            }

            let fullCompletion = '';

            // Set up a listener for streaming tokens
            const unlisten = await listen<{ text: string }>('stream-ghost-text', (event) => {
              fullCompletion += event.payload.text;
            });

            try {
              // Invoke the backend autocomplete streaming command
              await invoke('autocomplete_stream', {
                provider,
                model,
                prompt: `Complete this code:\n\n${body.completionMetadata.textBeforeCursor}`,
                apiKey,
              });
            } finally {
              unlisten();
            }

            return { completion: fullCompletion };
          } else {
            // Browser fallback
            const response = await aiService.complete({
              messages: [{
                role: 'system',
                content: 'You are a code completion assistant. Return ONLY the code that completes the snippet. Do not include markdown formatting or explanations.'
              }, {
                role: 'user',
                content: `Complete this code:\n\n${body.completionMetadata.textBeforeCursor}`
              }],
              maxTokens: 100,
              temperature: 0.2
            });
            return { completion: response.content };
          }
        } catch (error) {
          logger.error('[TabCompletion] Error generating completion:', error);
          return { completion: null, error: String(error) };
        }
      }
    });

    tabCompletionProviderRef.current = {
      dispose: () => completionRegistration.deregister()
    };
    logger.debug('[TabCompletion] Inline completion provider registered successfully');

  }, [aiService, currentFile, currentError, showSuccess, showError, setCurrentError, setCurrentFix, setErrorFixPanelOpen, setFixLoading, setFixError]);

  // Apply suggested fix
  const handleApplyFix = useCallback((suggestion: FixSuggestion) => {
    if (!editorRef.current || !currentError) {
      logger.error('[AutoFix] Cannot apply fix: editor or error not available');
      return;
    }

    try {
      const editor = editorRef.current;
      const model = editor.getModel();

      if (!model) throw new Error('Editor model not available');

      editor.executeEdits('auto-fix', [{
        range: {
          startLineNumber: suggestion.startLine,
          startColumn: 1,
          endLineNumber: suggestion.endLine,
          endColumn: model.getLineMaxColumn(suggestion.endLine),
        },
        text: suggestion.code,
      }]);

      showSuccess('Fix Applied', suggestion.title);
      setErrorFixPanelOpen(false);
      setCurrentError(null);
      setCurrentFix(null);
    } catch (error) {
      logger.error('[AutoFix] Failed to apply fix:', error);
      showError('Fix Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [currentError, showSuccess, showError, setErrorFixPanelOpen, setCurrentError, setCurrentFix]);

  // Insert generated code into editor
  const handleInsertCode = useCallback((code: string) => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      editorRef.current.executeEdits('insert-code', [{
        range: {
          startLineNumber: position?.lineNumber ?? 1,
          startColumn: position?.column ?? 1,
          endLineNumber: position?.lineNumber ?? 1,
          endColumn: position?.column ?? 1,
        },
        text: code,
      }]);
    }
  }, []);

  return {
    handleEditorMount,
    handleApplyFix,
    handleInsertCode,
  };
}
