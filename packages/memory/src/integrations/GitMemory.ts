/**
 * Git Workflow Memory Integration
 * Tracks commits, workflows, and suggests git actions based on patterns
 */

import type { MemoryManager } from '../core/MemoryManager.js';

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  branch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  type?: 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';
}

export interface GitWorkflow {
  name: string;
  steps: string[];
  frequency: number;
  successRate: number;
  avgDuration?: number;
}

export class GitMemory {
  constructor(private memory: MemoryManager) {}

  /**
   * Track a git commit
   */
  async trackCommit(commit: CommitInfo): Promise<number> {
    // Parse conventional commit type
    const type = this.parseCommitType(commit.message);

    // Store as episodic memory
    const episodicId = this.memory.episodic.add({
      sourceId: 'git',
      query: `git commit`,
      response: commit.message,
      timestamp: commit.timestamp,
      metadata: {
        type: 'git_commit',
        hash: commit.hash,
        branch: commit.branch,
        author: commit.author,
        filesChanged: commit.filesChanged,
        additions: commit.additions,
        deletions: commit.deletions,
        commitType: type,
      },
    });

    // Store significant commits as semantic memory
    const isSignificant = commit.filesChanged >= 5 || type === 'feat' || type === 'fix';
    if (isSignificant) {
      await this.memory.semantic.add({
        text: `Git commit: ${commit.message} (${commit.branch}, ${commit.filesChanged} files, ${commit.additions}+ ${commit.deletions}-)`,
        category: 'git-history',
        importance: this.calculateCommitImportance(commit),
        metadata: {
          hash: commit.hash,
          type,
          branch: commit.branch,
        },
      });
    }

    // Track commit type as procedural pattern
    if (type) {
      this.memory.procedural.upsert({
        pattern: `git_commit_${type}`,
        context: `Conventional commit: ${type}`,
        successRate: 1.0, // Assume success if commit went through
        lastUsed: commit.timestamp,
        metadata: {
          avgFilesChanged: commit.filesChanged,
          avgAdditions: commit.additions,
          avgDeletions: commit.deletions,
        },
      });
    }

    return episodicId;
  }

  /**
   * Track a git workflow (sequence of commands)
   */
  trackWorkflow(workflow: string[], context: string, successful = true): void {
    const workflowPattern = workflow.join(' -> ');

    this.memory.procedural.upsert({
      pattern: `git_workflow_${workflowPattern}`,
      context,
      successRate: successful ? 1.0 : 0.0,
      lastUsed: Date.now(),
      metadata: {
        steps: workflow,
        stepCount: workflow.length,
      },
    });
  }

  /**
   * Get common git workflows
   */
  getCommonWorkflows(minFrequency = 3): GitWorkflow[] {
    const patterns = this.memory.procedural
      .getMostFrequent(100)
      .filter(p => p.pattern.startsWith('git_workflow_') && p.frequency >= minFrequency);

    return patterns.map(p => ({
      name: p.pattern.replace('git_workflow_', ''),
      steps: (p.metadata?.steps as string[]) ?? [],
      frequency: p.frequency,
      successRate: p.successRate,
      avgDuration: p.metadata?.avgDuration as number | undefined,
    }));
  }

  /**
   * Suggest next git command based on current context
   */
  async suggestNextCommand(currentCommand: string): Promise<{
    command: string;
    confidence: number;
    reason: string;
  } | null> {
    // Get recent git activity
    const recentGit = this.memory.episodic
      .getRecent(50, 'git')
      .filter(m => m.metadata?.type === 'git_workflow');

    // Find common sequences
    const sequences = new Map<string, number>();
    for (let i = 0; i < recentGit.length - 1; i++) {
      const current = recentGit[i].query;
      const next = recentGit[i + 1].query;
      if (current.includes(currentCommand)) {
        sequences.set(next, (sequences.get(next) ?? 0) + 1);
      }
    }

    // Find most common next command
    let bestCommand = '';
    let bestCount = 0;
    sequences.forEach((count, cmd) => {
      if (count > bestCount) {
        bestCount = count;
        bestCommand = cmd;
      }
    });

    if (bestCommand && bestCount >= 2) {
      return {
        command: bestCommand,
        confidence: Math.min(bestCount / 10, 0.9),
        reason: `You've run "${bestCommand}" after "${currentCommand}" ${bestCount} times recently`,
      };
    }

    return null;
  }

