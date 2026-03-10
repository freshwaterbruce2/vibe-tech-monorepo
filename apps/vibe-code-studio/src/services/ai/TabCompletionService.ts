import { unifiedAI } from './UnifiedAIService';

interface CompletionContext {
  prefix: string; // Code before cursor
  suffix: string; // Code after cursor
  language: string;
}

export class TabCompletionService {
  private static instance: TabCompletionService;
  private cache: Map<string, string> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRequesting = false;

  private constructor() {}

  public static getInstance(): TabCompletionService {
    if (!TabCompletionService.instance) {
      TabCompletionService.instance = new TabCompletionService();
    }
    return TabCompletionService.instance;
  }

  /**
   * Triggers a completion request with a 500ms debounce
   */
  public triggerCompletion(
    context: CompletionContext,
    callback: (completion: string | null) => void
  ): void {
    // 1. Clear pending
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // 2. Check Cache (Exact prefix match)
    const cached = this.cache.get(context.prefix.slice(-50)); // Key off last 50 chars
    if (cached) {
      callback(cached);
      return;
    }

    // 3. Debounce Request
    this.debounceTimer = setTimeout(async () => {
      if (this.isRequesting) return;

      this.isRequesting = true;
      try {
        const completion = await this.fetchCompletion(context);
        if (completion) {
          this.cache.set(context.prefix.slice(-50), completion);
          callback(completion);
        } else {
          callback(null);
        }
      } catch (err) {
        // Silent fail for autocomplete - don't annoy user
        console.debug('Autocomplete failed', err);
        callback(null);
      } finally {
        this.isRequesting = false;
      }
    }, 600); // 600ms delay to ensure user stopped typing
  }

  /**
   * Raw fetch to AI service
   */
  private async fetchCompletion(ctx: CompletionContext): Promise<string | null> {
    // Optimization: Don't autocomplete if line is too short
    const currentLine = ctx.prefix.split('\n').pop() ?? '';
    if (currentLine.trim().length < 3) return null;

    try {
      // Prompt Engineering for "In-Fill" or "Continuation"
      // Note: DeepSeek-Coder supports FIM, but via Chat API we simulate it
      const prompt = `You are a code completion engine.
Complete the code at the end of the USER_PREFIX.
Do not repeat the prefix.
Do not include markdown.
Return ONLY the missing code.

USER_PREFIX:
${ctx.prefix.slice(-1000)} // Limit context to save tokens
`;

      const response = await unifiedAI.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 50, // Short completion only
        temperature: 0.1, // High determinism
      });

      // Cleanup: Remove any backticks or "Here is the code" chatter
      let clean = response.content;
      clean = clean.replace(/```/g, '').replace(/^code/i, '');

      return clean;
    } catch (_error) {
      return null;
    }
  }
}

export const tabCompletionService = TabCompletionService.getInstance();
