/**
 * SemanticSearchServiceHelpers
 * Pure helper functions for SemanticSearchService (no class state)
 */

import { logger } from './Logger';
import type { FileContent, SearchResult } from './SemanticSearchServiceTypes';

/**
 * Transform Apex vector results to SearchResult format
 */
export function transformApexResults(
  apexResults: Array<{
    file_path: string;
    chunk_start: number;
    chunk_end: number;
    content: string;
    similarity: number;
  }>,
  maxResults: number,
): SearchResult[] {
  return apexResults.slice(0, maxResults).map((result) => {
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
      context: extractContext(result.content, 0),
    };
  });
}

/**
 * Initial keyword-based filtering to reduce search space
 */
export function keywordFilter(files: FileContent[], query: string): SearchResult[] {
  const keywords = extractKeywords(query);
  const results: SearchResult[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const matchedKeywords = keywords.filter(keyword =>
        line.toLowerCase().includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        results.push({
          id: `${file.path}:${index + 1}`,
          filePath: file.path,
          fileName: file.path.split('/').pop() ?? file.path,
          fileType: file.language,
          snippet: getSnippet(lines, index),
          lineNumber: index + 1,
          relevanceScore: (matchedKeywords.length / keywords.length) * 100,
          matchType: 'fuzzy',
          context: extractContext(file.content, index),
        });
      }
    });
  }

  return results;
}

/**
 * Extract keywords from natural language query
 */
export function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'find', 'show', 'get', 'where', 'is', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Get code snippet with context (lines before and after)
 */
export function getSnippet(lines: string[], lineIndex: number, contextLines: number = 2): string {
  const start = Math.max(0, lineIndex - contextLines);
  const end = Math.min(lines.length, lineIndex + contextLines + 1);
  return lines.slice(start, end).join('\n');
}

/**
 * Extract context from code (function name, class name, imports, etc.)
 */
export function extractContext(
  content: string,
  lineIndex: number,
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

  // Extract function name
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
  const fileExports: string[] = [];
  lines.forEach(line => {
    const exportMatch = line.match(/export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/);
    if (exportMatch?.[1]) {
      fileExports.push(exportMatch[1]);
    }
  });
  if (fileExports.length > 0) {
    context.exports = fileExports;
  }

  return context;
}

/**
 * Build prompt for AI ranking
 */
export function buildRankingPrompt(query: string, results: SearchResult[]): string {
  const resultsText = results
    .map(
      (result, index) => `
Result ${index + 1} (ID: ${result.id}):
File: ${result.filePath}
Code:
\`\`\`${result.fileType}
${result.snippet}
\`\`\`
`,
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
export function parseRankedIds(response: string): string[] {
  try {
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
export function reorderResults(results: SearchResult[], rankedIds: string[]): SearchResult[] {
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
