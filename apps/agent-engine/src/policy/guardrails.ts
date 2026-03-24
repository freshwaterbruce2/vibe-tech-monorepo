import type { CandidateRevision, PolicyBundle } from '../types.js';

export interface GuardrailCheckResult {
  safe: boolean;
  reasons: string[];
}

export function evaluateCandidateAgainstPolicy(
  candidate: Pick<CandidateRevision, 'filesTouched' | 'diffSummary'>,
  policy: PolicyBundle,
): GuardrailCheckResult {
  const reasons: string[] = [];

  for (const file of candidate.filesTouched) {
    const normalized = file.replace(/\\/g, '/');
    const allowed = policy.allowedSelfModificationPaths.some((path) =>
      normalized.startsWith(path.replace(/\\/g, '/')),
    );

    if (!allowed) {
      reasons.push(`File outside self-modification allowlist: ${file}`);
    }

    for (const forbidden of policy.forbiddenGlobs) {
      const marker = forbidden.replace('/**', '').replace(/\\/g, '/');
      if (normalized === marker || normalized.startsWith(marker)) {
        reasons.push(`File touches forbidden area: ${file}`);
      }
    }
  }

  const diffLower = candidate.diffSummary.toLowerCase();
  for (const forbiddenCommand of policy.forbiddenCommands) {
    if (diffLower.includes(forbiddenCommand.toLowerCase())) {
      reasons.push(`Candidate references forbidden command: ${forbiddenCommand}`);
    }
  }

  return { safe: reasons.length === 0, reasons };
}
