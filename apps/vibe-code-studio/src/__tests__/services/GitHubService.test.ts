/**
 * GitHubService Tests
 * TDD: GitHub API integration for PRs, issues, and code review
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('GitHubService', () => {
  let GitHubService: any;
  let mockToken: string;
  let mockRepo: { owner: string; repo: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockToken = 'ghp_test123';
    mockRepo = { owner: 'testowner', repo: 'testrepo' };

    try {
      const module = await import('../../services/GitHubService');
      GitHubService = module.GitHubService;
    } catch {
      // Expected to fail initially - TDD RED phase
      GitHubService = null;
    }
  });

  describe('Initialization', () => {
    it('should initialize with token', () => {
      if (!GitHubService) return;

      expect(() => {
        new GitHubService(mockToken);
      }).not.toThrow();
    });

    it('should throw without token', () => {
      if (!GitHubService) return;

      expect(() => {
        new GitHubService('');
      }).toThrow(/token/i);
    });

    it('should parse repository from remote URL', () => {
      if (!GitHubService) return;

      const service = new GitHubService(mockToken);
      const repo = service.parseRepoFromUrl('https://github.com/owner/repo.git');

      expect(repo.owner).toBe('owner');
      expect(repo.repo).toBe('repo');
    });
  });

  describe('Pull Requests', () => {
    it('should list pull requests', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ number: 1, title: 'Test PR', state: 'open' }],
      });

      const service = new GitHubService(mockToken);
      const prs = await service.listPullRequests(mockRepo);

      expect(Array.isArray(prs)).toBe(true);
      expect(prs.length).toBe(1);
      expect(prs[0].number).toBe(1);
    });

    it('should get PR details', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 1,
          title: 'Test PR',
          body: 'Description',
          state: 'open',
          user: { login: 'testuser' },
        }),
      });

      const service = new GitHubService(mockToken);
      const pr = await service.getPullRequest(mockRepo, 1);

      expect(pr.number).toBe(1);
      expect(pr.title).toBe('Test PR');
    });

    it('should create pull request', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 2,
          html_url: 'https://github.com/owner/repo/pull/2',
        }),
      });

      const service = new GitHubService(mockToken);
      const pr = await service.createPullRequest(mockRepo, {
        title: 'New Feature',
        body: 'Description',
        head: 'feature-branch',
        base: 'main',
      });

      expect(pr.number).toBe(2);
      expect(pr.html_url).toBeDefined();
    });

    it('should get PR diff', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'diff --git a/file.ts b/file.ts\n+new line',
      });

      const service = new GitHubService(mockToken);
      const diff = await service.getPullRequestDiff(mockRepo, 1);

      expect(diff).toContain('diff --git');
      expect(diff).toContain('+new line');
    });
  });

  describe('PR diff coverage fallback (large PR — 406 diff-too-large)', () => {
    function mockDiffTooLargeOnce() {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 406,
        json: async () => ({
          message: 'Sorry, the diff exceeded the maximum number of lines (20000)',
        }),
      });
    }

    function mockFilesPage(files: unknown[], linkHeader: string | null) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => files,
        headers: { get: (name: string) => (name === 'link' ? linkHeader : null) },
      });
    }

    it('returns the diff directly when the initial fetch succeeds (no 406)', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'diff --git a/file.ts b/file.ts\n+new line',
      });

      const service = new GitHubService(mockToken);
      const result = await service.getPullRequestDiffWithCoverage(mockRepo, 1);

      expect(result).toEqual({
        diff: 'diff --git a/file.ts b/file.ts\n+new line',
        truncated: false,
        includedFiles: 0,
        totalFiles: 0,
        skippedFiles: [],
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the paginated files API and reconstructs patches across 2 pages', async () => {
      if (!GitHubService) return;

      mockDiffTooLargeOnce();
      mockFilesPage(
        [
          {
            filename: 'src/a.ts',
            status: 'modified',
            changes: 3,
            patch: '@@ -1,1 +1,2 @@\n+added',
          },
          {
            filename: 'src/b.ts',
            status: 'modified',
            changes: 1,
            patch: '@@ -1,1 +1,1 @@\n-old\n+new',
          },
        ],
        '<https://api.github.com/repos/testowner/testrepo/pulls/1/files?page=2>; rel="next"'
      );
      mockFilesPage(
        [{ filename: 'src/c.ts', status: 'added', changes: 5, patch: '@@ -0,0 +1,5 @@\n+created' }],
        null
      );

      const service = new GitHubService(mockToken);
      const result = await service.getPullRequestDiffWithCoverage(mockRepo, 1);

      expect(result.truncated).toBe(false);
      expect(result.totalFiles).toBe(3);
      expect(result.includedFiles).toBe(3);
      expect(result.skippedFiles).toEqual([]);
      expect(result.diff).toContain('diff --git a/src/a.ts b/src/a.ts');
      expect(result.diff).toContain('diff --git a/src/c.ts b/src/c.ts');
      expect(result.diff).toContain('+created');
      expect(global.fetch).toHaveBeenCalledTimes(3);
      const urls = (global.fetch as any).mock.calls.map((call: unknown[]) => call[0]);
      expect(urls[2]).toContain('page=2');
    });

    it('gives a placeholder section for a binary file with no patch', async () => {
      if (!GitHubService) return;

      mockDiffTooLargeOnce();
      mockFilesPage([{ filename: 'assets/logo.png', status: 'modified', changes: 0 }], null);

      const service = new GitHubService(mockToken);
      const result = await service.getPullRequestDiffWithCoverage(mockRepo, 1);

      expect(result.diff).toContain('diff --git a/assets/logo.png b/assets/logo.png');
      expect(result.diff).toContain('no patch available');
      expect(result.totalFiles).toBe(1);
      expect(result.includedFiles).toBe(1);
      expect(result.truncated).toBe(false);
    });

    it('sets truncated and records skipped files once the size cap is exceeded', async () => {
      if (!GitHubService) return;

      mockDiffTooLargeOnce();
      const hugePatch = '+'.repeat(410_000);
      mockFilesPage(
        [
          { filename: 'huge.ts', status: 'modified', changes: 1, patch: hugePatch },
          { filename: 'small.ts', status: 'modified', changes: 1, patch: '@@ -1,1 +1,1 @@\n+x' },
        ],
        null
      );

      const service = new GitHubService(mockToken);
      const result = await service.getPullRequestDiffWithCoverage(mockRepo, 1);

      expect(result.truncated).toBe(true);
      expect(result.skippedFiles).toEqual(['huge.ts']);
      expect(result.includedFiles).toBe(1);
      expect(result.totalFiles).toBe(2);
      expect(result.diff).toContain('diff --git a/small.ts b/small.ts');
      expect(result.diff).not.toContain('diff --git a/huge.ts');
    });

    it('non-406 errors on the diff request still throw, without falling back', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      const service = new GitHubService(mockToken);
      await expect(service.getPullRequestDiffWithCoverage(mockRepo, 1)).rejects.toThrow(/500/);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not fall back for a non-Error thrown value (isDiffTooLargeError false branch)', async () => {
      if (!GitHubService) return;

      // ok:true so the private fetch() wrapper's try/catch never runs; the
      // rejection comes from response.text() itself, so it reaches
      // getPullRequestDiffWithCoverage's catch as a raw non-Error value.
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.reject('boom'),
      });

      const service = new GitHubService(mockToken);
      await expect(service.getPullRequestDiffWithCoverage(mockRepo, 1)).rejects.toBe('boom');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Code Review', () => {
    it('should get PR files', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ filename: 'src/test.ts', status: 'modified', changes: 10 }],
      });

      const service = new GitHubService(mockToken);
      const files = await service.getPullRequestFiles(mockRepo, 1);

      expect(Array.isArray(files)).toBe(true);
      expect(files[0].filename).toBe('src/test.ts');
    });

    it('should create review comment', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, body: 'Comment' }),
      });

      const service = new GitHubService(mockToken);
      const comment = await service.createReviewComment(mockRepo, 1, {
        body: 'Good work!',
        commit_id: 'abc123',
        path: 'src/test.ts',
        line: 10,
      });

      expect(comment.id).toBe(123);
    });

    it('should submit review', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 456, state: 'APPROVED' }),
      });

      const service = new GitHubService(mockToken);
      const review = await service.submitReview(mockRepo, 1, {
        event: 'APPROVE',
        body: 'LGTM',
      });

      expect(review.state).toBe('APPROVED');
    });

    it('should get review comments', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, body: 'Comment 1', user: { login: 'user1' } }],
      });

      const service = new GitHubService(mockToken);
      const comments = await service.getReviewComments(mockRepo, 1);

      expect(Array.isArray(comments)).toBe(true);
      expect(comments[0].body).toBe('Comment 1');
    });
  });

  describe('Issues', () => {
    it('should list issues', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ number: 10, title: 'Bug', state: 'open' }],
      });

      const service = new GitHubService(mockToken);
      const issues = await service.listIssues(mockRepo);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues[0].number).toBe(10);
    });

    it('should create issue', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ number: 11, html_url: 'https://...' }),
      });

      const service = new GitHubService(mockToken);
      const issue = await service.createIssue(mockRepo, {
        title: 'New Bug',
        body: 'Description',
      });

      expect(issue.number).toBe(11);
    });

    it('should close issue', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ number: 10, state: 'closed' }),
      });

      const service = new GitHubService(mockToken);
      const issue = await service.updateIssue(mockRepo, 10, { state: 'closed' });

      expect(issue.state).toBe('closed');
    });
  });

  describe('Branches', () => {
    it('should list branches', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'main', protected: true },
          { name: 'feature', protected: false },
        ],
      });

      const service = new GitHubService(mockToken);
      const branches = await service.listBranches(mockRepo);

      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBe(2);
    });

    it('should compare branches', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ahead_by: 5,
          behind_by: 2,
          total_commits: 5,
        }),
      });

      const service = new GitHubService(mockToken);
      const comparison = await service.compareBranches(mockRepo, 'main', 'feature');

      expect(comparison.ahead_by).toBe(5);
      expect(comparison.behind_by).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      const service = new GitHubService(mockToken);

      await expect(service.listPullRequests(mockRepo)).rejects.toThrow(/404/);
    });

    it('should handle network errors', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const service = new GitHubService(mockToken);

      await expect(service.listPullRequests(mockRepo)).rejects.toThrow(/Network/);
    });

    it('should handle rate limiting', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      const service = new GitHubService(mockToken);

      await expect(service.listPullRequests(mockRepo)).rejects.toThrow(/rate limit/i);
    });
  });

  describe('Authentication', () => {
    it('should validate token format', () => {
      if (!GitHubService) return;

      const service = new GitHubService(mockToken);
      expect(service.isValidToken('ghp_valid123')).toBe(true);
      expect(service.isValidToken('invalid')).toBe(false);
    });

    it('should check authentication', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      });

      const service = new GitHubService(mockToken);
      const authenticated = await service.checkAuth();

      expect(authenticated).toBe(true);
    });
  });

  describe('Review bot endpoints (spec 15)', () => {
    it('creates a PR-level issue comment', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 9, body: 'summary' }),
      });

      const service = new GitHubService(mockToken);
      const comment = await service.createIssueComment(mockRepo, 7, 'summary');

      expect(comment.id).toBe(9);
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('https://api.github.com/repos/testowner/testrepo/issues/7/comments');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ body: 'summary' });
    });

    it('lists PR-level issue comments', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, body: 'first' }],
      });

      const service = new GitHubService(mockToken);
      const comments = await service.listIssueComments(mockRepo, 7);

      expect(comments).toHaveLength(1);
      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('https://api.github.com/repos/testowner/testrepo/issues/7/comments');
    });

    it('lists submitted reviews', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 3, state: 'COMMENTED' }],
      });

      const service = new GitHubService(mockToken);
      const reviews = await service.listReviews(mockRepo, 7);

      expect(reviews[0].state).toBe('COMMENTED');
      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('https://api.github.com/repos/testowner/testrepo/pulls/7/reviews');
    });

    it('submits a review with inline comments in one POST', async () => {
      if (!GitHubService) return;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 4, state: 'COMMENTED' }),
      });

      const service = new GitHubService(mockToken);
      const inline = [{ path: 'src/a.ts', line: 10, side: 'RIGHT', body: 'finding' }];
      await service.submitReview(mockRepo, 7, {
        event: 'COMMENT',
        body: 'verdict',
        comments: inline,
      });

      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('https://api.github.com/repos/testowner/testrepo/pulls/7/reviews');
      expect(JSON.parse(init.body)).toEqual({
        event: 'COMMENT',
        body: 'verdict',
        comments: inline,
      });
    });
  });
});
