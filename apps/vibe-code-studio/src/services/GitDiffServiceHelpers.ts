/**
 * GitDiffServiceHelpers - Pure helper functions for GitDiffService
 * Diff parsing, stats calculation, prompt building, and conflict resolution
 */

import { logger } from './Logger';
import type {
  ChangeType,
  DiffHunk,
  DiffLine,
  FileDiff,
  ConflictResolution,
  DiffAnalysis,
} from './GitDiffServiceTypes';

// --- Diff splitting ---

/**
 * Split diff text into individual file diffs
 */
export function splitDiffIntoFiles(diffText: string): string[] {
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

// --- File diff parsing ---

/**
 * Parse a single file diff block into a FileDiff
 */
export function parseFileDiff(diffBlock: string): FileDiff | null {
  const lines = diffBlock.split('\n');

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

  let changeType: ChangeType = 'modification';
  if (lines.some(l => l.startsWith('new file'))) {
    changeType = 'addition';
  } else if (lines.some(l => l.startsWith('deleted file'))) {
    changeType = 'deletion';
  } else if (lines.some(l => l.includes('<<<<<<< HEAD') || l.includes('======='))) {
    changeType = 'conflict';
  }

  const hunks = parseHunks(lines);
  const stats = calculateStats(hunks);
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

// --- Hunk parsing ---

/**
 * Parse diff hunks from lines
 */
export function parseHunks(lines: string[]): DiffHunk[] {
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

// --- Stats ---

/**
 * Calculate addition/deletion stats for a set of hunks
 */
export function calculateStats(hunks: DiffHunk[]): { additions: number; deletions: number; total: number } {
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

// --- Summary ---

/**
 * Generate summary statistics across all file diffs
 */
export function generateSummary(files: FileDiff[]): DiffAnalysis['summary'] {
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

// --- AI prompt builders ---

/**
 * Build prompt for AI insights
 */
export function buildInsightsPrompt(files: FileDiff[], summary: DiffAnalysis['summary']): string {
  const filesText = files
    .slice(0, 5)
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
 * Build prompt for conflict resolution
 */
export function buildConflictResolutionPrompt(file: FileDiff, conflictHunk: DiffHunk): string {
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

// --- AI response parsers ---

/**
 * Parse AI insights response into structured insights
 */
export function parseInsightsResponse(response: string): DiffAnalysis['aiInsights'] {
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
 * Parse AI conflict suggestion response
 */
export function parseConflictSuggestion(response: string): {
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

// --- Conflict resolution ---

/**
 * Reconstruct the full file content from diff hunks.
 * Extracts only the "new side" lines (additions + context) to represent the working copy.
 */
export function reconstructFileContent(file: FileDiff): string {
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
export function resolveConflictMarkers(
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
      const resolvedBlock = resolveConflictBlock(oursLines, theirsLines, strategy);
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
export function resolveConflictBlock(
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
