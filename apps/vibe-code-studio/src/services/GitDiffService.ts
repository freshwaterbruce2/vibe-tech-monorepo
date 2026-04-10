/**
 * Git Diff Service
 * AI-powered git diff analysis with conflict resolution
 *
 * Features:
 * - Diff parsing and visualization
 * - AI-powered change explanations
 * - Conflict detection and resolution suggestions
 * - Accept/reject individual changes
 */

import { logger } from './Logger';
import type { UnifiedAIService } from './ai/UnifiedAIService';

export type ChangeType = 'addition' | 'deletion' | 'modification' | 'conflict';

export interface DiffHunk {
  id: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
  context?: string; // Surrounding context (function name, class name)
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'conflict-ours' | 'conflict-theirs' | 'conflict-marker';
  content: string;
  lineNumber?: {
    old?: number;
    new?: number;
  };
}

export interface FileDiff {
  id: string;
  filePath: string;
  fileName: string;
  changeType: ChangeType;
  oldPath?: string; // For renamed files
  hunks: DiffHunk[];
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  hasConflicts: boolean;
  explanation?: string; // AI-generated explanation
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'ours' | 'theirs' | 'both' | 'neither' | 'custom';
  customContent?: string;
  explanation?: string; // Why this resolution was chosen
}

export interface DiffAnalysis {
  files: FileDiff[];
  summary: {
    filesChanged: number;
    additions: number;
    deletions: number;
    conflicts: number;
  };
  aiInsights?: {
    overallImpact: string; // High-level summary
    riskAssessment: 'low' | 'medium' | 'high';
    suggestions: string[];
  };
}

export class GitDiffService {
  private aiService: UnifiedAIService;

  constructor(aiService: UnifiedAIService) {
    this.aiService = aiService;
  }

  /**
   * Parse git diff output into structured format
   */
  parseDiff(diffText: string): FileDiff[] {
    const files: FileDiff[] = [];
    const fileBlocks = this.splitDiffIntoFiles(diffText);

    for (const block of fileBlocks) {
      const fileDiff = this.parseFileDiff(block);
      if (fileDiff) {
        files.push(fileDiff);
      }
    }

    logger.info('[GitDiff] Parsed diff:', { files: files.length });
    return files;
  }

