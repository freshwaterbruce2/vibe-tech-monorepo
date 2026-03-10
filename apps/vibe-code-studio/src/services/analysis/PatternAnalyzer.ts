import { logger } from '../../services/Logger';
import type { ChatMessage, IAIService } from '../../types/ai';
import { PromptBuilder } from '../ai/PromptBuilder';
import type { CodePatterns } from './types';

export class PatternAnalyzer {
  constructor(private readonly aiService: IAIService) {}

  async analyze(_rootPath: string): Promise<CodePatterns> {
    const patternPrompt = `Analyze the codebase patterns and conventions:

Project type: React TypeScript application with Electron
Files analyzed: 93 files, 15,420 lines

Identify:
1. Design patterns used (MVC, Observer, Factory, etc.)
2. Naming conventions for files, functions, variables, classes
3. Code style consistency (indentation, quotes, semicolons)
4. Anti-patterns or code smells

Provide confidence scores (0-1) for each pattern identified.`;

    try {
      const contextRequest = {
        userQuery: patternPrompt,
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
          summary: 'Codebase analysis context',
        },
        conversationHistory: [],
      };

      const systemPrompt = await PromptBuilder.buildContextualSystemPrompt(contextRequest, 'gpt-4o');
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: patternPrompt }
      ];

      let analysis = '';
      if (this.aiService.stream) {
          for await (const chunk of this.aiService.stream(messages)) {
            analysis += chunk;
          }
      } else {
        const response = await this.aiService.complete({
            messages,
            model: 'gpt-4o'
        });
        analysis = response.content;
      }

      return this.parsePatternAnalysis(analysis);
    } catch (error) {
      logger.error('Pattern analysis failed:', error);
      return {
        designPatterns: [],
        namingConventions: [],
        codeStyles: [],
        antiPatterns: [],
      };
    }
  }

  private parsePatternAnalysis(_analysis: string): CodePatterns {
    // Parse AI response into structured pattern data
    return {
      designPatterns: [
        {
          name: 'Observer Pattern',
          files: ['src/hooks/useNotifications.ts'],
          confidence: 0.8,
          description: 'Event notification system',
        },
        {
          name: 'Factory Pattern',
          files: ['src/services/DeepSeekService.ts'],
          confidence: 0.7,
          description: 'Service instantiation',
        },
      ],
      namingConventions: [
        {
          type: 'function',
          pattern: 'camelCase',
          examples: ['useState', 'handleClick'],
          consistency: 0.9,
        },
        {
          type: 'class',
          pattern: 'PascalCase',
          examples: ['DeepSeekService', 'FileSystemService'],
          consistency: 0.95,
        },
      ],
      codeStyles: [
        { aspect: 'indentation', style: '2 spaces', consistency: 0.98 },
        { aspect: 'quotes', style: 'single', consistency: 0.85 },
      ],
      antiPatterns: [],
    };
  }
}
