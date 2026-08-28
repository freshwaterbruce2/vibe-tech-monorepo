import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { JusticeResultCard } from '../JusticeResultCard'
import type { LogicPattern } from '@/types/logic'

describe('JusticeResultCard', () => {
  // Helper to create mock pattern
  const createMockPattern = (overrides: Partial<LogicPattern> = {}): LogicPattern => ({
    id: 'pattern-123',
    logic_rule: 'Default logic rule for testing',
    tags: ['evidence', 'legal'],
    ...overrides,
  })

  // ==================== Basic Rendering Tests ====================

  describe('Basic Rendering', () => {
    it('renders the rule ID', () => {
      const pattern = createMockPattern({ id: 'rule-456' })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText(/rule id: #rule-456/i)).toBeInTheDocument()
    })

    it('renders the logic rule text', () => {
      const pattern = createMockPattern({ logic_rule: 'Test evidence rule' })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText('Test evidence rule')).toBeInTheDocument()
    })

    it('renders all tags', () => {
      const pattern = createMockPattern({ tags: ['criminal', 'civil', 'contract'] })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText('#criminal')).toBeInTheDocument()
      expect(screen.getByText('#civil')).toBeInTheDocument()
      expect(screen.getByText('#contract')).toBeInTheDocument()
    })

    it('renders numeric ID correctly', () => {
      const pattern = createMockPattern({ id: 42 })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText(/rule id: #42/i)).toBeInTheDocument()
    })

    it('handles empty tags array', () => {
      const pattern = createMockPattern({ tags: [] })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      // Should render without crashing, no tag elements
      expect(screen.getByText(/rule id:/i)).toBeInTheDocument()
    })
  })

  // ==================== Score Display Tests ====================

  describe('Score Display', () => {
    it('displays score as percentage', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0.75} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('rounds score correctly', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0.876} />)

      expect(screen.getByText('88%')).toBeInTheDocument()
    })

    it('displays 0% for zero score', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('displays 100% for perfect score', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={1} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  // ==================== High Relevance Tests ====================

  describe('High Relevance (score > 0.8)', () => {
    it('applies high relevance styling', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.85} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-indigo-950/30')
      expect(card).toHaveClass('border-indigo-500/50')
    })

    it('shows gradient effect for high relevance', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.9} />)

      // Check for the gradient div that only appears for high relevance
      const gradientDiv = container.querySelector('.bg-gradient-to-br')
      expect(gradientDiv).toBeInTheDocument()
    })

    it('applies highlight to score badge', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0.95} />)

      const scoreBadge = screen.getByText('95%')
      expect(scoreBadge.closest('div')).toHaveClass('bg-indigo-500')
      expect(scoreBadge.closest('div')).toHaveClass('text-white')
    })
  })

  // ==================== Medium Relevance Tests ====================

  describe('Medium Relevance (0.5 < score <= 0.8)', () => {
    it('applies medium relevance styling', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.65} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-slate-900/40')
      expect(card).toHaveClass('border-slate-700')
    })

    it('does not show gradient effect', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.7} />)

      const gradientDiv = container.querySelector('.bg-gradient-to-br')
      expect(gradientDiv).not.toBeInTheDocument()
    })

    it('applies neutral styling to score badge', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0.75} />)

      const scoreBadge = screen.getByText('75%')
      expect(scoreBadge.closest('div')).toHaveClass('bg-slate-800')
      expect(scoreBadge.closest('div')).toHaveClass('text-slate-400')
    })

    it('handles edge case at exactly 0.8 as medium', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.8} />)

      const card = container.firstChild as HTMLElement
      // Score of exactly 0.8 should be medium (not high)
      expect(card).toHaveClass('bg-slate-900/40')
    })
  })

  // ==================== Low Relevance Tests ====================

  describe('Low Relevance (score <= 0.5)', () => {
    it('applies low relevance styling with opacity', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.3} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-slate-900/20')
      expect(card).toHaveClass('border-slate-800')
      expect(card).toHaveClass('opacity-60')
    })

    it('does not show gradient effect', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.25} />)

      const gradientDiv = container.querySelector('.bg-gradient-to-br')
      expect(gradientDiv).not.toBeInTheDocument()
    })

    it('handles edge case at exactly 0.5 as low', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.5} />)

      const card = container.firstChild as HTMLElement
      // Score of exactly 0.5 should be low (not medium)
      expect(card).toHaveClass('bg-slate-900/20')
      expect(card).toHaveClass('opacity-60')
    })

    it('handles very low scores', () => {
      const pattern = createMockPattern()
      render(<JusticeResultCard pattern={pattern} score={0.05} />)

      expect(screen.getByText('5%')).toBeInTheDocument()
    })
  })

  // ==================== Boundary Tests ====================

  describe('Score Boundaries', () => {
    it('treats 0.81 as high relevance', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.81} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-indigo-950/30')
    })

    it('treats 0.51 as medium relevance', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.51} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-slate-900/40')
    })

    it('treats 0.49 as low relevance', () => {
      const pattern = createMockPattern()
      const { container } = render(<JusticeResultCard pattern={pattern} score={0.49} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('opacity-60')
    })
  })

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('handles very long logic rule text', () => {
      const pattern = createMockPattern({
        logic_rule: 'A'.repeat(500),
      })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText('A'.repeat(500))).toBeInTheDocument()
    })

    it('handles special characters in logic rule', () => {
      const pattern = createMockPattern({
        logic_rule: 'Rule with <special> & "characters"',
      })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText('Rule with <special> & "characters"')).toBeInTheDocument()
    })

    it('handles many tags', () => {
      const pattern = createMockPattern({
        tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
      })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      // All tags should be rendered
      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`#tag${i}`)).toBeInTheDocument()
      }
    })

    it('handles special characters in tags', () => {
      const pattern = createMockPattern({
        tags: ['tag-with-dash', 'tag_with_underscore'],
      })
      render(<JusticeResultCard pattern={pattern} score={0.5} />)

      expect(screen.getByText('#tag-with-dash')).toBeInTheDocument()
      expect(screen.getByText('#tag_with_underscore')).toBeInTheDocument()
    })
  })
})
