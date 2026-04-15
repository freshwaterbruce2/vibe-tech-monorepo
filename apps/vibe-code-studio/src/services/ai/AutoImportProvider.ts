import type * as Monaco from 'monaco-editor';
import type { UnifiedAIService } from './UnifiedAIService';
import { logger } from '../Logger';

export class AutoImportProvider {
  constructor(private readonly aiService: UnifiedAIService) {}

  /**
   * Analyzes the code for missing imports and suggests fixes.
   */
  async resolveMissingImports(
    model: Monaco.editor.ITextModel,
    code: string,
    diagnostics: string[]
  ): Promise<Monaco.languages.CodeAction[]> {

    if (diagnostics.length === 0) return [];

    const systemPrompt = `You are a TypeScript Import resolver.
    Analyze the missing variables/types and suggest the correct import statements.
    Return a JSON array of objects with format: { "symbol": "Name", "module": "path/to/module" }.
    Only return valid JSON.`;

    const userPrompt = `Code:\n${code}\n\nMissing Symbols (Diagnostics):\n${diagnostics.join('\n')}`;

    try {
      const response = await this.aiService.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.1,
          model: 'moonshot/kimi-2.5-pro'
        }
      );

      // Clean markdown if present
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const imports = JSON.parse(cleanJson);

      // Map to Monaco Code Actions
      const monaco = await import('monaco-editor');
      return imports.map((imp: any) => ({
        title: `Import ${imp.symbol} from ${imp.module}`,
        kind: 'quickfix',
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(1, 1, 1, 1), // Simplistic: prepend to top of file
              text: `import { ${imp.symbol} } from '${imp.module}';\n`
            }
          }]
        }
      }));

    } catch (error) {
      logger.warn('AutoImportProvider: Failed to resolve imports', error);
      return [];
    }
  }
}
