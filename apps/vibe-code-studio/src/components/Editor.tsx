import { Editor as MonacoEditor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import styled from 'styled-components';

import { useEditorActions } from '../hooks/useEditorActions';
import { useEditorSetup } from '../hooks/useEditorSetup';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { logger } from '../services/Logger';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';
import { vibeTheme } from '../styles/theme';
import type { EditorFile, EditorSettings, WorkspaceContext } from '../types';

import CompletionIndicator, { CompletionStats } from './CompletionIndicator';
import { InlineEditWidget } from './Editor/InlineEditWidget';
import FileTabs from './FileTabs';
import type { FindOptions } from './FindReplace';
import FindReplace from './FindReplace';
import PrefetchIndicator from './PrefetchIndicator';

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background: ${vibeTheme.colors.primary};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const MonacoContainer = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
  border-radius: ${vibeTheme.borderRadius.medium};
  overflow: hidden;
  margin: ${vibeTheme.spacing.sm};
  box-shadow: ${vibeTheme.shadows.large};
  border: 2px solid rgba(139, 92, 246, 0.1);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    background: ${vibeTheme.gradients.border};
    border-radius: ${vibeTheme.borderRadius.medium};
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: xor;
    -webkit-mask-composite: xor;
    opacity: 0.3;
    z-index: -1;
  }
`;

const NoFilePlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.md};
  gap: ${vibeTheme.spacing.md};

  .icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .message {
    opacity: 0.7;
  }
`;

interface EditorProps {
  file: EditorFile | null;
  openFiles: EditorFile[];
  onFileChange: (content: string) => void;
  onCloseFile: (path: string) => void;
  onSaveFile: () => void;
  onFileSelect: (file: EditorFile) => void;
  aiService?: UnifiedAIService; // Primary AI service for inline completions
  workspaceContext?: WorkspaceContext;
  getFileContext?: ((file: EditorFile) => any[]) | undefined;
  settings?: EditorSettings | undefined;
  liveStream?: any; // PHASE 7: LiveEditorStream instance for live code streaming
  onEditorMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void; // Callback when editor mounts (for Auto-Fix)
  modelStrategy?: 'fast' | 'balanced' | 'accurate' | 'adaptive'; // Multi-model strategy
  currentAIModel?: string; // Current AI model being used
}

