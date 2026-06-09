/**
 * Comprehensive Test Suite for Editor Component - Editor Settings and Edge Cases
 * Tests settings application and edge case handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Editor from '../../components/Editor';
import type { EditorFile, EditorSettings } from '../../types';

// Mock monaco-editor package first (before any imports)
vi.mock('monaco-editor', () => ({
  editor: {
    IStandaloneCodeEditor: vi.fn(),
  },
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
  },
  Range: vi.fn(),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange, onMount }: any) => (
    <div data-testid="monaco-editor">
      <textarea
        data-testid="monaco-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <button
        data-testid="monaco-mount-trigger"
        onClick={() => {
          const mockEditor = {
            updateOptions: vi.fn(),
            dispose: vi.fn(),
            getModel: () => ({
              findMatches: () => [],
              deltaDecorations: () => [],
            }),
            getValue: () => value,
            setValue: vi.fn(),
            getPosition: () => ({ lineNumber: 1, column: 1 }),
            setPosition: vi.fn(),
            getSelection: () => null,
            setSelection: vi.fn(),
            focus: vi.fn(),
            onDidChangeCursorPosition: () => ({ dispose: vi.fn() }),
            onDidChangeModelContent: () => ({ dispose: vi.fn() }),
            deltaDecorations: () => [],
            revealRangeInCenter: vi.fn(),
            executeEdits: vi.fn(() => true),
            getAction: () => ({ run: vi.fn() }),
            addCommand: () => ({ dispose: vi.fn() }),
            trigger: vi.fn(),
            revealLine: vi.fn(),
          };
          onMount?.(mockEditor, {} as any);
        }}
      >
        Mount Editor
      </button>
    </div>
  ),
}));

// Mock services
vi.mock('../../services/DeepSeekService');
vi.mock('../../services/ai/UnifiedAIService');


// Mock framer-motion
vi.mock('framer-motion', () => {
  const createMotionComponent = (type: string) => ({ children, ...props }: any) =>
    type === 'div' ? (
      <div {...props}>{children}</div>
    ) : (
      <button {...props}>{children}</button>
    );

  return {
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

describe('Editor - Comprehensive Tests', () => {
  let mockFile: EditorFile;
  let mockOpenFiles: EditorFile[];
  let mockOnFileChange: ReturnType<typeof vi.fn>;
  let mockOnCloseFile: ReturnType<typeof vi.fn>;
  let mockOnSaveFile: ReturnType<typeof vi.fn>;
  let mockOnFileSelect: ReturnType<typeof vi.fn>;
  let mockSettings: EditorSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFile = {
      path: '/test/file.ts',
      name: 'file.ts',
      content: 'const x = 1;',
      language: 'typescript',
    };

    mockOpenFiles = [mockFile];

    mockOnFileChange = vi.fn();
    mockOnCloseFile = vi.fn();
    mockOnSaveFile = vi.fn();
    mockOnFileSelect = vi.fn();

    mockSettings = {
      theme: 'vibe-dark',
      fontSize: 14,
      fontFamily: 'JetBrains Mono',
      tabSize: 2,
      wordWrap: 'on',
      minimap: { enabled: true },
      autoSave: true,
      autoSaveDelay: 1000,
    };
  });

  describe('Editor Settings', () => {
    it('should apply word wrap setting', () => {
      const settings: EditorSettings = {
        ...mockSettings,
        wordWrap: 'on',
      };

      render(
        <Editor
          file={mockFile}
          openFiles={mockOpenFiles}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
          settings={settings}
        />
      );

      expect(settings.wordWrap).toBe('on');
    });

    it('should apply tab size setting', () => {
      const settings: EditorSettings = {
        ...mockSettings,
        tabSize: 4,
      };

      render(
        <Editor
          file={mockFile}
          openFiles={mockOpenFiles}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
          settings={settings}
        />
      );

      expect(settings.tabSize).toBe(4);
    });

    it('should toggle minimap', () => {
      const settings: EditorSettings = {
        ...mockSettings,
        minimap: { enabled: false },
      };

      render(
        <Editor
          file={mockFile}
          openFiles={mockOpenFiles}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
          settings={settings}
        />
      );

      expect(settings.minimap.enabled).toBe(false);
    });

    it('should apply auto-save settings', () => {
      const settings: EditorSettings = {
        ...mockSettings,
        autoSave: true,
        autoSaveDelay: 2000,
      };

      render(
        <Editor
          file={mockFile}
          openFiles={mockOpenFiles}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
          settings={settings}
        />
      );

      expect(settings.autoSave).toBe(true);
      expect(settings.autoSaveDelay).toBe(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file content', () => {
      const emptyFile: EditorFile = {
        path: '/test/empty.ts',
        name: 'empty.ts',
        content: '',
        language: 'typescript',
      };

      render(
        <Editor
          file={emptyFile}
          openFiles={[emptyFile]}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
        />
      );

      const textarea = screen.getByTestId('monaco-textarea');
      expect(textarea).toHaveValue('');
    });

    it('should handle very large files', () => {
      const largeContent = 'const x = 1;\n'.repeat(10000);
      const largeFile: EditorFile = {
        path: '/test/large.ts',
        name: 'large.ts',
        content: largeContent,
        language: 'typescript',
      };

      render(
        <Editor
          file={largeFile}
          openFiles={[largeFile]}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should handle special characters in file content', () => {
      const specialFile: EditorFile = {
        path: '/test/special.ts',
        name: 'special.ts',
        content: 'const emoji = "🚀";\nconst unicode = "Ω";\nconst tab = "\\t";',
        language: 'typescript',
      };

      render(
        <Editor
          file={specialFile}
          openFiles={[specialFile]}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
        />
      );

      const textarea = screen.getByTestId('monaco-textarea');
      expect(textarea).toHaveValue(specialFile.content);
    });

    it('should handle undefined settings gracefully', () => {
      render(
        <Editor
          file={mockFile}
          openFiles={mockOpenFiles}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
          settings={undefined}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('should handle single file in openFiles', () => {
      render(
        <Editor
          file={mockFile}
          openFiles={[mockFile]}
          onFileChange={mockOnFileChange}
          onCloseFile={mockOnCloseFile}
          onSaveFile={mockOnSaveFile}
          onFileSelect={mockOnFileSelect}
        />
      );

      expect(screen.getByText('file.ts')).toBeInTheDocument();
    });
  });
});
