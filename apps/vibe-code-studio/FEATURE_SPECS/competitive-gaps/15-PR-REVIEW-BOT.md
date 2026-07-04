# Feature Spec: Hosted PR Review Bot

**Status**: ✅ SHIPPED 2026-07-04 (Phases 1-2; Phase 3 autofix + MultiAgentReview integration deferred — see "Implementation status" below)
**Priority**: MEDIUM
**Effort**: M-L (2-5wk) — GitHub App/Action plumbing + inline comment API is the bulk; the review pipeline itself already exists
**Competitor parity**: Cursor Bugbot — automatic PR review with inline comments and one-click fixes
**Dependencies**: GitHub Apps API or GitHub Actions, `@octokit/rest` (or equivalent), monorepo Express 5 backend (port 5177) or serverless function for webhook receipt

---

## User Story

As a developer working with collaborators (or reviewing my own PRs before merge), I want every PR to automatically get an AI review with inline comments on the diff and an optional one-click autofix, so that obvious bugs and security issues are caught before a human reviewer's time is spent on them — without me having to open VCS locally first.

## Why VCS lacks this today

`AICodeReviewer` (parses a `ParsedDiff` into `ReviewComment[]` with `severity`/`category`/`suggestion` fields, producing a `CodeReview` verdict) and `MultiAgentReview` (multi-agent consensus review, surfaced via `MultiAgentReviewPanel`) both operate on a diff the user already has open inside VCS. Neither is reachable from GitHub's webhook/Action surface — there's no hosted entry point, no GitHub PR review API integration, and no autofix-commit capability.

## Acceptance Criteria

