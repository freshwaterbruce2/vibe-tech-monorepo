/**
 * Semantic Search Service
 * AI-powered natural language code search across workspace
 *
 * Features:
 * - Natural language queries ("find authentication logic")
 * - Semantic similarity matching (embeddings)
 * - Context-aware results (file type, imports, usage)
 * - Multi-file search with ranking
 */

import { logger } from './Logger';
import type { UnifiedAIService } from './ai/UnifiedAIService';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
}

export interface SearchFilters {
  fileTypes?: string[]; // ['ts', 'tsx', 'js', 'jsx']
  directories?: string[]; // ['src/components', 'src/services']
  excludePatterns?: string[]; // ['node_modules', 'dist', 'test']
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface SearchResult {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  snippet: string; // Code snippet with context
  lineNumber: number;
  relevanceScore: number; // 0-100 (AI confidence)
  matchType: 'semantic' | 'exact' | 'fuzzy';
  context?: {
    functionName?: string;
    className?: string;
    imports?: string[];
    exports?: string[];
  };
  explanation?: string; // Why this result matches
}

export interface SearchMetadata {
  totalFiles: number;
  filesSearched: number;
  searchTime: number; // milliseconds
  modelUsed: string;
  tokenCost?: number;
}

interface FileContent {
  path: string;
  content: string;
  language: string;
}

export class SemanticSearchService {
  private aiService: UnifiedAIService;
  private fileCache: Map<string, FileContent> = new Map();

  constructor(aiService: UnifiedAIService) {
    this.aiService = aiService;
  }

  /**
   * Perform semantic search across workspace
   * Uses Apex Intelligence Engine (sqlite-vec + embeddings) when available,
   * falls back to keyword-based search otherwise
   */
  async search(searchQuery: SearchQuery): Promise<{ results: SearchResult[]; metadata: SearchMetadata }> {
    const startTime = Date.now();
    const maxResults = searchQuery.maxResults ?? 10;

    logger.info('[SemanticSearch] Starting search:', searchQuery.query);

    // Try vector search via Apex Intelligence Engine first (Electron only)
    if (typeof window !== 'undefined' && window.electron?.apex) {
      try {
        const apexStatus = await window.electron.apex['getStatus']();

        if (apexStatus === 'ready') {
          logger.info('[SemanticSearch] Using Apex vector search');
          const vectorResults = await window.electron.apex['queryVector'](searchQuery.query, maxResults * 2);

          if (vectorResults.results && vectorResults.results.length > 0) {
            // Transform Apex results to SearchResult format
            const results = this.transformApexResults(vectorResults.results, maxResults);

            // Add AI explanations for top results
            const resultsWithExplanations = await this.addExplanations(searchQuery.query, results);

            const metadata: SearchMetadata = {
              totalFiles: vectorResults.results.length,
              filesSearched: vectorResults.results.length,
              searchTime: Date.now() - startTime,
              modelUsed: 'apex-embeddings', // Xenova/all-MiniLM-L6-v2
            };

            logger.info('[SemanticSearch] Vector search complete:', {
              query: searchQuery.query,
              results: resultsWithExplanations.length,
              time: metadata.searchTime + 'ms',
              engine: 'apex',
            });

            return { results: resultsWithExplanations, metadata };
          }
        } else {
          logger.warn('[SemanticSearch] Apex not ready, status:', apexStatus);
        }
      } catch (error) {
        logger.warn('[SemanticSearch] Apex query failed, falling back to keyword search:', error);
      }
    }

    // Fallback: keyword-based search with AI ranking
    logger.info('[SemanticSearch] Using keyword-based search (fallback)');

    // Step 1: Get files to search
    const files = await this.getFilesToSearch(searchQuery.filters);

    // Step 2: Perform initial keyword filtering (optimization)
    const keywordMatches = this.keywordFilter(files, searchQuery.query);

    // Step 3: Use AI to rank results by semantic similarity
    const rankedResults = await this.semanticRank(searchQuery.query, keywordMatches, maxResults);

    // Step 4: Generate explanations for top results
    const resultsWithExplanations = await this.addExplanations(searchQuery.query, rankedResults);

    const metadata: SearchMetadata = {
      totalFiles: files.length,
      filesSearched: keywordMatches.length,
      searchTime: Date.now() - startTime,
      modelUsed: 'deepseek/deepseek-v3.2', // fallback AI ranking
    };

    logger.info('[SemanticSearch] Keyword search complete:', {
      query: searchQuery.query,
      results: resultsWithExplanations.length,
      time: metadata.searchTime + 'ms',
      engine: 'keyword-fallback',
    });

    return {
      results: resultsWithExplanations,
      metadata,
    };
  }

  /**
   * Transform Apex vector results to SearchResult format
   */
  private transformApexResults(apexResults: Array<{
    file_path: string;
    chunk_start: number;
    chunk_end: number;
    content: string;
    similarity: number;
  }>, maxResults: number): SearchResult[] {
    return apexResults.slice(0, maxResults).map((result, _index) => {
      const fileName = result.file_path.split(/[/\\]/).pop() ?? result.file_path;
      const fileExt = fileName.split('.').pop() ?? 'txt';

      return {
        id: `${result.file_path}:${result.chunk_start}`,
        filePath: result.file_path,
        fileName,
        fileType: fileExt,
        snippet: result.content,
        lineNumber: result.chunk_start,
        relevanceScore: Math.round(result.similarity * 100), // Convert 0-1 to 0-100
        matchType: 'semantic' as const,
        context: this.extractContext(result.content, 0),
      };
    });
  }