const Editor = ({
  file,
  openFiles,
  onFileChange,
  onCloseFile,
  onSaveFile,
  onFileSelect,
  aiService: _aiService,
  workspaceContext: _workspaceContext,
  getFileContext: _getFileContext,
  settings,
  liveStream,
  onEditorMount,
  modelStrategy = 'fast',
  currentAIModel = 'moonshot/kimi-2.5-pro',
}: EditorProps) => {
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findMatches, setFindMatches] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const decorationsRef = useRef<string[]>([]);

  // Week 3: Completion tracking state
  const [hasActiveCompletion, setHasActiveCompletion] = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [completionStats] = useState({ totalSuggestions: 0, accepted: 0, rejected: 0, avgLatency: 0 });

  // Week 4: Prefetch tracking state (kept for compatibility)
  const [showPrefetchIndicator] = useState(false);
  const [prefetchStats] = useState({
    cacheSize: 0,
    queueSize: 0,
    activeCount: 0,
    hitRate: 0,
    avgLatency: 0,
    memoryUsageMB: 0,
  });
  const [prefetchStatus] = useState<'idle' | 'active' | 'learning'>('idle');

  // Inline edit dialog state (Cmd+K)
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [inlineEditPos, setInlineEditPos] = useState({ top: 0, left: 0 });

  // Hook for editor setup and reference
  const { editorRef, handleEditorDidMount } = useEditorSetup(file, undefined, onEditorMount, liveStream);

  // Hook for inline AI editing
  const { startInlineEdit: _startInlineEdit } = useInlineEdit(editorRef);

  // Hook for editor actions
  const { toggleComment, duplicateLine, moveLineUp, moveLineDown, triggerAiCompletion } = useEditorActions(editorRef);

  // Cleanup Monacopilot on unmount (handled inside useEditorSetup)

  // Custom Theme Loader
  useEffect(() => {
    if (settings?.theme === 'custom' && settings?.customThemeJson) {
      import('../utils/themeLoader').then(({ loadCustomTheme }) => {
        loadCustomTheme('custom-user-theme', settings.customThemeJson!).then(success => {
          if (success) {
            import('monaco-editor').then(m => {
              m.editor.setTheme('custom-user-theme');
            });
          }
        });
      });
    }
  }, [settings?.theme, settings?.customThemeJson]);

  // Find/Replace helpers
  const clearFindDecorations = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
  }, [editorRef]);

  // Keyboard shortcuts
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    onSaveFile();
  });

  useHotkeys('ctrl+/, cmd+/', (e) => {
    e.preventDefault();
    toggleComment();
  });

  useHotkeys('ctrl+d, cmd+d', (e) => {
    e.preventDefault();
    duplicateLine();
  });

  useHotkeys('alt+up', (e) => {
    e.preventDefault();
    moveLineUp();
  });

  useHotkeys('alt+down', (e) => {
    e.preventDefault();
    moveLineDown();
  });

  useHotkeys('ctrl+space, cmd+space', (e) => {
    e.preventDefault();
    triggerAiCompletion();
  });

  useHotkeys('ctrl+f, cmd+f', (e) => {
    e.preventDefault();
    setFindReplaceOpen(true);
  });

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    if (editorRef.current) {
        const position = editorRef.current.getPosition();
        if (position) {
            const scroller = editorRef.current.getScrolledVisiblePosition(position);
            if (scroller) {
                // Adjust position to be below the current line
                setInlineEditPos({
                    top: scroller.top + 25,
                    left: Math.min(scroller.left, 500) // Keep it somewhat centered or left-aligned
                });
                setInlineEditOpen(true);
            }
        }
    }
  });

  useHotkeys('ctrl+h, cmd+h', (e) => {
    e.preventDefault();
    setFindReplaceOpen(true);
  });

  useHotkeys('escape', (e) => {
    if (findReplaceOpen) {
      e.preventDefault();
      setFindReplaceOpen(false);
      clearFindDecorations();
    }
  });

  useHotkeys('ctrl+shift+s, cmd+shift+s', (e) => {
    e.preventDefault();
    setShowCompletionStats((prev) => !prev);
  });

  // Placeholder for completion tracking
  useEffect(() => {
    // Legacy tracking placeholder
  }, []);

  const handleFind = useCallback((query: string, options: FindOptions) => {
    if (!editorRef.current) {return;}
    const model = editorRef.current.getModel();
    if (!model) {return;}
    clearFindDecorations();

    if (!query) {
      setFindMatches({ current: 0, total: 0 });
      return;
    }

    const matches = model.findMatches(
      query,
      true,
      options.regex,
      options.caseSensitive,
      options.wholeWord ? '\\b' : null,
      true,
    );
    const decorations = matches.map((match) => ({
      range: match.range,
      options: {
        className: 'find-match-decoration',
        overviewRuler: { color: 'rgba(139, 92, 246, 0.8)', position: 4 /* OverviewRulerLane.Right */ },
      },
    }));
    decorationsRef.current = editorRef.current.deltaDecorations([], decorations);
    setFindMatches({ current: matches.length > 0 ? 1 : 0, total: matches.length });
    if (matches.length > 0) {
      const firstMatch = matches[0];
      if (firstMatch) {
        editorRef.current.revealRangeInCenter(firstMatch.range);
        editorRef.current.setSelection(firstMatch.range);
      }
    }
  }, [clearFindDecorations]);

  const handleReplace = (query: string, replacement: string, options: FindOptions) => {
    if (!editorRef.current) {return;}
    const selection = editorRef.current.getSelection();
    if (!selection) {return;}
    const model = editorRef.current.getModel();
    if (!model) {return;}
    const match = model.findMatches(
      query,
      selection,
      options.regex,
      options.caseSensitive,
      options.wholeWord ? String.raw`\b` : null,
      false
    )[0];
    if (match) {
      editorRef.current.executeEdits('replace', [{ range: match.range, text: replacement }]);
      handleFind(query, options);
    }
  };

  const handleReplaceAll = (query: string, replacement: string, options: FindOptions) => {
    if (!editorRef.current) {return;}
    const model = editorRef.current.getModel();
    if (!model) {return;}
    const matches = model.findMatches(
      query,
      true,
      options.regex,
      options.caseSensitive,
      options.wholeWord ? String.raw`\b` : null,
      true
    );
    const edits = matches.map((match) => ({ range: match.range, text: replacement }));
    editorRef.current.executeEdits('replaceAll', edits);
    clearFindDecorations();
    setFindMatches({ current: 0, total: 0 });
  };

  const handleFindNext = () => {
    if (!editorRef.current) {return;}
    editorRef.current.getAction('actions.find')?.run();
  };

  const handleFindPrevious = () => {
    if (!editorRef.current) {return;}
    editorRef.current.getAction('editor.action.previousMatchFindAction')?.run();
  };

  const handleBeforeMount = (_monaco: typeof Monaco) => {
    logger.debug('[Editor] Monaco editor initialized');
  };

  return (
    <EditorContainer>
      <FileTabs files={openFiles} activeFile={file} onFileSelect={onFileSelect} onCloseFile={onCloseFile} />

      <MonacoContainer>
        {file ? (
          <MonacoEditor
            key={file.path}
            language={file.language}
            value={file.content}
            onChange={(value) => onFileChange(value ?? '')}
            beforeMount={handleBeforeMount}
            onMount={handleEditorDidMount}
            theme={settings?.theme === 'light' ? 'vs' : settings?.theme === 'custom' ? 'custom-user-theme' : 'vs-dark'}
            options={{
              selectOnLineNumbers: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              fontSize: settings?.fontSize ?? 14,
              fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
              fontLigatures: true,
              minimap: { enabled: settings?.minimap !== false, maxColumn: 120, renderCharacters: false, showSlider: 'always' },
              wordWrap: settings?.wordWrap ? 'on' : 'off',
              tabSize: settings?.tabSize ?? 2,
              lineNumbers: 'on',
              lineDecorationsWidth: 12,
              lineNumbersMinChars: 4,
              glyphMargin: true,
              folding: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              contextmenu: true,
              mouseWheelZoom: true,
              multiCursorModifier: 'ctrlCmd',
              formatOnPaste: true,
              formatOnType: true,
              autoIndent: 'full',
              codeLens: true,
              renderWhitespace: 'selection',
              renderLineHighlight: 'all',
              roundedSelection: true,
              matchBrackets: 'always',
              colorDecorators: true,
              quickSuggestions: { other: true, comments: false, strings: false },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
              inlineSuggest: { enabled: true },
              stickyScroll: { enabled: true },
            }}
          />
        ) : (
          <NoFilePlaceholder>
            <div className="icon">📄</div>
            <div className="message">No file selected</div>
            <div className="message" style={{ fontSize: '14px', opacity: 0.5 }}>
              Select a file from the sidebar or open files tabs to start editing
            </div>
          </NoFilePlaceholder>
        )}

        <FindReplace
          isOpen={findReplaceOpen}
          onClose={() => {
            setFindReplaceOpen(false);
            clearFindDecorations();
          }}
          onFind={handleFind}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          onFindNext={handleFindNext}
          onFindPrevious={handleFindPrevious}
          currentMatch={findMatches.current}
          totalMatches={findMatches.total}
        />

        {/* Completion Indicator */}
        <CompletionIndicator
          isActive={hasActiveCompletion}
          model={currentAIModel}
          strategy={modelStrategy}
          hasCompletion={hasActiveCompletion}
          onDismiss={() => setHasActiveCompletion(false)}
        />

        {showCompletionStats && (
          <CompletionStats
            totalSuggestions={completionStats.totalSuggestions}
            accepted={completionStats.accepted}
            rejected={completionStats.rejected}
            avgLatency={completionStats.avgLatency}
            currentModel={currentAIModel}
          />
        )}

        {showPrefetchIndicator && (
          <PrefetchIndicator
            stats={prefetchStats}
            isActive={prefetchStatus === 'active'}
            status={prefetchStatus}
            predictions={[]}
            learningStats={{ patternsLearned: 0, accuracy: prefetchStats.hitRate }}
          />
        )}

        {inlineEditOpen && (
          <InlineEditWidget
            position={inlineEditPos}
            language={file?.language}
            selectedCode={editorRef.current?.getModel()?.getValueInRange(editorRef.current.getSelection()!) ?? ''}
            onClose={() => setInlineEditOpen(false)}
            onAccept={(newCode) => {
              if (editorRef.current) {
                const selection = editorRef.current.getSelection();
                if (selection) {
                  editorRef.current.executeEdits('inline-edit', [{ range: selection, text: newCode }]);
                }
              }
              setInlineEditOpen(false);
            }}
          />
        )}
      </MonacoContainer>
    </EditorContainer>
  );
};

export default Editor;
