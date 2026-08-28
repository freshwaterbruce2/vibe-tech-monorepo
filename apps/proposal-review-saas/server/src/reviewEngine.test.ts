import { describe, expect, it } from 'vitest'

import { buildProRewrite, reviewProposal } from './reviewEngine'

describe('reviewEngine', () => {
  it('scores a detailed proposal higher than a thin one', () => {
    const strong = reviewProposal({
      clientName: 'Acme',
      projectType: 'Website redesign',
      proposalText:
        'This proposal covers discovery, milestone delivery, a launch schedule, two revision rounds, a 50% deposit, and an explicit out of scope section for new content requests.',
      priceUsd: 2200,
      turnaroundDays: 10,
      revisionRounds: 2,
    })

    const weak = reviewProposal({
      clientName: 'Acme',
      projectType: 'Website redesign',
      proposalText: 'I can build this quickly.',
      priceUsd: 400,
      turnaroundDays: 2,
      revisionRounds: 1,
    })

    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.verdict).toBe('strong')
    expect(weak.risks.length).toBeGreaterThan(0)
  })

  it('builds pro rewrite guidance from the review output', () => {
    const input = {
      clientName: 'Northwind',
      projectType: 'Sales deck refresh',
      proposalText: 'Includes milestones, timeline, and payment terms.',
      priceUsd: 1400,
      turnaroundDays: 7,
      revisionRounds: 2,
    }

    const review = reviewProposal(input)
    const rewrite = buildProRewrite(input, review)

    expect(rewrite.summary).toContain('Northwind')
    expect(rewrite.recommendedCta).toContain('Approve')
    expect(rewrite.scopeGuardrails).toHaveLength(3)
    expect(rewrite.followUpChecklist).toContain(
      'Add a deposit requirement before production starts.',
    )
  })
})