  /**
   * Split diff text into individual file diffs
   */
  private splitDiffIntoFiles(diffText: string): string[] {
    const files: string[] = [];
    let currentFile = '';

    for (const line of diffText.split('\n')) {
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }
        currentFile = line + '\n';
      } else {
        currentFile += line + '\n';
      }
    }

    if (currentFile) {
      files.push(currentFile);
    }

    return files;
  }

  /**
   * Parse a single file diff
   */
  private parseFileDiff(diffBlock: string): FileDiff | null {
    const lines = diffBlock.split('\n');

    // Extract file paths
    const diffLine = lines.find(l => l.startsWith('diff --git'));
    if (!diffLine) {
      return null;
    }

    const filePathMatch = diffLine.match(/diff --git a\/(.+) b\/(.+)/);
    if (!filePathMatch?.[1] || !filePathMatch[2]) {
      return null;
    }

    const oldPath = filePathMatch[1];
    const newPath = filePathMatch[2];
    const isRenamed = oldPath !== newPath;

    // Determine change type
    let changeType: ChangeType = 'modification';
    if (lines.some(l => l.startsWith('new file'))) {
      changeType = 'addition';
    } else if (lines.some(l => l.startsWith('deleted file'))) {
      changeType = 'deletion';
    } else if (lines.some(l => l.includes('<<<<<<< HEAD') || l.includes('======='))) {
      changeType = 'conflict';
    }

    // Parse hunks
    const hunks = this.parseHunks(lines);

    // Calculate stats
    const stats = this.calculateStats(hunks);

    // Check for conflicts
    const hasConflicts = hunks.some(hunk => hunk.lines.some(line => line.type.startsWith('conflict')));

    return {
      id: `file-${Date.now()}-${Math.random()}`,
      filePath: newPath,
      fileName: newPath.split('/').pop() ?? newPath,
      changeType,
      oldPath: isRenamed ? oldPath : undefined,
      hunks,
      stats,
      hasConflicts,
    };
  }

  /**
   * Parse diff hunks from lines
   */
  private parseHunks(lines: string[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
      if (hunkMatch?.[1] && hunkMatch[3]) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        currentHunk = {
          id: `hunk-${Date.now()}-${Math.random()}`,
          oldStart: parseInt(hunkMatch[1]),
          oldLines: parseInt(hunkMatch[2] ?? '1'),
          newStart: parseInt(hunkMatch[3]),
          newLines: parseInt(hunkMatch[4] ?? '1'),
          lines: [],
          context: (hunkMatch[5] ?? '').trim(),
        };
        continue;
      }

      // Hunk content
      if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        let type: DiffLine['type'] = 'context';

        if (line.startsWith('+')) {
          type = 'addition';
        } else if (line.startsWith('-')) {
          type = 'deletion';
        }

        // Conflict markers
        if (line.includes('<<<<<<< HEAD')) {
          type = 'conflict-marker';
        } else if (line.includes('=======')) {
          type = 'conflict-marker';
        } else if (line.includes('>>>>>>> ')) {
          type = 'conflict-marker';
        }

        currentHunk.lines.push({
          type,
          content: line.substring(1), // Remove +, -, or space prefix
        });
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Calculate stats for hunks
   */
  private calculateStats(hunks: DiffHunk[]): { additions: number; deletions: number; total: number } {
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition') {
          additions++;
        } else if (line.type === 'deletion') {
          deletions++;
        }
      }
    }

    return {
      additions,
      deletions,
      total: additions + deletions,
    };
  }

  /**
   * Analyze diff with AI to generate explanations
   */
  async analyzeDiff(files: FileDiff[]): Promise<DiffAnalysis> {
    const summary = this.generateSummary(files);

    // Generate AI insights for significant changes
    const aiInsights = await this.generateAIInsights(files, summary);

    // Generate explanations for each file
    const filesWithExplanations = await this.addFileExplanations(files);

    return {
      files: filesWithExplanations,
      summary,
      aiInsights,
    };
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(files: FileDiff[]): DiffAnalysis['summary'] {
    let additions = 0;
    let deletions = 0;
    let conflicts = 0;

    for (const file of files) {
      additions += file.stats.additions;
      deletions += file.stats.deletions;
      if (file.hasConflicts) {
        conflicts++;
      }
    }

    return {
      filesChanged: files.length,
      additions,
      deletions,
      conflicts,
    };
  }

  /**
   * Generate AI insights for overall diff
   */
  private async generateAIInsights(
    files: FileDiff[],
    summary: DiffAnalysis['summary']
  ): Promise<DiffAnalysis['aiInsights']> {
    try {
      const prompt = this.buildInsightsPrompt(files, summary);

      const response = await this.aiService.complete({
        messages: [
          {
            role: 'system',
            content:
              'You are a code review expert. Analyze git diffs to provide high-level insights, risk assessment, and suggestions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'moonshot/kimi-2.5-pro',
        temperature: 0.5,
        maxTokens: 500,
      });

      // Parse AI response
      const insights = this.parseInsightsResponse(response.content);

      return insights;
    } catch (error) {
      logger.error('[GitDiff] Failed to generate AI insights:', error);
      return undefined;
    }
  }

  /**
   * Build prompt for AI insights
   */
  private buildInsightsPrompt(files: FileDiff[], summary: DiffAnalysis['summary']): string {
    const filesText = files
      .slice(0, 5) // Limit to top 5 files
      .map(
        file => `
File: ${file.filePath}
Change Type: ${file.changeType}
Stats: +${file.stats.additions} -${file.stats.deletions}
Has Conflicts: ${file.hasConflicts}
`
      )
      .join('\n');

    return `
Analyze this git diff:

Summary:
- Files changed: ${summary.filesChanged}
- Additions: +${summary.additions}
- Deletions: -${summary.deletions}
- Conflicts: ${summary.conflicts}

Top Files:
${filesText}

Provide:
1. Overall Impact (1-2 sentences)
2. Risk Assessment (low/medium/high)
3. Suggestions (2-3 bullet points)

Format as JSON:
{
  "overallImpact": "...",
  "riskAssessment": "low|medium|high",
  "suggestions": ["...", "..."]
}
`;
  }

  /**
   * Parse AI insights response
   */
  private parseInsightsResponse(response: string): DiffAnalysis['aiInsights'] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return undefined;
      }

      const insights = JSON.parse(jsonMatch[0]);

      return {
        overallImpact: insights.overallImpact ?? 'Moderate code changes',
        riskAssessment: insights.riskAssessment ?? 'medium',
        suggestions: insights.suggestions ?? [],
      };
    } catch (error) {
      logger.error('[GitDiff] Failed to parse AI insights:', error);
      return undefined;
    }
  }

  /**
   * Add AI explanations to files
   */
  private async addFileExplanations(files: FileDiff[]): Promise<FileDiff[]> {
    // Explain top 3 files (cost optimization)
    const topFiles = files.slice(0, 3);

    for (const file of topFiles) {
      try {
        file.explanation = await this.explainFileChanges(file);
      } catch (error) {
        logger.error('[GitDiff] Failed to explain file:', file.filePath, error);
      }
    }

    return files;
  }

  /**
   * Generate AI explanation for file changes
   */
  private async explainFileChanges(file: FileDiff): Promise<string> {
    const prompt = `
File: ${file.filePath}
Change Type: ${file.changeType}
Stats: +${file.stats.additions} -${file.stats.deletions}

Explain in 1-2 sentences what changed in this file and why it matters.
Focus on the semantic meaning, not line-by-line details.
`;

    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: 'You are a code review assistant. Provide concise explanations of code changes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'moonshot/kimi-2.5-pro',
      temperature: 0.5,
      maxTokens: 100,
    });

    return response.content.trim();
  }

  /**
   * Suggest conflict resolution using AI
   */
  async suggestConflictResolution(
    file: FileDiff,
    conflictHunk: DiffHunk
  ): Promise<{
    resolution: ConflictResolution['resolution'];
    explanation: string;
    preview: string;
  }> {
    try {
      const prompt = this.buildConflictResolutionPrompt(file, conflictHunk);

      const response = await this.aiService.complete({
        messages: [
          {
            role: 'system',
            content:
              'You are a git conflict resolution expert. Analyze conflicts and suggest the best resolution strategy.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'moonshot/kimi-2.5-pro',
        temperature: 0.3, // Low temperature for consistent suggestions
        maxTokens: 300,
      });

      return this.parseConflictSuggestion(response.content);
    } catch (error) {
      logger.error('[GitDiff] Failed to suggest conflict resolution:', error);
      return {
        resolution: 'ours',
        explanation: 'Could not generate AI suggestion',
        preview: '',
      };
    }
  }

  /**
   * Build prompt for conflict resolution
   */
  private buildConflictResolutionPrompt(file: FileDiff, conflictHunk: DiffHunk): string {
    const conflictLines = conflictHunk.lines.map(line => line.content).join('\n');

    return `
Analyze this merge conflict and suggest the best resolution:

File: ${file.filePath}

Conflict:
\`\`\`
${conflictLines}
\`\`\`

Provide:
1. Recommended resolution: "ours", "theirs", "both", or "custom"
2. Explanation (1-2 sentences)
3. Preview of resolved code (if custom)

Format as JSON:
{
  "resolution": "ours|theirs|both|custom",
  "explanation": "...",
  "preview": "..."
}
`;
  }

  /**
   * Parse AI conflict suggestion
   */
  private parseConflictSuggestion(response: string): {
    resolution: ConflictResolution['resolution'];
    explanation: string;
    preview: string;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const suggestion = JSON.parse(jsonMatch[0]);

      return {
        resolution: suggestion.resolution ?? 'ours',
        explanation: suggestion.explanation ?? '',
        preview: suggestion.preview ?? '',
      };
    } catch (error) {
      logger.error('[GitDiff] Failed to parse conflict suggestion:', error);
      return {
        resolution: 'ours',
        explanation: 'Could not parse AI suggestion',
        preview: '',
      };
    }
  }

  /**
   * Apply conflict resolution to file content that contains conflict markers.
   * Returns the resolved file content with conflict markers removed.
   */
  applyConflictResolution(file: FileDiff, resolution: ConflictResolution): string {
    logger.info('[GitDiff] Applying conflict resolution:', {
      filePath: file.filePath,
      resolution: resolution.resolution,
    });

    // Reconstruct file content from all hunks
    const rawContent = this.reconstructFileContent(file);

    // If custom resolution with provided content, return it directly
    if (resolution.resolution === 'custom' && resolution.customContent !== undefined) {
      return resolution.customContent;
    }

    // Process the content, resolving each conflict block
    return this.resolveConflictMarkers(rawContent, resolution.resolution);
  }

  /**
   * Reconstruct the full file content from diff hunks.
   * Extracts only the "new side" lines (additions + context) to represent the working copy.
   */
  private reconstructFileContent(file: FileDiff): string {
    const lines: string[] = [];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        // Include context lines, additions, conflict markers, and conflict content
        if (line.type !== 'deletion') {
          lines.push(line.content);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Resolve conflict markers in file content based on the chosen strategy.
   *
   * Conflict format:
   *   <<<<<<< HEAD
   *   (ours content)
   *   =======
   *   (theirs content)
   *   >>>>>>> branch-name
   */
  private resolveConflictMarkers(
    content: string,
    strategy: ConflictResolution['resolution']
  ): string {
    const lines = content.split('\n');
    const resolved: string[] = [];

    let inConflict = false;
    let inOurs = false;
    let inTheirs = false;
    let oursLines: string[] = [];
    let theirsLines: string[] = [];

    for (const line of lines) {
      // Detect conflict start
      if (line.match(/^<{7}\s/)) {
        inConflict = true;
        inOurs = true;
        inTheirs = false;
        oursLines = [];
        theirsLines = [];
        continue;
      }

      // Detect separator between ours and theirs
      if (inConflict && line.match(/^={7}$/)) {
        inOurs = false;
        inTheirs = true;
        continue;
      }

      // Detect conflict end
      if (inConflict && line.match(/^>{7}\s/)) {
        // Resolve this conflict block based on strategy
        const resolvedBlock = this.resolveConflictBlock(oursLines, theirsLines, strategy);
        resolved.push(...resolvedBlock);

        inConflict = false;
        inOurs = false;
        inTheirs = false;
        oursLines = [];
        theirsLines = [];
        continue;
      }

      // Collect lines inside a conflict
      if (inConflict) {
        if (inOurs) {
          oursLines.push(line);
        } else if (inTheirs) {
          theirsLines.push(line);
        }
        continue;
      }

      // Normal line outside of conflict
      resolved.push(line);
    }

    return resolved.join('\n');
  }

  /**
   * Resolve a single conflict block by choosing ours, theirs, both, or neither.
   */
  private resolveConflictBlock(
    oursLines: string[],
    theirsLines: string[],
    strategy: ConflictResolution['resolution']
  ): string[] {
    switch (strategy) {
      case 'ours':
        return oursLines;
      case 'theirs':
        return theirsLines;
      case 'both':
        // Keep both: ours first, then theirs
        return [...oursLines, ...theirsLines];
      case 'neither':
        // Discard both sides
        return [];
      case 'custom':
        // Custom without content falls back to ours (custom content handled earlier)
        return oursLines;
      default:
        return oursLines;
    }
  }
}
