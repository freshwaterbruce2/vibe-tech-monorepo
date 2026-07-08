/**
 * GitHubService - GitHub API integration
 * Handles PRs, issues, code review, and branch management
 */

export interface Repository {
  owner: string;
  repo: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body?: string;
  state: string;
  html_url?: string;
  user?: { login: string };
  head?: { ref: string };
  base?: { ref: string };
}

export interface PullRequestFile {
  filename: string;
  status: string;
  changes: number;
  patch?: string;
}

/**
 * Result of getPullRequestDiffWithCoverage. `truncated: false` means the
 * single-diff endpoint answered directly (file counts are unknown/0);
 * `truncated: true` means the paginated files-API fallback was used and
 * `skippedFiles` lists what didn't fit under the reconstruction size cap.
 */
export interface PullRequestDiffCoverage {
  diff: string;
  truncated: boolean;
  includedFiles: number;
  totalFiles: number;
  skippedFiles: string[];
}

export interface ReviewComment {
  id: number;
  body: string;
  path?: string;
  line?: number;
  user?: { login: string };
  commit_id?: string;
}

export interface Review {
  id: number;
  state: string;
  body?: string;
}

export interface Issue {
  number: number;
  title: string;
  body?: string;
  state: string;
  html_url?: string;
}

export interface Branch {
  name: string;
  protected: boolean;
}

export interface BranchComparison {
  ahead_by: number;
  behind_by: number;
  total_commits: number;
}

/** Cap (chars, ~= bytes for ASCII diffs) for the diff reconstructed from the
 *  paginated files API when the single-diff request 406s as too large. */
const MAX_RECONSTRUCTED_DIFF_CHARS = 400_000;
const FILES_PAGE_SIZE = 100;

/** True for GitHub's 406 "diff exceeded the maximum number of lines" error */
function isDiffTooLargeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('GitHub API error 406') || /diff exceeded/i.test(error.message);
}

/** One file's reconstructed unified-diff section: header + patch hunk(s).
 *  Files without a `patch` (binaries, renames-only) get a placeholder line
 *  so the reconstructed diff still lists them without breaking the parser. */
function buildFileDiffSection(file: PullRequestFile): string {
  const header = `diff --git a/${file.filename} b/${file.filename}`;
  if (!file.patch) {
    return `${header}\n(no patch available — ${file.status} file, likely binary)`;
  }
  return `${header}\n${file.patch}`;
}

/** Join per-file sections into one diff, skipping files once the size cap
 *  is hit and recording them in `skippedFiles` instead of truncating mid-file. */
function buildDiffCoverage(files: PullRequestFile[], maxChars: number): PullRequestDiffCoverage {
  const sections: string[] = [];
  const skippedFiles: string[] = [];
  let usedChars = 0;

  for (const file of files) {
    const section = buildFileDiffSection(file);
    if (usedChars + section.length > maxChars) {
      skippedFiles.push(file.filename);
      continue;
    }
    sections.push(section);
    usedChars += section.length;
  }

  return {
    diff: sections.join('\n'),
    truncated: skippedFiles.length > 0,
    includedFiles: files.length - skippedFiles.length,
    totalFiles: files.length,
    skippedFiles,
  };
}

