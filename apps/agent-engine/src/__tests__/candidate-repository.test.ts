import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CandidateRepository } from '../services/candidate-repository.js';
import type { CandidateRevision } from '../types.js';

describe('candidate repository', () => {
  it('persists and reloads candidate revisions', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-engine-candidates-'));
    const repository = new CandidateRepository(root);
    const candidate: CandidateRevision = {
      id: 'candidate-1',
      createdAt: new Date().toISOString(),
      reason: 'Improve routing',
      expectedImprovement: 'Higher solve rate',
      benchmarkScope: ['repo-local'],
      rollbackRef: 'HEAD',
      branchName: 'codex/agent-engine-candidate-1',
      worktreePath: 'D:\\learning-system\\agent-engine\\worktrees\\candidate-1',
      filesTouched: ['apps/agent-engine/src/policy/default-policy.ts'],
      diffSummary: 'tune policy bundle',
      status: 'pending',
    };

    repository.save(candidate);
    expect(repository.get('candidate-1')).toEqual(candidate);

    rmSync(root, { recursive: true, force: true });
  });
});
