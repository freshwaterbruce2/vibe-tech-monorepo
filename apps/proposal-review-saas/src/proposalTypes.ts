export interface ReviewInput {
  clientName: string;
  projectType: string;
  proposalText: string;
  priceUsd: string;
  turnaroundDays: string;
  revisionRounds: string;
}

export interface ReviewResult {
  score: number;
  verdict: 'strong' | 'needs-work' | 'risky';
  strengths: string[];
  risks: string[];
  nextStep: string;
}

export interface RewriteResult {
  summary: string;
  recommendedCta: string;
  scopeGuardrails: string[];
  followUpChecklist: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}
