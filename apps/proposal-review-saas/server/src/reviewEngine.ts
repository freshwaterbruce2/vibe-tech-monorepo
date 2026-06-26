/* eslint-disable max-lines-per-function */
export interface ProposalReviewInput {
  clientName: string
  projectType: string
  proposalText: string
  priceUsd: number
  turnaroundDays: number
  revisionRounds: number
}

export interface ProposalReviewResult {
  score: number
  verdict: 'strong' | 'needs-work' | 'risky'
  strengths: string[]
  risks: string[]
  nextStep: string
}

export interface ProposalRewriteResult {
  summary: string
  recommendedCta: string
  scopeGuardrails: string[]
  followUpChecklist: string[]
}

export function reviewProposal(input: ProposalReviewInput): ProposalReviewResult {
  const normalizedText = input.proposalText.toLowerCase()
  const strengths: string[] = []
  const risks: string[] = []
  let score = 62

  if (input.proposalText.trim().length >= 320) {
    score += 10
    strengths.push('The proposal includes enough detail to feel concrete.')
  } else {
    risks.push('The proposal is still thin. Add more detail on deliverables and process.')
  }

  if (containsAny(normalizedText, ['timeline', 'milestone', 'schedule'])) {
    score += 8
    strengths.push('A timeline or milestone expectation is already present.')
  } else {
    risks.push('No timeline language found. Buyers need a clear delivery sequence.')
  }

  if (containsAny(normalizedText, ['revision', 'feedback', 'round'])) {
    score += 8
    strengths.push('Revision expectations are visible, which reduces negotiation friction.')
  } else {
    risks.push('Revision boundaries are missing. Scope drift risk is high.')
  }

  if (containsAny(normalizedText, ['deposit', 'payment', 'invoice'])) {
    score += 8
    strengths.push('The proposal references payment mechanics, which improves buyer confidence.')
  } else {
    risks.push('There is no payment language yet. Add a deposit or billing term.')
  }

  if (containsAny(normalizedText, ['out of scope', 'not included', 'assumption'])) {
    score += 8
    strengths.push('Scope boundaries are already called out.')
  } else {
    risks.push('Scope boundaries are not explicit enough yet.')
  }

  if (input.turnaroundDays <= 3 && input.priceUsd < 750) {
    score -= 8
    risks.push('Fast turnaround with low pricing signals margin pressure.')
  } else if (input.turnaroundDays >= 7 && input.priceUsd >= 1200) {
    score += 6
    strengths.push('Delivery window and pricing look aligned for premium positioning.')
  }

  if (input.revisionRounds <= 1) {
    score -= 4
    risks.push('Only one revision round may feel restrictive for a paid engagement.')
  } else if (input.revisionRounds <= 3) {
    score += 4
    strengths.push('Revision count is commercially reasonable.')
  } else {
    score -= 3
    risks.push('Too many revision rounds can erase margin and confuse scope.')
  }

  score = clamp(score, 18, 96)

  return {
    score,
    verdict: score >= 80 ? 'strong' : score >= 60 ? 'needs-work' : 'risky',
    strengths,
    risks,
    nextStep:
      score >= 80
        ? 'Send this proposal with a Stripe checkout link and a short approval deadline.'
        : score >= 60
          ? 'Tighten pricing, scope boundaries, and payment terms before sending.'
          : 'Rewrite the scope, timeline, and payment section before this goes to a client.',
  }
}

export function buildProRewrite(
  input: ProposalReviewInput,
  review: ProposalReviewResult,
): ProposalRewriteResult {
  return {
    summary: `${input.clientName || 'The client'} is evaluating a ${input.projectType.toLowerCase()} proposal priced at $${input.priceUsd}. The current review score is ${review.score}/100, so the pro recommendation focuses on tightening value framing and protecting scope.`,
    recommendedCta: `Approve the ${input.projectType.toLowerCase()} scope this week to lock the ${input.turnaroundDays}-day delivery window and move directly into kickoff.`,
    scopeGuardrails: [
      `Limit the engagement to ${input.revisionRounds} revision rounds unless a paid change request is approved.`,
      'Separate discovery requests from delivery work and price them as add-ons instead of absorbing them into the base scope.',
      'Tie final file handoff to completed payment so the delivery boundary is commercially clear.',
    ],
    followUpChecklist: [
      'Confirm the decision-maker, launch date, and must-have deliverables in writing.',
      'Add a deposit requirement before production starts.',
      'Attach a Stripe checkout link and an approval deadline in the final send.',
    ],
  }
}

function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
