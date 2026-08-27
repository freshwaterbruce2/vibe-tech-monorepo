/**
 * AICodeReviewer - AI-powered code review
 * Analyzes code changes and provides intelligent feedback
 */
import { logger } from '../services/Logger';

import type { UnifiedAIService } from './ai/UnifiedAIService';

export interface ParsedDiff {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}

export interface DiffChunk {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber: number;
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  category: 'bug' | 'style' | 'performance' | 'security' | 'best-practice';
  type: 'issue' | 'improvement' | 'question';
  message: string;
  suggestion?: string;
}

export interface CodeReview {
  comments: ReviewComment[];
  qualityScore: number;
  issueCount: {
    errors: number;
    warnings: number;
    info: number;
  };
  verdict: 'approve' | 'request_changes' | 'comment';
  cached?: boolean;
}

export interface AIReviewInsights {
  summary: string;
  suggestions: string[];
  strengths: string[];
  concerns: string[];
}

export interface CodeSmell {
  type: string;
  file: string;
  line: number;
  description: string;
}

/**
 * Optional AI inline-comment provider (spec 15). When supplied,
 * reviewChanges merges its findings with the heuristic pass; when absent,
 * behavior is byte-identical to the historical local-only path.
 */
export type AiCommentProvider = (parsed: ParsedDiff, diff: string) => Promise<ReviewComment[]>;

export interface ReviewChangesOptions {
  aiCommentProvider?: AiCommentProvider;
}

/** Mutable cursor threaded through parseDiff's helpers */
interface DiffParseState {
  file: DiffFile | null;
  chunk: DiffChunk | null;
  newLineNumber: number;
}

export class AICodeReviewer {
  private aiService: UnifiedAIService;
  private reviewCache: Map<string, { review: CodeReview; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(aiService: UnifiedAIService) {
    this.aiService = aiService;
  }

  /**
   * Parse git diff
   */
  parseDiff(diff: string): ParsedDiff {
    const parsed: ParsedDiff = { files: [], totalAdditions: 0, totalDeletions: 0 };
    const state: DiffParseState = { file: null, chunk: null, newLineNumber: 0 };

    for (const line of diff.split('\n')) {
      // File header: diff --git a/file b/file
      if (line.startsWith('diff --git')) {
        // Flush the open chunk BEFORE closing the file — without this, a
        // multi-file diff attaches each file's last chunk to the NEXT file
        // (pre-existing bug surfaced by spec 15's multi-file PRs).
        this.flushFile(parsed, state);
        const match = line.match(/b\/(.+)$/);
        state.file = { path: match?.[1] ?? 'unknown', additions: 0, deletions: 0, chunks: [] };
        continue;
      }

      // Chunk header: @@ -10,6 +10,8 @@
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match?.[1] && match[2] && state.file) {
          if (state.chunk) {
            state.file.chunks.push(state.chunk);
          }
          state.newLineNumber = parseInt(match[2], 10);
          const oldStart = parseInt(match[1], 10);
          state.chunk = { oldStart, newStart: state.newLineNumber, lines: [] };
        }
        continue;
      }

      this.parseContentLine(parsed, state, line);
    }

