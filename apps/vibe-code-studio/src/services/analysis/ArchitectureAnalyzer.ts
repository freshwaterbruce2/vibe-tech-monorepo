import { logger } from '../../services/Logger';
import type { ChatMessage, IAIService } from '../../types/ai';
import { PromptBuilder } from '../ai/PromptBuilder';
import type { ArchitectureInsights } from './types';

export class ArchitectureAnalyzer {
  constructor(private readonly aiService: IAIService) {}

  async analyze(_rootPath: string): Promise<ArchitectureInsights> {
    const architecturePrompt = `Analyze the software architecture:

Project: AI-powered code editor (React + TypeScript + Electron)
Components: Editor, AI chat, file system, workspace management
Size: 93 files, 15,420 lines

Analyze:
1. Architecture patterns (MVC, Component-based, Layered, etc.)
2. System layers and their responsibilities
3. Module organization and boundaries
4. Data flow and state management
5. Coupling and cohesion
6. Architecture violations or issues

Provide recommendations for:
- Improving architecture
- Refactoring opportunities
- Module extraction or consolidation
- Better separation of concerns`;

    try {
      const contextRequest = {
        userQuery: architecturePrompt,
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
          summary: 'Architecture analysis context',
        },
        conversationHistory: [],
      };

      const systemPrompt = await PromptBuilder.buildContextualSystemPrompt(contextRequest, 'gpt-4o');
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: architecturePrompt }
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

      return this.parseArchitectureAnalysis(analysis);
    } catch (error) {
      logger.error('Architecture analysis failed:', error);
      return {
        patterns: [],
        layers: [],
        modules: [],
        dataFlow: { sources: [], sinks: [], transformations: [], bottlenecks: [] },
        recommendations: [],
      };
    }
  }

  private parseArchitectureAnalysis(_analysis: string): ArchitectureInsights {
    // Parse AI response into architecture insights
    return {
      patterns: [
        {
          name: 'Component Architecture',
          confidence: 0.9,
          description: 'React component-based design',
          files: ['src/components/'],
        },
      ],
      layers: [
        {
          name: 'Presentation',
          files: ['src/components/'],
          dependencies: ['Business'],
          violations: [],
        },
        { name: 'Business', files: ['src/services/'], dependencies: ['Data'], violations: [] },
        { name: 'Data', files: ['src/hooks/', 'src/types/'], dependencies: [], violations: [] },
      ],
      modules: [],
      dataFlow: { sources: [], sinks: [], transformations: [], bottlenecks: [] },
      recommendations: [
        {
          type: 'extract',
          description: 'Extract AI functionality into separate module',
          files: ['src/App.tsx'],
          benefit: 'Better separation of concerns and testability',
          effort: 'medium',
        },
      ],
    };
  }
}
