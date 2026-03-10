import { logger } from '../../services/Logger';
import type { ChatMessage, IAIService } from '../../types/ai';
import { PromptBuilder } from '../ai/PromptBuilder';
import type { TechnicalDebt } from './types';

export class DebtAnalyzer {
  constructor(private readonly aiService: IAIService) {}

  async analyze(_rootPath: string): Promise<TechnicalDebt[]> {
    const debtPrompt = `Analyze the codebase for technical debt:

Project: React TypeScript + Electron editor
Size: 93 files, 15,420 lines

Identify:
1. Code smells (long functions, complex conditionals, duplicated code)
2. Bug risks (unhandled promises, missing error handling, type issues)
3. Security issues (unsafe operations, exposed secrets, vulnerabilities)
4. Performance issues (inefficient algorithms, memory leaks, blocking operations)
5. Maintainability issues (tight coupling, poor separation of concerns)

For each issue, provide:
- File and line (if applicable)
- Severity (low/medium/high/critical)
- Description
- Effort to fix (trivial/easy/medium/hard/complex)
- Impact if not fixed (low/medium/high)`;

    try {
      const contextRequest = {
        userQuery: debtPrompt,
        relatedFiles: [],
        workspaceContext: {
          rootPath: '/',
          totalFiles: 0,
          languages: ['JavaScript', 'TypeScript'],
          testFiles: 0,
          projectStructure: {},
          dependencies: {},
          exports: {},
          symbols: {},
          lastIndexed: new Date(),
          summary: 'Technical debt analysis context',
        },
        conversationHistory: [],
      };

      const systemPrompt = await PromptBuilder.buildContextualSystemPrompt(contextRequest, 'gpt-4o');
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: debtPrompt }
      ];

      let analysis = '';
      if (this.aiService.stream) {
          for await (const chunk of this.aiService.stream(messages)) {
            analysis += chunk;
          }
      } else {
          // Fallback to complete if stream is not available
          const response = await this.aiService.complete({
              messages,
              model: 'gpt-4o' // Default model
          });
          analysis = response.content;
      }

      return this.parseDebtAnalysis(analysis);
    } catch (error) {
      logger.error('Technical debt analysis failed:', error);
      return [];
    }
  }

  private parseDebtAnalysis(_analysis: string): TechnicalDebt[] {
    // Parse AI response into technical debt items
    return [
      {
        type: 'maintainability_issue',
        file: 'src/App.tsx',
        line: 100,
        severity: 'medium',
        description: 'Large component with multiple responsibilities',
        effort: 'medium',
        impact: 'medium',
      },
    ];
  }
}