    this.flushFile(parsed, state);
    return parsed;
  }

  /** Close the current chunk + file (if any) into the parsed result */
  private flushFile(parsed: ParsedDiff, state: DiffParseState): void {
    if (!state.file) {
      return;
    }
    if (state.chunk) {
      state.file.chunks.push(state.chunk);
      state.chunk = null;
    }
    parsed.files.push(state.file);
    state.file = null;
  }

  /** Append one +/-/space content line to the open chunk */
  private parseContentLine(parsed: ParsedDiff, state: DiffParseState, line: string): void {
    if (!state.chunk || !state.file) {
      return;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      state.chunk.lines.push({
        type: 'add',
        content: line.substring(1),
        lineNumber: state.newLineNumber++,
      });
      state.file.additions++;
      parsed.totalAdditions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      state.chunk.lines.push({
        type: 'remove',
        content: line.substring(1),
        lineNumber: state.newLineNumber,
      });
      state.file.deletions++;
      parsed.totalDeletions++;
    } else if (line.startsWith(' ')) {
      state.chunk.lines.push({
        type: 'context',
        content: line.substring(1),
        lineNumber: state.newLineNumber++,
      });
    }
  }

  /**
   * Review code changes
   */
  async reviewChanges(diff: string, options: ReviewChangesOptions = {}): Promise<CodeReview> {
    // Check cache — bypassed when an AI provider is supplied: the cache key
    // is a 500-char diff prefix, and a stale heuristics-only entry must not
    // shadow an AI-powered pass.
    const useCache = !options.aiCommentProvider;
    const cacheKey = this.hashDiff(diff);
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const parsed = this.parseDiff(diff);
    const comments: ReviewComment[] = [];

    // Pattern-based analysis
    for (const file of parsed.files) {
      for (const chunk of file.chunks) {
        for (const line of chunk.lines) {
          if (line.type === 'add') {
            // Check for common issues
            comments.push(...this.analyzeLineForIssues(file.path, line));
          }
        }
      }
    }

    // AI-powered inline comments (opt-in via injected provider)
    try {
      const aiComments = await this.generateAIComments(diff, parsed, options.aiCommentProvider);
      comments.push(...aiComments);
    } catch (error) {
      logger.warn('AI review failed:', error);
    }

    // Calculate metrics
    const issueCount = this.countIssues(comments);
    const qualityScore = this.calculateQualityScore(parsed, issueCount);
    const verdict = this.determineVerdict(issueCount, qualityScore);

    const review: CodeReview = {
      comments,
      qualityScore,
      issueCount,
      verdict,
    };

    if (useCache) {
      this.cacheReview(cacheKey, review);
    }

    return review;
  }

  /**
   * Generate AI review insights
   */
  async generateAIReview(diff: string): Promise<AIReviewInsights> {
    const prompt = `Review this code change and provide:
1. A brief summary
2. 3 specific suggestions for improvement
3. 2 strengths of the implementation
4. Any concerns

Code diff:
${diff.substring(0, 2000)}

Respond in JSON format with keys: summary, suggestions (array), strengths (array), concerns (array)`;

    try {
      const response = await this.aiService.sendContextualMessage({
        userQuery: prompt,
        relatedFiles: [],
        conversationHistory: [],
        workspaceContext: undefined,
      });
      const parsed = JSON.parse(response.content ?? '');
      return parsed;
    } catch {
      return {
        summary: 'Code review completed',
        suggestions: ['Add more tests', 'Consider edge cases', 'Review error handling'],
        strengths: ['Clear implementation', 'Good code structure'],
        concerns: [],
      };
    }
  }

  /**
   * Detect code smells
   */
  async detectCodeSmells(diff: string): Promise<CodeSmell[]> {
    const parsed = this.parseDiff(diff);
    const smells: CodeSmell[] = [];

    for (const file of parsed.files) {
      for (const chunk of file.chunks) {
        for (const line of chunk.lines) {
          if (line.type === 'add') {
            // Long lines
            if (line.content.length > 120) {
              smells.push({
                type: 'long-line',
                file: file.path,
                line: line.lineNumber,
                description: 'Line exceeds 120 characters',
              });
            }

            // console.log
            if (line.content.includes('console.log')) {
              smells.push({
                type: 'debug-code',
                file: file.path,
                line: line.lineNumber,
                description: 'Remove console.log before committing',
              });
            }

            // TODO/FIXME
            if (line.content.match(/TODO|FIXME/i)) {
              smells.push({
                type: 'todo',
                file: file.path,
                line: line.lineNumber,
                description: 'Unresolved TODO/FIXME comment',
              });
            }
          }
        }
      }
    }

    return smells;
  }

  /**
   * Analyze line for issues
   */
  private analyzeLineForIssues(file: string, line: DiffLine): ReviewComment[] {
    const comments: ReviewComment[] = [];
    const { content } = line;

    // Null reference
    if (content.match(/\bnull\s*\.\s*\w+|\.toString\(\)|\.toUpperCase\(\)/)) {
      comments.push({
        file,
        line: line.lineNumber,
        severity: 'error',
        category: 'bug',
        type: 'issue',
        message: 'Potential null reference',
        suggestion: 'Add null check or use optional chaining',
      });
    }

    // console.log
    if (content.includes('console.log')) {
      comments.push({
        file,
        line: line.lineNumber,
        severity: 'warning',
        category: 'style',
        type: 'issue',
        message: 'Debug statement found',
        suggestion: 'Remove console.log or use proper logging',
      });
    }

    // Missing semicolon (if style guide requires them)
    if (content.match(/[^;{}\s]\s*$/)) {
      comments.push({
        file,
        line: line.lineNumber,
        severity: 'info',
        category: 'style',
        type: 'improvement',
        message: 'Consider adding semicolon',
        suggestion: 'Add semicolon for consistency',
      });
    }

    return comments;
  }

  /**
   * Generate AI inline comments via the injected provider (spec 15). With no
   * provider (all pre-existing local callers) this contributes nothing —
   * identical to the historical behavior.
   */
  private async generateAIComments(
    diff: string,
    parsed: ParsedDiff,
    provider?: AiCommentProvider
  ): Promise<ReviewComment[]> {
    if (!provider) {
      return [];
    }
    return provider(parsed, diff);
  }

  /**
   * Count issues by severity
   */
  private countIssues(comments: ReviewComment[]): {
    errors: number;
    warnings: number;
    info: number;
  } {
    return {
      errors: comments.filter(c => c.severity === 'error').length,
      warnings: comments.filter(c => c.severity === 'warning').length,
      info: comments.filter(c => c.severity === 'info').length,
    };
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(
    parsed: ParsedDiff,
    issueCount: { errors: number; warnings: number; info: number }
  ): number {
    let score = 100;

    // Deduct for issues
    score -= issueCount.errors * 10;
    score -= issueCount.warnings * 5;
    score -= issueCount.info * 2;

    // Deduct for large changes without tests
    const totalChanges = parsed.totalAdditions + parsed.totalDeletions;
    if (totalChanges > 200) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine verdict
   */
  private determineVerdict(
    issueCount: { errors: number; warnings: number; info: number },
    qualityScore: number
  ): 'approve' | 'request_changes' | 'comment' {
    if (issueCount.errors > 0 || qualityScore < 50) {
      return 'request_changes';
    }
    if (issueCount.warnings > 3 || qualityScore < 80) {
      return 'comment';
    }
    return 'approve';
  }

  /**
   * Hash diff for caching
   */
  private hashDiff(diff: string): string {
    return diff.substring(0, 500); // Simplified hash
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): CodeReview | null {
    const cached = this.reviewCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.reviewCache.delete(key);
      return null;
    }

    return cached.review;
  }

  /**
   * Cache review
   */
  private cacheReview(key: string, review: CodeReview): void {
    this.reviewCache.set(key, {
      review,
      timestamp: Date.now(),
    });
  }
}
