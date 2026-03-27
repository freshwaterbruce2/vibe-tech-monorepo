import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config.js';
import { gitBranchDelete, gitWorktreeAdd, gitWorktreeRemove } from '../tools/git-tools.js';
import { runCommand } from '../tools/process-tools.js';

export class WorktreeService {
  public constructor(
    private readonly root = PATHS.worktreesDir,
    private readonly rollbackRoot = PATHS.rollbackDir,
  ) {
    mkdirSync(this.root, { recursive: true });
    mkdirSync(this.rollbackRoot, { recursive: true });
  }

  public create(candidateId: string): { branchName: string; worktreePath: string } {
    const branchName = `codex/agent-engine-${candidateId}`;
    const worktreePath = join(this.root, candidateId);
    gitWorktreeAdd(worktreePath, branchName);
    return { branchName, worktreePath };
  }

  public createRollbackPointer(
    candidateId: string,
    worktreePath: string,
  ): {
    pointerRef: string;
    pointerPath: string;
  } {
    const result = runCommand('git -c core.pager=cat rev-parse HEAD', {
      cwd: worktreePath,
      timeout: 30000,
    });

    if (!result.success) {
      throw new Error(result.stderr || `Failed to resolve rollback ref for ${candidateId}`);
    }

    const pointerRef = result.stdout.trim();
    const pointerPath = join(this.rollbackRoot, `${candidateId}.json`);

    writeFileSync(
      pointerPath,
      JSON.stringify(
        {
          candidateId,
          pointerRef,
          worktreePath,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    );

    return { pointerRef, pointerPath };
  }

  public remove(worktreePath: string, branchName?: string): void {
    gitWorktreeRemove(worktreePath);
    if (branchName) {
      try {
        gitBranchDelete(branchName);
      } catch {
        // Ignore branch deletion failures if it was already deleted or doesn't exist
      }
    }
  }
}
