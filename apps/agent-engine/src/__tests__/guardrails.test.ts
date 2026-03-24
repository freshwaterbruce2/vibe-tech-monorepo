import { DEFAULT_POLICY_BUNDLE } from '../policy/default-policy.js';
import { evaluateCandidateAgainstPolicy } from '../policy/guardrails.js';

describe('guardrails', () => {
  it('allows candidates that stay inside the self-modification allowlist', () => {
    const result = evaluateCandidateAgainstPolicy(
      {
        filesTouched: ['apps/agent-engine/src/services/execution-service.ts'],
        diffSummary: 'adjust execution heuristics',
      },
      DEFAULT_POLICY_BUNDLE,
    );

    expect(result.safe).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('rejects candidates that touch forbidden areas or commands', () => {
    const result = evaluateCandidateAgainstPolicy(
      {
        filesTouched: [
          '.github/workflows/ci.yml',
          'apps/agent-engine/src/services/execution-service.ts',
        ],
        diffSummary: 'run git reset --hard before promotion',
      },
      DEFAULT_POLICY_BUNDLE,
    );

    expect(result.safe).toBe(false);
    expect(result.reasons.join('\n')).toContain('forbidden area');
    expect(result.reasons.join('\n')).toContain('forbidden command');
  });
});
