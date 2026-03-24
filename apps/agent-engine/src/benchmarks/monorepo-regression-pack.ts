import type { TaskSpec } from '../types.js';

export const MONOREPO_REGRESSION_PACK: TaskSpec[] = [
  {
    id: 'monorepo-health-audit',
    title: 'Workspace health audit',
    objective: 'Run safe workspace health checks and summarize risks without mutating repo state.',
    constraints: ['Use Nx or existing repo scripts only', 'Do not write tracked files'],
    acceptanceCriteria: ['Health script completes', 'Summary identifies failures or clean state'],
    affectedProjects: ['agent-engine'],
  },
  {
    id: 'review-affected-changes',
    title: 'Review affected changes',
    objective: 'Review changed code for bugs, regressions, and policy violations.',
    constraints: ['Use git diff against main', 'Findings before summary'],
    acceptanceCriteria: ['Review output groups findings by severity'],
    affectedProjects: ['agent-engine'],
  },
  {
    id: 'quality-gate-affected',
    title: 'Run affected quality gates',
    objective: 'Run lint, typecheck, and build for affected projects and summarize failures.',
    constraints: ['Use Nx affected targets', 'No auto-fix'],
    acceptanceCriteria: ['Gate results report pass/fail per target'],
    affectedProjects: ['agent-engine'],
  },
];
