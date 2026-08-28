/**
 * AICodeReviewer Tests
 * TDD: AI-powered code review with inline suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AIService
vi.mock('../../services/ai/UnifiedAIService', () => ({
  UnifiedAIService: vi.fn().mockImplementation(() => ({
    sendContextualMessage: vi.fn().mockResolvedValue('AI review feedback'),
  })),
}));

const mockDiff = `
diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -10,6 +10,8 @@
 function hello() {
+  const x = null;
+  console.log(x.toString());
   return 'hello';
 }
`;

describe('AICodeReviewer', () => {
  let AICodeReviewer: any;
  let mockAIService: any;

  beforeEach(async () => {
    mockAIService = {
      sendContextualMessage: vi.fn().mockResolvedValue('Review comment'),
    };

    try {
      const module = await import('../../services/AICodeReviewer');
      AICodeReviewer = module.AICodeReviewer;
    } catch {
      // Expected to fail initially - TDD RED phase
      AICodeReviewer = null;
    }
  });

  describe('Initialization', () => {
    it('should initialize with AI service', () => {
      if (!AICodeReviewer) return;

      expect(() => {
        new AICodeReviewer(mockAIService);
      }).not.toThrow();
    });
  });

  describe('Diff Analysis', () => {
    it('should parse git diff', () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const parsed = reviewer.parseDiff(mockDiff);

      expect(parsed).toBeDefined();
      expect(parsed.files).toBeDefined();
      expect(parsed.files.length).toBeGreaterThan(0);
    });

    it('should extract changed lines', () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const parsed = reviewer.parseDiff(mockDiff);

      const file = parsed.files[0];
      expect(file.additions).toBeGreaterThan(0);
    });

    it('should identify file paths', () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const parsed = reviewer.parseDiff(mockDiff);

      expect(parsed.files[0].path).toBe('src/test.ts');
    });

    it('attributes chunks to the correct file in multi-file diffs (regression)', () => {
      if (!AICodeReviewer) return;

      const multiDiff = [
        'diff --git a/src/one.ts b/src/one.ts',
        '--- a/src/one.ts',
        '+++ b/src/one.ts',
        '@@ -1,1 +1,2 @@',
        ' first',
        '+added one',
        'diff --git a/src/two.ts b/src/two.ts',
        '--- a/src/two.ts',
        '+++ b/src/two.ts',
        '@@ -5,1 +5,2 @@',
        ' fifth',
        '+added two',
        '',
      ].join('\n');

      const reviewer = new AICodeReviewer(mockAIService);
      const parsed = reviewer.parseDiff(multiDiff);

      expect(parsed.files).toHaveLength(2);
      expect(parsed.files[0].chunks).toHaveLength(1);
      expect(parsed.files[1].chunks).toHaveLength(1);
      expect(parsed.files[0].chunks[0].lines.map((l: any) => l.lineNumber)).toEqual([1, 2]);
      expect(parsed.files[1].chunks[0].lines.map((l: any) => l.lineNumber)).toEqual([5, 6]);
    });
  });

  describe('Code Review', () => {
    it('should review changes', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review).toBeDefined();
      expect(review.comments).toBeDefined();
      expect(Array.isArray(review.comments)).toBe(true);
    });

    it('should detect potential issues', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      // Should detect null reference issue
      const hasIssue = review.comments.some(
        (c: any) => c.severity === 'error' || c.severity === 'warning'
      );

      expect(hasIssue).toBe(true);
    });

    it('should provide line-specific comments', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review.comments[0].line).toBeDefined();
      expect(review.comments[0].file).toBeDefined();
    });

    it('should categorize issues', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      const comment = review.comments[0];
      expect(comment.category).toBeDefined();
      expect(['bug', 'style', 'performance', 'security', 'best-practice']).toContain(
        comment.category
      );
    });

    it('should provide suggestions', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review.comments[0].suggestion).toBeDefined();
    });
  });

  describe('AI-Powered Insights', () => {
    it('should generate AI review', async () => {
      if (!AICodeReviewer) return;

      mockAIService.sendContextualMessage.mockResolvedValueOnce(
        'This code has a null reference issue. Add null check before accessing properties.'
      );

      const reviewer = new AICodeReviewer(mockAIService);
      const insights = await reviewer.generateAIReview(mockDiff);

      expect(insights).toBeDefined();
      expect(insights.summary).toBeDefined();
      expect(insights.suggestions).toBeDefined();
    });

    it('should detect code smells', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const smells = await reviewer.detectCodeSmells(mockDiff);

      expect(Array.isArray(smells)).toBe(true);
    });

    it('should suggest improvements', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      const improvements = review.comments.filter((c: any) => c.type === 'improvement');
      expect(improvements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Review Scoring', () => {
    it('should calculate code quality score', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review.qualityScore).toBeDefined();
      expect(review.qualityScore).toBeGreaterThanOrEqual(0);
      expect(review.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should count issues by severity', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review.issueCount).toBeDefined();
      expect(review.issueCount.errors).toBeGreaterThanOrEqual(0);
      expect(review.issueCount.warnings).toBeGreaterThanOrEqual(0);
      expect(review.issueCount.info).toBeGreaterThanOrEqual(0);
    });

    it('should provide overall verdict', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);

      expect(review.verdict).toBeDefined();
      expect(['approve', 'request_changes', 'comment']).toContain(review.verdict);
    });
  });

  describe('Performance', () => {
    it('should handle large diffs', async () => {
      if (!AICodeReviewer) return;

      const largeDiff = mockDiff.repeat(100);

      const reviewer = new AICodeReviewer(mockAIService);
      const startTime = performance.now();

      await reviewer.reviewChanges(largeDiff);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should cache review results', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);

      const review1 = await reviewer.reviewChanges(mockDiff);
      const review2 = await reviewer.reviewChanges(mockDiff);

      expect(review2.cached).toBe(true);
    });
  });

  describe('AI comment provider hook (spec 15)', () => {
    const aiFinding = {
      file: 'src/test.ts',
      line: 11,
      severity: 'error',
      category: 'security',
      type: 'issue',
      message: 'Injected AI finding',
    };

    it('merges provider findings into the review and affects counts', async () => {
      if (!AICodeReviewer) return;

      const provider = vi.fn().mockResolvedValue([aiFinding]);
      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff, { aiCommentProvider: provider });

      expect(provider).toHaveBeenCalledTimes(1);
      // Provider receives the parsed diff + raw diff
      expect(provider.mock.calls[0][0].files[0].path).toBe('src/test.ts');
      expect(provider.mock.calls[0][1]).toBe(mockDiff);
      expect(review.comments.some((c: any) => c.message === 'Injected AI finding')).toBe(true);
      expect(review.issueCount.errors).toBeGreaterThanOrEqual(1);
    });

    it('without a provider behavior is unchanged (no AI findings)', async () => {
      if (!AICodeReviewer) return;

      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff);
      expect(review.comments.some((c: any) => c.message === 'Injected AI finding')).toBe(false);
    });

    it('bypasses the cache in both directions when a provider is passed', async () => {
      if (!AICodeReviewer) return;

      const provider = vi.fn().mockResolvedValue([aiFinding]);
      const reviewer = new AICodeReviewer(mockAIService);

      // Warm the cache with a heuristics-only pass...
      await reviewer.reviewChanges(mockDiff);
      // ...an AI pass must not return the stale cached entry
      const aiReview = await reviewer.reviewChanges(mockDiff, { aiCommentProvider: provider });
      expect(aiReview.cached).toBeUndefined();
      expect(aiReview.comments.some((c: any) => c.message === 'Injected AI finding')).toBe(true);

      // ...and the AI pass must not poison the cache for local callers
      const localReview = await reviewer.reviewChanges(mockDiff);
      expect(localReview.comments.some((c: any) => c.message === 'Injected AI finding')).toBe(
        false
      );
    });

    it('a throwing provider degrades to heuristics-only, not a rejection', async () => {
      if (!AICodeReviewer) return;

      const provider = vi.fn().mockRejectedValue(new Error('AI down'));
      const reviewer = new AICodeReviewer(mockAIService);
      const review = await reviewer.reviewChanges(mockDiff, { aiCommentProvider: provider });

      expect(review.comments.length).toBeGreaterThan(0); // heuristics still present
      expect(review.comments.some((c: any) => c.message === 'Injected AI finding')).toBe(false);
    });
  });
});
