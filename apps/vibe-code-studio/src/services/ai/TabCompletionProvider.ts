import type * as Monaco from 'monaco-editor';
import type { UnifiedAIService } from './UnifiedAIService';

export class TabCompletionProvider implements Monaco.languages.InlineCompletionsProvider {
  constructor(private readonly aiService: UnifiedAIService) {}

  async provideInlineCompletions(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
    _context: Monaco.languages.InlineCompletionContext,
    token: Monaco.CancellationToken
  ): Promise<Monaco.languages.InlineCompletions | undefined> {

    // Quick validation
    if (token.isCancellationRequested) return undefined;

    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const textAfterPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineMaxColumn(model.getLineCount())
    });

    // Construct Prompt for Continuation
    const userPrompt = `Context:\n${textUntilPosition}<CURSOR>${textAfterPosition}\n\nProvide the code to fill <CURSOR>:`;

    try {
      // Request Completion
      const completion = await this.aiService.generateText(userPrompt, {
        model: 'deepseek/deepseek-v3.2',
        temperature: 0.1, // Low temp for precision
        maxTokens: 50,    // Keep it short for inline completion
        signal: token as unknown as AbortSignal // Pass cancellation token
      });

      if (!completion?.trim()) return undefined;

      // Return Result
      const monaco = await import('monaco-editor');
      return {
        items: [{
          insertText: completion,
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          )
        }]
      };

    } catch (_error) {
      return undefined;
    }
  }

  freeInlineCompletions(_completions: Monaco.languages.InlineCompletions): void {
    // No resource cleanup needed
  }

  disposeInlineCompletions(completions: Monaco.languages.InlineCompletions): void {
      this.freeInlineCompletions(completions);
  }
}
