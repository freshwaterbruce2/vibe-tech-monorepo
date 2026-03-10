/**
 * useAppHandlers - Event handlers for App.tsx
 * Extracts callback functions for cleaner organization
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import { useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import modelPrompts from '../../config/model-prompts.json';
import type { SearchScope } from '../../components/GlobalSearch/types';
import { AutoFixCodeActionProvider } from '../../services/AutoFixCodeActionProvider';
import type { FixSuggestion, GeneratedFix } from '../../services/AutoFixService';
import { AutoFixService } from '../../services/AutoFixService';
import type { DetectedError } from '../../services/ErrorDetector';
import { ErrorDetector } from '../../services/ErrorDetector';
import { logger } from '../../services/Logger';
import { SearchService } from '../../services/SearchService';
import type { AIModel } from '../../services/ai/AIProviderInterface';
import type { EditorFile } from '../../types';
import type { VisualPanelState } from '../types';
import { registerCompletion } from 'monacopilot';

export interface UseAppHandlersProps {
  // Services
  aiService: any;
  fileSystemService: any;
  multiFileEditor: any;

  // File state
  currentFile: EditorFile | null;
  openFiles: EditorFile[];

  // Workspace
  workspaceFolder: string | null;

  // Refs
  editorRef: MutableRefObject<any>;
  autoFixServiceRef: MutableRefObject<AutoFixService | null>;
  errorDetectorRef: MutableRefObject<ErrorDetector | null>;
  codeActionProviderRef: MutableRefObject<any>;
  tabCompletionProviderRef: MutableRefObject<any>;

  // State setters
  setCurrentError: (error: DetectedError | null) => void;
  setCurrentFix: (fix: GeneratedFix | null) => void;
  setErrorFixPanelOpen: (open: boolean) => void;
  setFixLoading: (loading: boolean) => void;
  setFixError: (error: string) => void;
  setMultiFileEditPlan: (plan: MultiFileEditPlan | null) => void;
  setMultiFileChanges: (changes: FileChange[]) => void;
  setMultiFileApprovalOpen: (open: boolean) => void;
  setActiveVisualPanel: (panel: VisualPanelState) => void;
  setCurrentModel: (model: string) => void;
  setCurrentProvider: (provider: string) => void;
  setAiChatOpen: (open: boolean) => void;
  setCurrentFile: (file: EditorFile | null) => void;
  setOpenFiles: (files: EditorFile[]) => void;

  // Notification handlers
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;

  // Other handlers from other hooks
  handleFileChange: (content: string) => void;
  handleOpenFileRaw: (filePath: string) => Promise<void>;
  handleAIMessage: (message: string) => Promise<void>;

  // Current state for conditionals
  currentError: DetectedError | null;
  aiChatOpen: boolean;
  activeVisualPanel: VisualPanelState;
}

export function useAppHandlers(props: UseAppHandlersProps) {
  const {
    aiService,
    fileSystemService,
    multiFileEditor,
    currentFile,
    // openFiles,
    showSuccess,
    showError,
    showWarning,
    workspaceFolder,
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
    setMultiFileEditPlan,
    setMultiFileChanges,
    setMultiFileApprovalOpen,
    setActiveVisualPanel,
    setCurrentModel,
    setCurrentProvider,
    setAiChatOpen,
    // setCurrentFile,
    // setOpenFiles,
    handleFileChange,
    handleOpenFileRaw,
    handleAIMessage,
    currentError,
    aiChatOpen,
    activeVisualPanel,
  } = props;

  // Search service instance
  const searchService = useMemo(() => new SearchService(fileSystemService), [fileSystemService]);
  const workspaceFileCacheRef = useRef<{
    rootPath: string;
    files: string[];
    scannedAt: number;
  } | null>(null);

  const DIRECTORY_EXCLUDE_SET = useMemo(
    () =>
      new Set([
        'node_modules',
        '.git',
        'dist',
        'dist-electron',
        'build',
        'coverage',
        'out',
        '_backups',
        '.nx',
        '.claude',
        '.deepcode',
      ]),
    []
  );

  const collectWorkspaceFilesRecursively = useCallback(
    async (rootPath: string): Promise<string[]> => {
      const now = Date.now();
      const cache = workspaceFileCacheRef.current;
      if (cache?.rootPath === rootPath && now - cache.scannedAt < 30_000) {
        return cache.files;
      }

      const discoveredFiles: string[] = [];
      const pendingDirectories: string[] = [rootPath];
      const visitedDirectories = new Set<string>();

      while (pendingDirectories.length > 0) {
        const directory = pendingDirectories.pop();
        if (!directory) {
          continue;
        }

        const normalizedDirectory = directory.replace(/\\/g, '/').toLowerCase();
        if (visitedDirectories.has(normalizedDirectory)) {
          continue;
        }
        visitedDirectories.add(normalizedDirectory);

        let entries: Array<{ name: string; path: string; type: 'file' | 'directory' }> = [];
        try {
          entries = await fileSystemService.listDirectory(directory);
        } catch (error) {
          logger.warn(`[Search] Skipping unreadable directory: ${directory}`, error);
          continue;
        }

        for (const entry of entries) {
          if (entry.type === 'directory') {
            if (DIRECTORY_EXCLUDE_SET.has(entry.name.toLowerCase())) {
              continue;
            }
            pendingDirectories.push(entry.path);
            continue;
          }

          discoveredFiles.push(entry.path.replace(/\\/g, '/'));
        }
      }

      workspaceFileCacheRef.current = {
        rootPath,
        files: discoveredFiles,
        scannedAt: Date.now(),
      };

      return discoveredFiles;
    },
    [DIRECTORY_EXCLUDE_SET, fileSystemService]
  );

  // Handle editor mount - initialize error detection
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    logger.debug('[AutoFix] Editor mounted, initializing error detection');
    editorRef.current = editor;

    // Initialize AutoFixService
    autoFixServiceRef.current = new AutoFixService(aiService);

    // Initialize ErrorDetector
    errorDetectorRef.current = new ErrorDetector({
      editor,
      monaco,
      onError: (error: DetectedError) => {
        logger.debug('[AutoFix] Error detected:', error);
        setCurrentError(error);
        setErrorFixPanelOpen(true);
        setFixLoading(true);
        setFixError('');
        setCurrentFix(null);

        autoFixServiceRef.current?.generateFix(error, editor)
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
        if (currentError?.id === errorId) {
          setErrorFixPanelOpen(false);
          setCurrentError(null);
          setCurrentFix(null);
        }
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

      const disposable = monaco.languages.registerCodeActionProvider('*', provider);
      codeActionProviderRef.current = disposable;
      provider.registerCommandHandlers(editor, monaco);
    }

    // Register Tab Completion Provider (inline completions via monacopilot)
    logger.debug('[TabCompletion] Registering inline completion provider (monacopilot)');
    const completionRegistration = registerCompletion(monaco, editor, {
      language: currentFile?.language || 'typescript',
      requestHandler: async ({ body }) => {
        try {
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

  // Handle file open from search
  const handleOpenFileFromSearch = useCallback((file: string, line?: number, column?: number) => {
    handleOpenFileRaw(file);
    if (line && editorRef.current) {
      const targetColumn = column ?? 1;
      setTimeout(() => {
        try {
          editorRef.current?.revealPositionInCenter({ lineNumber: line, column: targetColumn });
          editorRef.current?.setPosition({ lineNumber: line, column: targetColumn });
          editorRef.current?.focus();
        } catch (err) {
          logger.warn('Failed to navigate to position', err);
        }
      }, 50);
    }
  }, [handleOpenFileRaw]);

  // Handle replace in file
  const handleReplaceInFile = useCallback(async (
    file: string,
    searchText: string,
    replaceText: string,
    options: any
  ) => {
    try {
      const result = await searchService.replaceInFile(
        file,
        (searchService as any)['createSearchPattern'](searchText, options),
        replaceText,
        options
      );

      if (result.success && result.replacements > 0) {
        showSuccess('Replace Complete', `Replaced ${result.replacements} occurrences in ${file}`);

        if (currentFile?.path === file) {
          const content = await fileSystemService.readFile(file);
          if (content !== undefined) {
            handleFileChange(content);
          }
        }
      }
    } catch (error) {
      showError('Replace Failed', `Failed to replace in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentFile, fileSystemService, handleFileChange, showSuccess, showError, searchService]);

  // Handle search in files
  const handleSearchInFiles = useCallback(async (
    searchText: string,
    files: string[],
    options: any,
    scope: SearchScope = 'open-files'
  ) => {
    try {
      let filesToSearch = files;

      if (scope === 'workspace-recursive') {
        if (!workspaceFolder) {
          showWarning('Workspace Search Unavailable', 'Open a workspace folder to search recursively.');
          return {};
        }
        filesToSearch = await collectWorkspaceFilesRecursively(workspaceFolder);
      }

      if (filesToSearch.length === 0) {
        return {};
      }

      return await searchService.searchInFiles(searchText, filesToSearch, options);
    } catch (error) {
      logger.error('[Search] Failed to search in files:', error);
      showError('Search Failed', error instanceof Error ? error.message : 'Unknown error');
      return {};
    }
  }, [
    collectWorkspaceFilesRecursively,
    searchService,
    showError,
    showWarning,
    workspaceFolder,
  ]);

  // Visual panel toggles - need activeVisualPanel from props
  const handleToggleScreenshotPanel = useCallback(() => {
    setActiveVisualPanel(activeVisualPanel === 'screenshot' ? 'none' : 'screenshot');
  }, [activeVisualPanel, setActiveVisualPanel]);

  const handleToggleComponentLibrary = useCallback(() => {
    setActiveVisualPanel(activeVisualPanel === 'library' ? 'none' : 'library');
  }, [activeVisualPanel, setActiveVisualPanel]);

  const handleToggleVisualEditor = useCallback(() => {
    setActiveVisualPanel(activeVisualPanel === 'visual' ? 'none' : 'visual');
  }, [activeVisualPanel, setActiveVisualPanel]);

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

  // Multi-File Edit handlers
  const handleApplyMultiFileChanges = useCallback(async (selectedFiles: string[]) => {
    const plan = (window as any).__multiFileEditPlan as MultiFileEditPlan | null;
    const changes = (window as any).__multiFileChanges as FileChange[] || [];

    if (!plan) {
      logger.error('[MultiFileEdit] No plan available');
      return;
    }

    try {
      const selectedChanges = changes.filter(c => selectedFiles.includes(c.path));
      const result = await multiFileEditor.applyChanges(selectedChanges);

      if (result.success) {
        showSuccess('Changes Applied', `Successfully applied changes to ${result.appliedFiles.length} file(s)`);

        if (currentFile && selectedFiles.includes(currentFile.path)) {
          const content = await fileSystemService.readFile(currentFile.path);
          if (content !== undefined) {
            handleFileChange(content);
          }
        }
      } else {
        showError('Apply Failed', result.error ?? 'Unknown error');
      }

      setMultiFileApprovalOpen(false);
      setMultiFileEditPlan(null);
      setMultiFileChanges([]);
    } catch (error) {
      logger.error('[MultiFileEdit] Failed to apply changes:', error);
      showError('Apply Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [multiFileEditor, currentFile, fileSystemService, handleFileChange, showSuccess, showError, setMultiFileApprovalOpen, setMultiFileEditPlan, setMultiFileChanges]);

  const handleRejectMultiFileChanges = useCallback(() => {
    setMultiFileApprovalOpen(false);
    setMultiFileEditPlan(null);
    setMultiFileChanges([]);
    logger.debug('[MultiFileEdit] Changes rejected');
  }, [setMultiFileApprovalOpen, setMultiFileEditPlan, setMultiFileChanges]);

  // Model change handler
  const handleModelChange = useCallback(async (model: AIModel) => {
    setCurrentModel(model.id);
    try {
      await aiService.setModel(model.id);
    } catch (error) {
      showError('Model Error', error instanceof Error ? error.message : 'Failed to update AI model');
    }
  }, [aiService, showError, setCurrentModel]);

  // Provider change handler
  const handleProviderChange = useCallback(async (provider: string) => {
    setCurrentProvider(provider);
    try {
      logger.info(`[App] Switching to provider: ${provider}`);
      showSuccess('Provider Changed', `Switched to ${provider}`);
    } catch (error) {
      showError('Provider Error', error instanceof Error ? error.message : 'Failed to update AI provider');
    }
  }, [showSuccess, showError, setCurrentProvider]);

  // AI Command Handler
  const handleAICommand = useCallback(async (command: string) => {
    if (!currentFile?.content) {
      showWarning('Please open a file first');
      return;
    }

    if (!aiChatOpen) {
      setAiChatOpen(true);
    }

    let prompt = '';
    const selectedCode = currentFile.content;

    switch (command) {
      case 'explain':
        prompt = (modelPrompts as any).explain.replace('${selectedCode}', selectedCode);
        break;
      case 'generate-tests':
        prompt = (modelPrompts as any)['generate-tests'].replace('${selectedCode}', selectedCode);
        break;
      case 'refactor':
        prompt = (modelPrompts as any).refactor.replace('${selectedCode}', selectedCode);
        break;
      case 'fix-bugs':
        prompt = (modelPrompts as any)['fix-bugs'].replace('${selectedCode}', selectedCode);
        break;
      case 'optimize':
        prompt = (modelPrompts as any).optimize.replace('${selectedCode}', selectedCode);
        break;
      case 'add-comments':
        prompt = (modelPrompts as any)['add-comments'].replace('${selectedCode}', selectedCode);
        break;
      case 'generate-component':
        prompt = (modelPrompts as any)['generate-component'];
        break;
      default:
        prompt = selectedCode;
    }

    await handleAIMessage(prompt);
    showSuccess(`AI ${command} command executed`);
  }, [currentFile, aiChatOpen, setAiChatOpen, handleAIMessage, showSuccess, showWarning]);

  // Multi-File Edit Detection Handler
  const handleMultiFileEditDetected = useCallback((plan: any, changes: any[]) => {
    logger.info('[App] Multi-file edit detected:', plan.description);
    setMultiFileEditPlan(plan);
    setMultiFileChanges(changes);
    setMultiFileApprovalOpen(true);
  }, [setMultiFileEditPlan, setMultiFileChanges, setMultiFileApprovalOpen]);

  return {
    handleEditorMount,
    handleApplyFix,
    handleOpenFileFromSearch,
    handleReplaceInFile,
    handleSearchInFiles,
    handleToggleScreenshotPanel,
    handleToggleComponentLibrary,
    handleToggleVisualEditor,
    handleInsertCode,
    handleApplyMultiFileChanges,
    handleRejectMultiFileChanges,
    handleModelChange,
    handleProviderChange,
    handleAICommand,
    handleMultiFileEditDetected,
  };
}
