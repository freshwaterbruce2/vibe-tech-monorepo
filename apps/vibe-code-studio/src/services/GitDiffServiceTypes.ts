/**
 * GitDiffServiceTypes - Shared types and interfaces for GitDiffService
 */

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
