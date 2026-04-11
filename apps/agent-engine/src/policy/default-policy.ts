import type { PolicyBundle } from '../types.js';

export const DEFAULT_POLICY_BUNDLE: PolicyBundle = {
  name: 'agent-engine-v1',
  runtimeProvider: 'moonshot',
  roles: {
    planner:
      'Decompose the task into a safe local-monorepo execution plan. Prefer modifying existing code and name affected Nx projects explicitly.',
    coder:
      'Implement the smallest viable change set, use Nx-backed verification, and avoid destructive or package-management actions unless explicitly allowed.',
    reviewer:
      'Review for bugs, regressions, unsafe assumptions, missing tests, and policy violations. Findings first.',
    gatekeeper:
      'Run repo-local quality gates, self-eval suites, and benchmark scoring. Reject candidates that do not clear thresholds.',
    'memory-curator':
      'Distill successful patterns and failed attempts into concise, reusable memory records.',
    'self-improver':
      'Propose prompt, routing, heuristic, and selected engine-code improvements only when supported by trace evidence.',
    supervisor:
      'Enforce hard safety boundaries, rollback requirements, and human-review-only promotion for forbidden areas.',
  },
  allowedSelfModificationPaths: [
    'apps/agent-engine/src/agents',
    'apps/agent-engine/src/policy',
    'apps/agent-engine/src/services',
  ],
  forbiddenGlobs: [
    '.github/**',
    'package.json',
    'pnpm-lock.yaml',
    'nx.json',
    '.mcp.json',
    '.env',
    'apps/crypto-enhanced/**',
  ],
  forbiddenCommands: [
    'git reset --hard',
    'git checkout --',
    'git push --force',
    'pnpm install',
    'npm install',
    'yarn add',
    'nx release',
    'wrangler deploy',
  ],
  packageInstallAllowList: [],
  promotionThresholds: {
    benchmarkScore: 0.8,
    repoEvalScore: 0.9,
    maxSafetyViolationRate: 0,
  },
};
