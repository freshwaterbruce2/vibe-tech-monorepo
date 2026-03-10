import { unifiedAI } from './UnifiedAIService';
import { diff_match_patch, Diff } from 'diff-match-patch';

export interface InlineEditRequest {
  code: string;
  instruction: string;
  language: string;
  context?: {
    before: string;
    after: string;
  };
}

export interface DiffResult {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
}

export interface InlineEditResponse {
  originalCode: string;
  modifiedCode: string;
  diff: DiffResult[];
}

export class InlineEditService {
  private dmp = new diff_match_patch();

  public async generateEdit(request: InlineEditRequest): Promise<InlineEditResponse> {
    const { code, instruction, language, context } = request;

    const contextStr = context 
      ? `\nContext Before:\n${context.before}\n\nContext After:\n${context.after}\n` 
      : '';

    const response = await unifiedAI.complete({
      messages: [
        {
          role: 'system',
          content: `You are an expert coding assistant.
Rewrite the following code based on the user's instruction.
Return ONLY the new code. Do not include markdown blocks or explanations. Preserve code style and formatting.
Keep changes minimal and focused. Maintain all imports and dependencies.
Language: ${language}
${contextStr}`
        },
        { 
          role: 'user', 
          content: `Instruction: ${instruction}\n\nOriginal Code:\n${code}` 
        }
      ],
      temperature: 0.2,
    });

    const cleanCode = response.content.replace(/^```\w*\n?|\n?```$/g, '').trim();
    
    return {
      originalCode: code,
      modifiedCode: cleanCode,
      diff: this.computeDiff(code, cleanCode)
    };
  }

  public computeDiff(original: string, modified: string): DiffResult[] {
    const diffs: Diff[] = this.dmp.diff_main(original, modified);
    this.dmp.diff_cleanupSemantic(diffs);

    return diffs.map(diff => {
      const [operation, text] = diff;
      let type: 'add' | 'remove' | 'unchanged' = 'unchanged';
      if (operation === 1) type = 'add';
      if (operation === -1) type = 'remove';
      
      return {
        type,
        content: text
      };
    });
  }
}

export const inlineEditService = new InlineEditService();