  /**
   * Get commit statistics
   */
  async getCommitStats(): Promise<{
    totalCommits: number;
    commitsByType: Record<string, number>;
    avgFilesPerCommit: number;
    mostActiveBranch: string;
    mostActiveDay: string;
  }> {
    const commits = this.memory.episodic
      .getRecent(500, 'git')
      .filter(m => m.metadata?.type === 'git_commit');

    // Count by type
    const typesCounts: Record<string, number> = {};
    commits.forEach(c => {
      const type = (c.metadata?.commitType as string) ?? 'other';
      typesCounts[type] = (typesCounts[type] ?? 0) + 1;
    });

    // Count by branch
    const branchCounts = new Map<string, number>();
    commits.forEach(c => {
      const branch = (c.metadata?.branch as string) ?? 'unknown';
      branchCounts.set(branch, (branchCounts.get(branch) ?? 0) + 1);
    });

    let mostActiveBranch = '';
    let maxBranchCount = 0;
    branchCounts.forEach((count, branch) => {
      if (count > maxBranchCount) {
        maxBranchCount = count;
        mostActiveBranch = branch;
      }
    });

    // Count by day of week
    const dayCounts = new Map<string, number>();
    commits.forEach(c => {
      const day = new Date(c.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    });

    let mostActiveDay = '';
    let maxDayCount = 0;
    dayCounts.forEach((count, day) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostActiveDay = day;
      }
    });

    // Calculate average files per commit
    const totalFiles = commits.reduce((sum, c) => sum + ((c.metadata?.filesChanged as number) ?? 0), 0);
    const avgFilesPerCommit = commits.length > 0 ? totalFiles / commits.length : 0;

    return {
      totalCommits: commits.length,
      commitsByType: typesCounts,
      avgFilesPerCommit,
      mostActiveBranch,
      mostActiveDay,
    };
  }

  /**
   * Search commit history
   */
  async searchCommits(query: string, limit = 10): Promise<Array<{
    hash: string;
    message: string;
    timestamp: number;
    branch: string;
  }>> {
    const results = this.memory.episodic.search(query, limit * 2);

    return results
      .filter(r => r.item.metadata?.type === 'git_commit')
      .slice(0, limit)
      .map(r => {
        const meta = r.item.metadata;
        if (!meta) {
          throw new Error('GitMemory.searchCommits: metadata lost after filter');
        }
        return {
          hash: (meta.hash as string) ?? '',
          message: r.item.response,
          timestamp: r.item.timestamp,
          branch: (meta.branch as string) ?? 'unknown',
        };
      });
  }

  /**
   * Parse conventional commit type
   */
  private parseCommitType(message: string): CommitInfo['type'] | undefined {
    const match = message.match(/^(feat|fix|docs|refactor|test|chore)(\(.*?\))?:/);
    return match ? (match[1] as CommitInfo['type']) : undefined;
  }

  /**
   * Calculate commit importance based on various factors
   */
  private calculateCommitImportance(commit: CommitInfo): number {
    let importance = 5; // Base importance

    // Type-based importance
    const typeImportance: Record<string, number> = {
      feat: 3,
      fix: 2,
      docs: 1,
      refactor: 1,
      test: 1,
      chore: 0,
    };
    if (commit.type) {
      importance += typeImportance[commit.type] ?? 0;
    }

    // Size-based importance
    if (commit.filesChanged >= 10) importance += 2;
    else if (commit.filesChanged >= 5) importance += 1;

    if (commit.additions + commit.deletions >= 500) importance += 2;
    else if (commit.additions + commit.deletions >= 100) importance += 1;

    return Math.min(importance, 10);
  }
}
