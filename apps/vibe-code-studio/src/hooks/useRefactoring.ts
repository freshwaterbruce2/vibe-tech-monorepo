/**
 * useRefactoring Hook
 * Provides AI-powered refactoring capabilities for code editing
 */

import * as monaco from 'monaco-editor';
import { useCallback, useState } from 'react';

import { logger } from '../services/Logger';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';

export type RefactoringType =
  | 'extract-function'
  | 'extract-method'
  | 'rename'
  | 'convert-arrow'
  | 'add-types'
  | 'split-file'
  | 'inline-variable'
  | 'move-to-file';

export interface RefactoringAction {
  id: string;
  type: RefactoringType;
  label: string;
  description: string;
  icon: string;
  range: monaco.Range;
  originalCode: string;
  suggestedCode?: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedCost?: number;
}

export interface RefactoringResult {
  action: RefactoringAction;
  code: string;
  explanation: string;
  modelUsed: string;
  generationTime: number;
}

interface UseRefactoringProps {
  aiService: UnifiedAIService;
  editor?: monaco.editor.IStandaloneCodeEditor;
  currentFile?: {
    path: string;
    content: string;
    language: string;
  };
}

export function useRefactoring({ aiService, editor, currentFile }: UseRefactoringProps) {
  const [availableActions, setAvailableActions] = useState<RefactoringAction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [preview, setPreview] = useState<RefactoringResult | null>(null);

  /**
   * Analyze selected code and suggest refactoring actions
   */
  const analyzeSelection = useCallback(async () => {
    if (!editor || !currentFile) {
      return [];
    }

    setIsAnalyzing(true);

    try {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        setAvailableActions([]);
        return [];
      }

      const model = editor.getModel();
      if (!model) {
        return [];
      }

      const selectedText = model.getValueInRange(selection);
      const actions: RefactoringAction[] = [];

      // Extract Function (if selection has 3+ lines)
      const lineCount = selection.endLineNumber - selection.startLineNumber + 1;
      if (lineCount >= 3) {
        actions.push({
          id: 'extract-function-' + Date.now(),
          type: 'extract-function',
          label: 'Extract Function',
          description: 'Extract selected code into a new function',
          icon: '🔧',
          range: selection,
          originalCode: selectedText,
          confidence: 'high',
        });
      }

      // Convert to Arrow Function (if function declaration detected)
      if (selectedText.includes('function ') && !selectedText.includes('=>')) {
        actions.push({
          id: 'convert-arrow-' + Date.now(),
          type: 'convert-arrow',
          label: 'Convert to Arrow Function',
          description: 'Convert function declaration to arrow function',
          icon: '➡️',
          range: selection,
          originalCode: selectedText,
          confidence: 'high',
        });
      }

      // Rename (if single identifier selected)
      const isSingleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(selectedText.trim());
      if (isSingleIdentifier) {
        actions.push({
          id: 'rename-' + Date.now(),
          type: 'rename',
          label: 'Rename Symbol',
          description: 'Rename symbol across all references',
          icon: '✏️',
          range: selection,
          originalCode: selectedText,
          confidence: 'high',
        });
      }

      // Add TypeScript Types (if TypeScript file without types)
      if (currentFile.language === 'typescript' || currentFile.language === 'typescriptreact') {
        if (!selectedText.includes(':') || !selectedText.includes('interface') && !selectedText.includes('type ')) {
          actions.push({
            id: 'add-types-' + Date.now(),
            type: 'add-types',
            label: 'Add Type Annotations',
            description: 'Add TypeScript type annotations',
            icon: '🔷',
            range: selection,
            originalCode: selectedText,
            confidence: 'medium',
          });
        }
      }

      // Split File (if file is large)
      const totalLines = currentFile.content.split('\n').length;
      if (totalLines > 500) {
        actions.push({
          id: 'split-file-' + Date.now(),
          type: 'split-file',
          label: 'Split File',
          description: `File has ${totalLines} lines (exceeds 500-line standard). Split into modules.`,
          icon: '✂️',
          range: new monaco.Range(1, 1, totalLines, 1),
          originalCode: currentFile.content,
          confidence: 'medium',
        });
      }

      setAvailableActions(actions);
      return actions;
    } catch (error) {
      logger.error('[useRefactoring] Failed to analyze selection:', error);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [editor, currentFile]);

  /**
   * Generate AI-powered refactoring preview
   */
  const generatePreview = useCallback(
    async (action: RefactoringAction): Promise<RefactoringResult | null> => {
      if (!currentFile) {
        return null;
      }

      setIsRefactoring(true);
      const startTime = Date.now();

      try {
        const prompt = buildRefactoringPrompt(action, currentFile);

        const response = await aiService.complete({
          messages: [
            {
              role: 'system',
              content:
                'You are an expert code refactoring assistant. Generate clean, idiomatic code following best practices. Return ONLY the refactored code without explanations unless asked.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'claude-sonnet-4.5', // Updated 2026: Claude Sonnet 4.5 is best for code refactoring (speed/cost/quality)
          temperature: 0.3, // Low temperature for consistent refactoring
          maxTokens: 2000,
        });

        const result: RefactoringResult = {
          action,
          code: extractCodeFromResponse(response.content),
          explanation: response.content,
          modelUsed: response.provider || 'deepseek-coder',
          generationTime: Date.now() - startTime,
        };

        setPreview(result);
        return result;
      } catch (error) {
        logger.error('[useRefactoring] Failed to generate preview:', error);
        return null;
      } finally {
        setIsRefactoring(false);
      }
    },
    [aiService, currentFile]
  );

  /**
   * Apply refactoring to editor
   */
  const applyRefactoring = useCallback(
    (result: RefactoringResult) => {
      if (!editor) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      // Apply the refactored code
      editor.executeEdits('refactoring', [
        {
          range: result.action.range,
          text: result.code,
        },
      ]);

      logger.info('[useRefactoring] Applied refactoring:', result.action.type);
      setPreview(null);
      setAvailableActions([]);
    },
    [editor]
  );

  /**
   * Cancel preview and reset
   */
  const cancelPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return {
    availableActions,
    isAnalyzing,
    isRefactoring,
    preview,
    analyzeSelection,
    generatePreview,
    applyRefactoring,
    cancelPreview,
  };
}

/**
 * Build AI prompt for refactoring
 */
function buildRefactoringPrompt(action: RefactoringAction, file: { path: string; content: string; language: string }): string {
  const baseContext = `
File: ${file.path}
Language: ${file.language}

Original Code:
\`\`\`${file.language}
${action.originalCode}
\`\`\`
`;

  switch (action.type) {
    case 'extract-function':
      return `${baseContext}

Refactoring Task: Extract the selected code into a new, reusable function.

Requirements:
- Create a descriptive function name based on what the code does
- Identify all variables that need to be parameters
- Determine the return type/value
- Add JSDoc/TSDoc comments
- Maintain existing functionality exactly

Return the extracted function definition.`;

    case 'convert-arrow':
      return `${baseContext}

Refactoring Task: Convert this function declaration to an arrow function.

Requirements:
- Preserve function name if it's a named function
- Use const for assignment
- Maintain all parameters and return types
- Keep JSDoc comments if present
- Ensure equivalent behavior

Return the arrow function version.`;

    case 'rename':
      return `${baseContext}

Refactoring Task: Suggest a better, more descriptive name for this symbol.

Requirements:
- Follow ${file.language} naming conventions
- Be specific and descriptive
- Avoid abbreviations unless standard
- Consider the context of usage

Full File Context:
\`\`\`${file.language}
${file.content}
\`\`\`

Return the suggested new name and show the code with the rename applied.`;

    case 'add-types':
      return `${baseContext}

Refactoring Task: Add TypeScript type annotations to this code.

Requirements:
- Add parameter types
- Add return types
- Define interfaces for complex objects
- Use generics where appropriate
- Follow TypeScript best practices

Return the code with complete type annotations.`;

    case 'split-file':
      return `${baseContext}

Refactoring Task: This file has ${file.content.split('\n').length} lines (exceeds 500-line standard).

Analyze the file and suggest how to split it into multiple smaller modules:
- Group related functionality
- Each module should be < 500 lines
- Maintain clear module boundaries
- Use proper imports/exports

Return:
1. List of suggested modules with their responsibilities
2. Example code for the main module
3. Example code for one extracted module`;

    default:
      return `${baseContext}\n\nRefactor this code following best practices.`;
  }
}

/**
 * Extract code from AI response (removes markdown code blocks)
 */
function extractCodeFromResponse(response: string): string {
  // Remove markdown code blocks
  const codeBlockRegex = /```(?:typescript|javascript|tsx|jsx)?\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);

  if (match?.[1]) {
    return match[1].trim();
  }

  // If no code block, return the response as-is (might be already code)
  return response.trim();
}