export class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    if (!token || token.trim() === '') {
      throw new Error('GitHub token is required');
    }
    this.token = token;
  }

  /**
   * Parse repository info from GitHub URL
   */
  parseRepoFromUrl(url: string): Repository {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }
    return {
      owner: match[1]!,
      repo: match[2]!.replace('.git', ''),
    };
  }

  /**
   * Validate token format
   */
  isValidToken(token: string): boolean {
    return /^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]+$/.test(token);
  }

  /**
   * Check authentication
   */
  async checkAuth(): Promise<boolean> {
    try {
      const response = await this.fetch('/user');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(repo: Repository, state: string = 'open'): Promise<PullRequest[]> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/pulls?state=${state}`);
    return response.json();
  }

  /**
   * Get pull request details
   */
  async getPullRequest(repo: Repository, prNumber: number): Promise<PullRequest> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}`);
    return response.json();
  }

  /**
   * Create pull request
   */
  async createPullRequest(
    repo: Repository,
    data: { title: string; body?: string; head: string; base: string }
  ): Promise<PullRequest> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Get PR diff
   */
  async getPullRequestDiff(repo: Repository, prNumber: number): Promise<string> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}`, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
      },
    });
    return response.text();
  }

  /**
   * Get PR diff, falling back to the paginated files API when GitHub rejects
   * the single-diff request as too large (406, >20k lines). The fallback
   * reconstructs a unified-diff-like string from each file's `patch` field,
   * capped at MAX_RECONSTRUCTED_DIFF_CHARS; files beyond the cap are skipped
   * and reported via `skippedFiles` instead of crashing the review bot.
   */
  async getPullRequestDiffWithCoverage(
    repo: Repository,
    prNumber: number
  ): Promise<PullRequestDiffCoverage> {
    try {
      const diff = await this.getPullRequestDiff(repo, prNumber);
      return { diff, truncated: false, includedFiles: 0, totalFiles: 0, skippedFiles: [] };
    } catch (error) {
      if (!isDiffTooLargeError(error)) {
        throw error;
      }
      const files = await this.fetchAllPullRequestFiles(repo, prNumber);
      return buildDiffCoverage(files, MAX_RECONSTRUCTED_DIFF_CHARS);
    }
  }

  /**
   * Get PR files
   */
  async getPullRequestFiles(repo: Repository, prNumber: number): Promise<PullRequestFile[]> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/files`);
    return response.json();
  }

  /**
   * Paginated PR files fetch used by the diff-too-large fallback — follows
   * Link: rel="next" when present, otherwise assumes more pages exist while
   * a page comes back full, stopping at the first short/last page.
   */
  private async fetchAllPullRequestFiles(
    repo: Repository,
    prNumber: number
  ): Promise<PullRequestFile[]> {
    const files: PullRequestFile[] = [];
    let page = 1;

    for (;;) {
      const response = await this.fetch(
        `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/files` +
          `?per_page=${FILES_PAGE_SIZE}&page=${page}`
      );
      const pageFiles = (await response.json()) as PullRequestFile[];
      files.push(...pageFiles);

      const linkHeader = response.headers.get('link');
      const hasMore = linkHeader
        ? /rel="next"/.test(linkHeader)
        : pageFiles.length === FILES_PAGE_SIZE;
      if (!hasMore) {
        break;
      }
      page += 1;
    }

    return files;
  }

  /**
   * Create review comment
   */
  async createReviewComment(
    repo: Repository,
    prNumber: number,
    comment: { body: string; commit_id: string; path: string; line: number }
  ): Promise<ReviewComment> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(comment),
      }
    );
    return response.json();
  }

  /**
   * Submit review — optionally with inline comments in one atomic POST
   * (commit_id defaults to the PR head when omitted)
   */
  async submitReview(
    repo: Repository,
    prNumber: number,
    review: {
      event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
      body?: string;
      comments?: Array<{ path: string; line: number; side: 'RIGHT'; body: string }>;
    }
  ): Promise<Review> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(review),
      }
    );
    return response.json();
  }

  /**
   * List submitted reviews on a PR
   */
  async listReviews(repo: Repository, prNumber: number): Promise<Review[]> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/reviews`
    );
    return response.json();
  }

  /**
   * Get review comments
   */
  async getReviewComments(repo: Repository, prNumber: number): Promise<ReviewComment[]> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/comments`
    );
    return response.json();
  }

  /**
   * Create a PR-level (issue) comment
   */
  async createIssueComment(
    repo: Repository,
    issueNumber: number,
    body: string
  ): Promise<{ id: number; body: string }> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
    return response.json();
  }

  /**
   * List PR-level (issue) comments
   */
  async listIssueComments(
    repo: Repository,
    issueNumber: number
  ): Promise<Array<{ id: number; body?: string; user?: { login: string } }>> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}/comments`
    );
    return response.json();
  }

  /**
   * List issues
   */
  async listIssues(repo: Repository, state: string = 'open'): Promise<Issue[]> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/issues?state=${state}`);
    return response.json();
  }

  /**
   * Create issue
   */
  async createIssue(
    repo: Repository,
    data: { title: string; body?: string; labels?: string[] }
  ): Promise<Issue> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Update issue
   */
  async updateIssue(
    repo: Repository,
    issueNumber: number,
    data: { state?: string; title?: string; body?: string }
  ): Promise<Issue> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * List branches
   */
  async listBranches(repo: Repository): Promise<Branch[]> {
    const response = await this.fetch(`/repos/${repo.owner}/${repo.repo}/branches`);
    return response.json();
  }

  /**
   * Compare branches
   */
  async compareBranches(repo: Repository, base: string, head: string): Promise<BranchComparison> {
    const response = await this.fetch(
      `/repos/${repo.owner}/${repo.repo}/compare/${base}...${head}`
    );
    return response.json();
  }

  /**
   * Make authenticated fetch request
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));

        if (response.status === 429) {
          throw new Error('GitHub API rate limit exceeded');
        }

        throw new Error(`GitHub API error ${response.status}: ${error.message}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('GitHub API')) {
        throw error;
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
