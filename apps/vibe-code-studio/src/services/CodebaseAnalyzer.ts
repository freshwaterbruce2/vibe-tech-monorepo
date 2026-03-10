import type { IAIService } from '../types/ai';
import { FileSystemService } from './FileSystemService';
import type { ArchitectureAnalyzer } from './analysis/ArchitectureAnalyzer';
import type { DebtAnalyzer } from './analysis/DebtAnalyzer';
import type { PatternAnalyzer } from './analysis/PatternAnalyzer';
import type { ArchitectureInsights, CodePatterns, TechnicalDebt } from './analysis/types';

export interface AnalysisResult {
  patterns: CodePatterns;
  debt: TechnicalDebt[];
  architecture: ArchitectureInsights;
  summary: string;
}

export class CodebaseAnalyzer {
  private readonly fileSystem: FileSystemService;

  constructor(
    private readonly aiService: IAIService,
    private readonly patternAnalyzer: PatternAnalyzer,
    private readonly debtAnalyzer: DebtAnalyzer,
    private readonly architectureAnalyzer: ArchitectureAnalyzer,
    fileSystemService?: FileSystemService
  ) {
    this.fileSystem = fileSystemService ?? new FileSystemService();
  }

  /**
   * Analyze a specific file using all analyzers
   */
  async analyzeFile(content: string, filename: string): Promise<AnalysisResult> {
    console.log(`Analyzing ${filename}...`);

    const [patterns, debt, architecture] = await Promise.all([
      this.patternAnalyzer.analyze(content),
      this.debtAnalyzer.analyze(content),
      this.architectureAnalyzer.analyze(content)
    ]);

    // Optional: Generate a quick summary using the main AI service
    const summaryPrompt = `Summarize the code quality of ${filename} based on these metrics:
    Patterns: ${patterns.designPatterns.length}, Debt Items: ${debt.length}. Keep it brief.`;

    const summaryResponse = await this.aiService.complete({
      messages: [{ role: 'user', content: summaryPrompt }],
      model: 'gpt-4o',
      maxTokens: 100
    });
    const summary = summaryResponse.content;

    return {
      patterns,
      debt,
      architecture,
      summary
    };
  }

  /**
   * RAG Lite: Retrieve validation context based on query
   * Scores files by name relevance and returns content of top matches
   */
  async retrieveContext(query: string, rootPath: string): Promise<string> {
    try {
      const allFiles = await this.getAllFilePaths(rootPath);
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      if (queryTerms.length === 0) return '';

      const scoredFiles = allFiles.map(path => {
        const name = path.split('/').pop()?.toLowerCase() ?? '';
        const pathLower = path.toLowerCase();
        let score = 0;

        queryTerms.forEach(term => {
          if (name === term) score += 10;
          else if (name.includes(term)) score += 5;
          else if (pathLower.includes(term)) score += 1;
        });

        return { path, score };
      });

      const topFiles = scoredFiles
        .filter(f => f.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (topFiles.length === 0) return '';

      let context = 'Related Files Content:\n\n';
      for (const file of topFiles) {
        try {
          const content = await this.fileSystem.readFile(file.path);
          if (content) {
             const truncated = content.length > 10000 ? content.substring(0, 10000) + '... (truncated)' : content;
             context += `File: ${file.path}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
          }
        } catch { /* ignore read errors */ }
      }

      return context;
    } catch (error) {
      console.error('RAG retrieval failed:', error);
      return '';
    }
  }

  private async getAllFilePaths(dir: string): Promise<string[]> {
      let results: string[] = [];
      try {
        const items = await this.fileSystem.listDirectory(dir);
        for (const item of items) {
            if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist' || item.name === 'build') continue;

            if (item.type === 'directory') {
                const subResults = await this.getAllFilePaths(item.path);
                results = results.concat(subResults);
            } else {
                results.push(item.path);
            }
        }
      } catch { /* ignore access errors */ }
      return results;
  }
}