  /**
   * Get list of files to search based on filters
   */
  private async getFilesToSearch(_filters?: SearchFilters): Promise<FileContent[]> {
    // TODO: Integrate with Monaco workspace or file system
    // For now, return cached files or mock data

    // In real implementation, this would:
    // 1. Use Monaco's file system API
    // 2. Scan workspace directories
    // 3. Apply filters (file types, directories, exclude patterns)
    // 4. Cache file contents

    return Array.from(this.fileCache.values());
  }

  /**
   * Initial keyword-based filtering to reduce search space
   */
  private keywordFilter(files: FileContent[], query: string): SearchResult[] {
    const keywords = this.extractKeywords(query);
    const results: SearchResult[] = [];

    for (const file of files) {
      const lines = file.content.split('\n');

      lines.forEach((line, index) => {
        // Check if line contains any keywords
        const matchedKeywords = keywords.filter(keyword => line.toLowerCase().includes(keyword.toLowerCase()));

        if (matchedKeywords.length > 0) {
          results.push({
            id: `${file.path}:${index + 1}`,
            filePath: file.path,
            fileName: file.path.split('/').pop() ?? file.path,
            fileType: file.language,
            snippet: this.getSnippet(lines, index),
            lineNumber: index + 1,
            relevanceScore: (matchedKeywords.length / keywords.length) * 100,
            matchType: 'fuzzy',
            context: this.extractContext(file.content, index),
          });
        }
      });
    }

    return results;
  }