1. ✅ `.github/workflows/vcs-review.yml` triggers on `pull_request` opened/synchronize/reopened/ready_for_review, fetches the diff via the GitHub API (no local checkout dependency), and runs the review pipeline headless (`scripts/review-ci.mjs` → `runReviewBot`)
2. ✅ Phase 1: each pass posts a summary comment with `verdict`, `qualityScore`, `issueCount`, pass counter, and dedup stats
3. ✅ Phase 2: findings post as inline review comments in ONE atomic `POST /pulls/{n}/reviews` (`path`, `line`, `side: RIGHT`, body), clamped to lines present in the diff; unanchorable findings fold into the review body instead of 422ing
4. ✅\* Suggested-change fences only for AI findings carrying an exact `replacement` field — `ReviewComment.suggestion` is PROSE, and one-click-applying prose would insert English into source (deviation from this spec's own example payload); prose renders as `_Suggestion:_` text
5. ✅ Dedup on `synchronize` via FNV-1a fingerprints (path+line+normalized message) embedded as invisible HTML-comment markers — GitHub is the only store
6. ⬜ Phase 3 autofix DEFERRED — needs `contents: write` + commit-push capability `GitHubService` doesn't have
7. ⬜ Phase 3 autofix attribution — deferred with #6
8. ✅ `scripts/review-local.mjs` runs the identical pipeline (same `buildReviewPayload` path) against `git diff <base>...HEAD` and prints the same report CI posts
9. ✅ Per-PR pass budget (default 5, `.vcs/review.json` `maxReviewPasses`), checked FIRST — before any diff fetch or AI spend; posts a one-time "budget exhausted" notice
10. ⬜ Merge blocking deferred (off by default per spec anyway); `requestChangesEnabled: false` downgrades REQUEST_CHANGES verdicts to COMMENT until enabled
11. ✅\* `.vcs/review.json` exists (zod, JSONC, TaskParser pattern) with severity threshold + category suppression (spec's open question: implemented); `multiAgent.enabled` is parsed but REJECTED with a warning — `MultiAgentReview` is entirely mock (hardcoded heuristics) and must not post to real PRs
12. ✅\* Cheap version: workflow `if: github.actor != 'github-actions[bot]'` guard; the full fix-commit exclusion ships with Phase 3

### Implementation status (2026-07-04)

Shipped on `feat/vcs-task-runner`, Phases 1-2. New: `src/services/review/` (types,
reviewConfig, diffLineIndex, fingerprint, dedup, budget, githubPayload,
aiCommentGenerator, reviewEnv, orchestrator, reporter), thin shims
`scripts/review-ci.mjs` + `scripts/review-local.mjs` (tsx), root workflow
`vcs-review.yml`. `GitHubService` gained `createIssueComment` / `listIssueComments`
/ `listReviews` / `submitReview({comments})`. `AICodeReviewer.reviewChanges` gained an
opt-in `aiCommentProvider` hook — the long-stubbed `generateAIComments` is now real
(JSON-mode prompt → zod validation → clamp to diff lines), local panel behavior
unchanged (cache + no-provider path byte-identical). **Also fixed a pre-existing
`parseDiff` bug**: multi-file diffs attached each file's last chunk to the NEXT file.

CI AI provider: OPENROUTER_API_KEY (preferred) or DEEPSEEK_API_KEY repo secret,
called directly (the port-5004 proxy is session-cookie-gated — unusable from CI).
Missing secrets degrade to heuristics-only review, never a red check. Fork PRs
(read-only token) log 403 and exit 0.

## Example GitHub review-comment payload mapping

`ReviewComment` → GitHub Pull Request Review API `comments[]` entry:

````typescript
// ReviewComment (existing, from AICodeReviewer.ts)
{ file: 'src/api/auth.ts', line: 42, severity: 'error',
  category: 'security', message: 'SQL built via string concat', suggestion: 'Use parameterized query' }

// → GitHub review comment
{ path: 'src/api/auth.ts', line: 42, side: 'RIGHT',
  body: '**security**: SQL built via string concat\n\n```suggestion\nUse parameterized query\n```' }
````

This mapping is the entire job of `ReviewOrchestrator` for Phase 2 — no new review logic, just a field-shape translation plus GitHub's fenced ` ```suggestion ` block syntax so a maintainer can accept the fix inline with one click, same UX as a human reviewer's suggested change.

## Architecture / Solution

```
GitHub PR event ──► GitHub Action / webhook ──► Express 5 backend (:5177) or serverless fn
                                                        │
                                                        ▼
                                          ReviewOrchestrator (new, headless wrapper)
                                            ├─ GitDiffService.parse(diff) → ParsedDiff
                                            ├─ AICodeReviewer.review(...) → CodeReview
                                            ├─ MultiAgentReview (optional, deeper pass)
                                            └─ GitHubService.postReview(...) → inline comments
                                                        │
                                    "Fix this" trigger  ▼
                                          CodeCorrectionAgent / SecurityAgent
                                            → fix commit → PR branch (via GitHubService)
```

The review _logic_ is not rebuilt — `AICodeReviewer` and `MultiAgentReview` already produce structured `ReviewComment[]`. What's missing is the _hosting_: something that receives GitHub webhooks, fetches PR diffs without a local checkout, and translates `ReviewComment[]` into GitHub's review-comment API shape (`path`, `line`, `side`, `body`). That translation layer, `ReviewOrchestrator`, is the only genuinely new component; everything downstream of "I have a `ParsedDiff`" is reuse.

## Implementation (phased)

### Phase 1 — Action posts a review summary

- `.github/workflows/vcs-review.yml`: on `pull_request`, checkout, run headless review via a small Node entry script
- `src/services/review/ReviewOrchestrator.ts`: fetches PR diff (via GitHub API, not local git), calls `AICodeReviewer.review`, posts one summary comment via `GitHubService`
- Backend endpoint on Express 5 (`:5177`) to receive the webhook if using a GitHub App instead of a plain Action (Action is simpler for Phase 1, no hosting needed)

### Phase 2 — Inline line comments

- Extend `ReviewOrchestrator` to map `ReviewComment[]` → GitHub Pull Request Review API `comments[]` (`path`, `line`, `body`, suggestion block when `suggestion` present)
- Dedup logic: track previously-posted comment hashes (file+line+message) per PR, skip on `synchronize` if unchanged
- Severity → GitHub review `event` mapping (`COMMENT` vs `REQUEST_CHANGES`) driven by `CodeReview.verdict`

### Phase 3 — Autofix + local parity

- Bot comment reaction/slash-command listener → spawns `CodeCorrectionAgent` (and `SecurityAgent` for security-flagged findings) scoped to the single flagged file/line range
- Fix commit pushed to PR head branch via `GitHubService`, bot-attributed, no force-push
- `vcs review` local CLI command wraps `ReviewOrchestrator` against `git diff` output for pre-push parity with CI

## Integration points (existing code to hook into)

- `src/services/AICodeReviewer.ts` — core review engine; reuse `review()` → `CodeReview`/`ReviewComment[]` verbatim
- `src/services/ai/MultiAgentReview.ts` — ⚠️ currently a **mock** (hardcoded heuristics), gated OFF for real PRs per AC #11; treat as a future deeper-pass hook, not a usable reviewer, until implemented for real
- `src/components/MultiAgentReviewPanel.tsx` — local UI counterpart; `vcs review` should render the same panel against the fetched PR diff for local preview
- `src/services/GitHubService.ts` — PR fetch, comment/review posting, branch push for autofix commits
- `src/services/GitDiffService.ts` — diff parsing (`ParsedDiff`/`DiffFile`/`DiffChunk`) reused for both local and hosted paths
- `src/services/specialized-agents/SecurityAgent.ts`, `src/services/specialized-agents/CodeCorrectionAgent.ts` — autofix execution in Phase 3
- Monorepo Express 5 backend (port 5177) — webhook receipt host if a GitHub App (vs. plain Action) is chosen

## Test Scenarios

- Vitest: `ReviewOrchestrator.test.ts` — mock `GitHubService`, assert `ReviewComment[]` maps to correct GitHub review-comment payload shape (path/line/side/body)
- Vitest: dedup logic — same finding on unchanged line across two `synchronize` events posts once
- Integration: run `ReviewOrchestrator` against a fixture diff with a known injected bug, assert the posted review includes a matching inline comment
- Playwright/manual: open a real test PR against a scratch repo, confirm Action run posts inline comments within CI time budget
- Vitest: autofix commit scoping — assert `CodeCorrectionAgent` invocation touches only the flagged file, not unrelated files in the PR
- Vitest: bot self-comment exclusion — a `synchronize` event triggered by the bot's own autofix push doesn't spawn a second review of the fix commit as if it were new user-authored diff

## Success Metrics

- Review posts within 3 minutes of PR open/sync on a typical VCS-sized diff (<500 changed lines)
- False-positive inline comment rate < 15% (user-dismissed / thumbs-down) after Phase 2 ships, tracked via reaction on bot comments
- Zero force-pushes or out-of-scope file writes from autofix commits across a 4-week dogfood period
- `MultiAgentReview` opt-in usage doesn't push median review latency past 3 minutes for repos that enable it (validates the opt-in framing rather than a blanket-on default)

## Local/CI parity note

Acceptance Criteria #8 (`vcs review` matches CI) matters more than it looks: without it, a developer's local pre-push check can pass while the hosted bot flags something different, eroding trust in either surface. `ReviewOrchestrator` must be the single code path both the GitHub Action and the local CLI command call — no parallel "local review logic" and "hosted review logic" that can drift.

## Cost containment

AI review cost is the operational risk most likely to surface post-launch, not a theoretical one — a busy repo with frequent force-pushes and a low `synchronize` rate limit ceiling (Acceptance Criteria #9) can otherwise run the review pipeline dozens of times against a single PR in an afternoon. `ReviewOrchestrator` should track review-pass count per PR in a lightweight counter (PR number + review count, reset on merge/close) and refuse further passes past the configured budget, surfacing a "review budget exhausted for this PR" comment rather than silently going quiet.

## Post-ship follow-ups (2026-07-04)

Phases 1–2 shipped and the four rollout decisions landed as specced (OpenRouter-preferred direct provider with DeepSeek fallback + heuristics degradation; all-code-PR trigger; real AI inline comments; budget + dedup guards; fork-PRs exit 0). Remaining hardening, **not yet built** — captured here so it isn't lost:

- ⬜ **Skip draft PRs** — don't run on `opened` while `draft: true`; wait for `ready_for_review`, so WIP pushes don't burn review passes.
- ⬜ **Noise / path filters** — skip diffs that are only lockfiles, generated, or vendored (`pnpm-lock.yaml`, `dist/`, `*.min.*`, coverage/build artifacts); they cost tokens for near-zero signal.
- ⬜ **`no-bot` label escape hatch** — a PR label that suppresses the pass for docs-only or intentionally-unreviewed PRs.
- ⬜ **Real `MultiAgentReview`** — currently a mock (hardcoded heuristics, config-rejected per AC #11). Implement for real before enabling the deeper pass, or drop it from the Architecture/Integration sections so the doc stops implying a capability that isn't wired.
- ⬜ **Optional staged scope** — the trigger is currently all `pull_request` events repo-wide; if noise proves high, add a path/label filter to bake on `apps/vibe-code-studio` PRs before re-widening.

---

**Risks / Open questions**: GitHub App vs. plain Action changes hosting requirements significantly (App needs a persistent webhook receiver; Action does not). Recommend starting with a plain Action for Phase 1-2 and only standing up the Express 5 webhook path if autofix (Phase 3) needs App-level permissions (contents:write) that Actions' default `GITHUB_TOKEN` can't cleanly grant. AI review cost per PR needs a budget cap before enabling on high-churn repos. Should `.vcs/review.json` also let a repo opt out of specific `ReviewComment.category` values (e.g. suppress `style` findings, keep `security`/`bug`) to reduce noise on legacy codebases?
**Sequencing**: Wave 3. Depends on nothing in this batch; could ship independently of specs 03/04/16/17.