  /**
   * Extract keywords from natural language query
   */
  private extractKeywords(query: string): string[] {
    // Remove stop words and extract meaningful terms
    const stopWords = new Set(['find', 'show', 'get', 'where', 'is', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for']);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Get code snippet with context (lines before and after)
   */
  private getSnippet(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);

    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract context from code (function name, class name, imports, etc.)
   */
  private extractContext(
    content: string,
    lineIndex: number
  ): {
    functionName?: string;
    className?: string;
    imports?: string[];
    exports?: string[];
  } {
    const lines = content.split('\n');
    const currentLine = lines[lineIndex] ?? '';
    const context: {
      functionName?: string;
      className?: string;
      imports?: string[];
      exports?: string[];
    } = {};

    // Extract function name (simple regex - can be improved)
    const functionMatch =
      currentLine.match(/function\s+(\w+)/) ||
      currentLine.match(/const\s+(\w+)\s*=\s*\(/) ||
      currentLine.match(/(\w+)\s*:\s*\(/);
    if (functionMatch?.[1]) {
      context.functionName = functionMatch[1];
    }

    // Extract class name
    const classMatch = currentLine.match(/class\s+(\w+)/);
    if (classMatch?.[1]) {
      context.className = classMatch[1];
    }

    // Extract imports (from entire file)
    const imports: string[] = [];
    lines.forEach(line => {
      const importMatch = line.match(/import\s+.*from\s+['"](.+)['"]/);
      if (importMatch?.[1]) {
        imports.push(importMatch[1]);
      }
    });
    if (imports.length > 0) {
      context.imports = imports;
    }

    // Extract exports
    const exports: string[] = [];
    lines.forEach(line => {
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/);
      if (exportMatch?.[1]) {
        exports.push(exportMatch[1]);
      }
    });
    if (exports.length > 0) {
      context.exports = exports;
    }

    return context;
  }

  /**
   * Use AI to rank results by semantic similarity
   */
  private async semanticRank(query: string, results: SearchResult[], maxResults: number): Promise<SearchResult[]> {
    if (results.length === 0) {
      return [];
    }

    // Limit to top N results for AI processing (cost optimization)
    const topResults = results.slice(0, Math.min(results.length, maxResults * 3));

    try {
      // Use AI to understand query intent and rank results
      const prompt = this.buildRankingPrompt(query, topResults);

      const response = await this.aiService.complete({
        messages: [
          {
            role: 'system',
            content:
              'You are a code search expert. Analyze the query and code snippets to determine semantic relevance. Return a JSON array of result IDs ranked by relevance (most relevant first).',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'deepseek/deepseek-v3.2',
        temperature: 0.3, // Low temperature for consistent ranking
        maxTokens: 1000,
      });

      // Parse AI response to get ranked result IDs
      const rankedIds = this.parseRankedIds(response.content);

      // Reorder results based on AI ranking
      const rankedResults = this.reorderResults(topResults, rankedIds);

      // Update relevance scores based on ranking
      rankedResults.forEach((result, index) => {
        result.relevanceScore = 100 - (index * 100) / rankedResults.length;
        result.matchType = 'semantic';
      });

      return rankedResults.slice(0, maxResults);
    } catch (error) {
      logger.error('[SemanticSearch] Failed to rank results:', error);
      // Fallback to keyword-based ranking
      return results.slice(0, maxResults);
    }
  }

  /**
   * Build prompt for AI ranking
   */
  private buildRankingPrompt(query: string, results: SearchResult[]): string {
    const resultsText = results
      .map(
        (result, index) => `
Result ${index + 1} (ID: ${result.id}):
File: ${result.filePath}
Code:
\`\`\`${result.fileType}
${result.snippet}
\`\`\`
`
      )
      .join('\n');

    return `
User Query: "${query}"

Code Results:
${resultsText}

Instructions:
1. Analyze each code result's relevance to the user query
2. Consider semantic meaning, not just keyword matches
3. Rank results from most to least relevant
4. Return a JSON array of result IDs in ranked order

Example output:
["result_1:42", "result_3:18", "result_2:56"]

Return only the JSON array, no explanations.
`;
  }

  /**
   * Parse ranked IDs from AI response
   */
  private parseRankedIds(response: string): string[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('[SemanticSearch] No JSON array found in response');
        return [];
      }

      const rankedIds = JSON.parse(jsonMatch[0]);
      return Array.isArray(rankedIds) ? rankedIds : [];
    } catch (error) {
      logger.error('[SemanticSearch] Failed to parse ranked IDs:', error);
      return [];
    }
  }

  /**
   * Reorder results based on AI ranking
   */
  private reorderResults(results: SearchResult[], rankedIds: string[]): SearchResult[] {
    const resultsMap = new Map(results.map(r => [r.id, r]));
    const reordered: SearchResult[] = [];

    for (const id of rankedIds) {
      const result = resultsMap.get(id);
      if (result) {
        reordered.push(result);
        resultsMap.delete(id);
      }
    }

    // Add any remaining results (not ranked by AI)
    reordered.push(...Array.from(resultsMap.values()));

    return reordered;
  }

  /**
   * Add AI-generated explanations to top results
   */
  private async addExplanations(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    // Only explain top 3 results (cost optimization)
    const topResults = results.slice(0, 3);

    for (const result of topResults) {
      try {
        const explanation = await this.generateExplanation(query, result);
        result.explanation = explanation;
      } catch (error) {
        logger.error('[SemanticSearch] Failed to generate explanation:', error);
      }
    }

    return results;
  }

  /**
   * Generate AI explanation for why a result matches
   */
  private async generateExplanation(query: string, result: SearchResult): Promise<string> {
    const prompt = `
User Query: "${query}"

Code Result:
File: ${result.filePath}
\`\`\`${result.fileType}
${result.snippet}
\`\`\`

Explain in 1-2 sentences why this code is relevant to the user's query.
Focus on the semantic meaning and functionality.
`;

    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: 'You are a code search assistant. Provide concise explanations of code relevance.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'deepseek/deepseek-v3.2',
      temperature: 0.5,
      maxTokens: 100,
    });

    return response.content.trim();
  }

  /**
   * Add file to search index
   */
  addFile(path: string, content: string, language: string): void {
    this.fileCache.set(path, { path, content, language });
    logger.debug('[SemanticSearch] Added file to index:', path);
  }

  /**
   * Remove file from search index
   */
  removeFile(path: string): void {
    this.fileCache.delete(path);
    logger.debug('[SemanticSearch] Removed file from index:', path);
  }

  /**
   * Update file in search index
   */
  updateFile(path: string, content: string, language: string): void {
    this.fileCache.set(path, { path, content, language });
    logger.debug('[SemanticSearch] Updated file in index:', path);
  }

  /**
   * Clear search index
   */
  clearIndex(): void {
    this.fileCache.clear();
    logger.info('[SemanticSearch] Cleared search index');
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalFiles: number;
    totalLines: number;
    byFileType: Record<string, number>;
  } {
    const stats = {
      totalFiles: this.fileCache.size,
      totalLines: 0,
      byFileType: {} as Record<string, number>,
    };

    for (const file of this.fileCache.values()) {
      stats.totalLines += file.content.split('\n').length;
      stats.byFileType[file.language] = (stats.byFileType[file.language] ?? 0) + 1;
    }

    return stats;
  }

  /**
   * Index workspace using Apex Intelligence Engine
   * Creates vector embeddings for semantic search
   */
  async indexWorkspace(rootPath: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined' || !window.electron?.apex) {
      logger.warn('[SemanticSearch] Apex not available for indexing');
      return { success: false, error: 'Apex Intelligence Engine not available' };
    }

    try {
      logger.info('[SemanticSearch] Starting workspace indexing:', rootPath);
      const result = await window.electron.apex['indexWorkspace'](rootPath);
      logger.info('[SemanticSearch] Workspace indexing initiated:', result);
      return result;
    } catch (error) {
      logger.error('[SemanticSearch] Failed to index workspace:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get Apex Intelligence Engine status
   */
  async getApexStatus(): Promise<string> {
    if (typeof window === 'undefined' || !window.electron?.apex) {
      return 'unavailable';
    }

    try {
      return await window.electron.apex['getStatus']();
    } catch {
      return 'error';
    }
  }
}
