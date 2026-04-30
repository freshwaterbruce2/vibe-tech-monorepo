# CI Reliability + Coverage — Design

**Date:** 2026-04-29
**Status:** Approved, ready for execution
**Owner:** Bruce Freshwater

## Problem

CI currently covers 37 of 65 projects. Of the 37 test-capable projects, only 20 have a `test:coverage` Nx target. There is no flake-quarantine system. Recent commits (`fix: align release workflow workspace gates`, `fix: restore affected lint gate`) suggest the release workflow is in active churn.

We want to fix two problems concurrently:

1. **Coverage gaps** — every project should gate on lint/build/test/coverage/typecheck where applicable, and every target should be wired into CI.
2. **Reliability** — flake detection, auto-quarantine with SLA, self-healing for transient failures.

## Solution Shape

Hybrid approach: a one-time agent fix campaign plus reusable scaffolding (slash commands, Nx Cloud Self-Healing CI configuration, `.nx/SELF_HEALING.md`, and `quarantine.json`).

**Pivot recorded 2026-04-29 after Phase 0:** the audit revealed CI is deterministically red (all 63 most recent ci.yml runs failed/cancelled), not flaky. Industry best practice is to fix to green before adding gates. Phase 0.5 (triage) inserted; Track B (flake quarantine/retry) deferred until a green baseline exists.

```
PHASE 0: AUDIT (1 agent, ~25k tokens, read-only) — DONE
  Output: D:\temp\ci-audit.json
              |
PHASE 0.5: CI TRIAGE (1 agent, ~25k tokens, read-only)
  Reads: gh run view --log-failed for last 30 days
  Output: D:\temp\ci-triage.json (failure categories)
              |
PHASE 1: FIX-TO-GREEN (sequential, narrow scope)
  Address each triage category until ci.yml passes once on main
              |
       +------+------+
       |             |
   TRACK A       NX CLOUD CONFIG
   coverage      (replaces Track B v1)
   7 parallel    1 sequential task
   sub-agents
       |             |
       +------+------+
              |
PHASE 2: CONSOLIDATION
         categorized PRs + scaffolding
              |
PHASE 3 (deferred): Track B flake quarantine
         Re-runs once a green baseline exists for >7 days
```

No long-running orchestrator process. Audit state is ephemeral JSON on `D:\` (matches "code on C:\, data on D:\" rule). Agents are stateless workers dispatched in parallel via single multi-tool messages.

## Phase 0: Audit Agent

**Single agent, ~25k token budget, runs first.** All downstream agents read its output.

**Inputs (read-only):**
- `pnpm nx show projects --json` — list all 65 projects
- For each: `project.json`, `package.json`, test config files
- `.github/workflows/*.yml` — which projects/targets are wired
- `gh run list --json` (last 30 days) — flake signal

**Output: `D:\temp\ci-audit.json`**

```json
{
  "generated": "2026-04-29T...",
  "projects": [
    {
      "name": "vibe-shop",
      "path": "apps/vibe-shop",
      "framework": "vite",
      "categories": ["missing-coverage-target"],
      "hasLintTarget": true,
      "hasBuildTarget": true,
      "hasTestTarget": true,
      "hasCoverageTarget": false,
      "hasTypecheckTarget": true,
      "inAffectedLint": true,
      "inAffectedBuild": true,
      "inAffectedTest": true,
      "evidence": "project.json:42 - no test:coverage target"
    }
  ],
  "flakes": [
    {
      "test": "auth.spec.ts > login retry",
      "project": "business-booking-platform",
      "failures": 3,
      "runs": 12,
      "failureRate": 0.25,
      "classification": "high-flake",
      "lastFailureRun": "..."
    }
  ],
  "nxCloudGlobs": [
    "*:lint:*",
    "*:format:*"
  ]
}
```

**Categories used:**
- `missing-lint-target`
- `missing-build-target`
- `missing-test-target`
- `missing-coverage-target`
- `missing-typecheck-target`
- `target-exists-but-not-in-ci`
- `flaky` (reliability track)
- `healthy`

A project may carry multiple categories. Each Track A sub-agent reads only the slice for its category — no double-edits.

**Token-efficiency rules:**
- Glob + Grep + `gh` CLI only; never reads full source files
- Reads `project.json` files in batches of 10 via parallel tool calls
- Outputs JSON only (no markdown report)
- Hard cap: 25k tokens; on exceed, writes partial JSON with `incomplete: true` flag

## Phase 0.5: CI Triage (inserted 2026-04-29)

Reads failing run logs from the last 30 days of GitHub Actions; classifies each failure and produces grouped fix work.

**Inputs:** `gh run list` (failed only) + `gh run view --log-failed` for top failures.

**Output: `D:\temp\ci-triage.json`**

```json
{
  "totalFailedRuns": 63,
  "categories": {
    "missing-env-var":         [{ "run": "...", "evidence": "..." }],
    "missing-dep":             [...],
    "code-failure":            [...],
    "config-error":            [...],
    "infra-timeout":           [...],
    "node-version-mismatch":   [...],
    "pnpm-install-failure":    [...]
  },
  "topRootCauses": ["..."],
  "estimatedFixOrder": ["..."]
}
```

**Token-efficiency rules:** uses `--log-failed` (not full logs) and only views the latest failed run per workflow file. Hard cap 25k.

**Categories that auto-fix can handle (Tier 1 from earlier design):** lint/format, missing-dep-in-lockfile, node-version-mismatch.

**Categories that need human judgment:** code-failure, config-error in workflow YAML.

After triage, fix-to-green is executed sequentially by category in this order: infra → env → deps → config → code. We do NOT fan out parallel agents here — workflow YAML edits collide and we want a single linear merge history during recovery.

## Track A: Coverage (7 parallel sub-agents)

Each sub-agent gets only its category's project slice plus a templated fix prompt.

| Agent | Category | Fix template |
|---|---|---|
| **A1** | `missing-lint-target` | Add `lint` target via `@nx/eslint:lint` executor. Verify with `pnpm nx lint <project>`. |
| **A2** | `missing-build-target` | Detect framework (Vite / tsc / Tauri), add appropriate `build` target. For libs without build needs, use `nx:noop` with comment. |
| **A3** | `missing-test-target` | If no tests exist, do not fabricate. Add target wired to empty `__tests__/.gitkeep` and flag in PR body. |
| **A4** | `missing-coverage-target` | Extend existing `test` target with `--coverage` variant via Nx target inheritance. Threshold = current measured baseline (no artificial 80% gate). |
| **A5** | `missing-typecheck-target` | Add `typecheck` target running `tsc --noEmit -p tsconfig.json`. |
| **A6** | `target-exists-but-not-in-ci` | Edit `.github/workflows/ci.yml` to add targets to `nx affected -t` matrix. **Sole owner of workflow YAML edits** to avoid concurrent merge conflicts. |
| **A7** | coverage-merge | Wire `dkhunt27/action-nx-code-coverage` (or equivalent) so per-project coverage reports merge into one workspace-wide report. Without this, A4's targets produce data nobody reads. |

**Per-agent contract:**
- Input: JSON slice (e.g., 5–15 project objects)
- Token budget: 30–40k
- Branch: `ci/track-a-<category>`, off `main`
- Output: PR body summary + list of files changed
- Constraint: never reads source files outside its slice
- Anti-duplication: reads existing `project.json` fully before adding any target; normalizes existing variants (`lint:fix` -> `lint`) rather than duplicating

**Failure mode:** if a sub-agent cannot classify a fix confidently for >2 projects in its slice, it writes `needs-human.md` to its branch and stops. No half-done work shipped.

## Track B: Reliability (3 sub-agents + Nx Cloud configuration)

| Agent | Job | Output |
|---|---|---|
| **B1** | flake-detector — classify into `high-flake` (>20%), `intermittent` (5–20%), `deterministic` (consistent fail). Reproduce locally if <2min. | `D:\temp\flake-classification.json` |
| **B2** | quarantine-writer — for `high-flake`: add to `quarantine.json` at repo root, tag with `test.skip.if(QUARANTINED)`, open GitHub issue with 14-day SLA. | `quarantine.json` + GitHub issues |
| **B3** | retry-config — for `intermittent`: add bounded retry (Vitest `retry: 2`, Playwright `retries: 2`) **only in CI**, scoped to identified projects, never blanket-applied. | `vitest.config.ts` / `playwright.config.ts` edits |

**Self-healing — use Nx Cloud Self-Healing CI, do not build from scratch.**

The 2026 version of Nx Cloud Self-Healing CI provides what we were planning to build:
- Auto-apply suggestions based on actual workspace CI history
- `.nx/SELF_HEALING.md` for project conventions and off-limits paths
- Glob-pattern allowlist: `<project>:<task>:<configuration>`
- Commit-hook integration (so AI commits flow through our existing 10-check pre-commit hook)
- `fix-ci` command for the CI step

**Configuration (replaces "build B4 skill from scratch"):**
1. Enable Nx Cloud Self-Healing CI in workspace settings
2. Write `.nx/SELF_HEALING.md` with red-zone exclusions (see Safety Boundaries below)
3. Configure auto-apply allowlist for Tier 1 only (e.g., `*:lint:*`, `*:format:*`)
4. Add `fix-ci` step to `.github/workflows/ci.yml`
5. Add kill switch: `D:\temp\self-heal.disabled` file makes any local pre-commit Self-Heal invocation bail immediately

**Safety boundaries (hard-coded in `.nx/SELF_HEALING.md`):**

Path globs that auto-fix never touches:
- `apps/crypto-enhanced/**` (financial logic)
- `**/auth/**`, `**/*secret*`, `**/*credential*`, `**/.env*`
- `**/migrations/**`, `**/*.sql`
- `D:\databases\**`

Other rules:
- Auto-fix touching >5 files in one change → escalate
- Auto-fix touching a file modified by human in last 24h → block, open `needs-review` PR
- Same test auto-quarantined 2× in 7 days → escalate

**Quarantine policy:** quarantine ≠ delete. Each quarantined test gets a tracking issue with a 14-day SLA (matches Microsoft's published guideline). The `/ci:quarantine-review` slash command lists overdue quarantines so flakes do not get silently buried.

## Phase 2: Consolidation

8 PRs total (6 Track A category PRs + A7 coverage-merge + 3 Track B PRs).

Merge order:
1. A1–A5 (target additions, low risk)
2. A6 (workflow YAML — depends on targets existing)
3. A7 (coverage merge action — depends on A4)
4. B1, B2, B3 (flake quarantine + retry config)
5. Nx Cloud Self-Healing CI enable + `.nx/SELF_HEALING.md` commit (last; needs all targets to exist)

Each PR is independently reviewable and revert-able.

## Rollout

| Week | Work |
|---|---|
| 1 | Phase 0 audit + Track A category PRs merged |
| 2 | Track B merged, Nx Cloud configured, `.nx/SELF_HEALING.md` committed |
| 3+ | Monitor; weekly `/ci:quarantine-review` to enforce 14-day SLA |

## Success Criteria

- 65 of 65 projects in CI (lint/build/test/typecheck targets wired where applicable)
- ≥80% of test-capable projects with `test:coverage` target
- 0 known flakes ungated (every flake classified: fixed, retried, or quarantined with issue + SLA)
- Nx Cloud Self-Healing CI enabled with auto-apply allowlist for safe ops only
- `apps/crypto-enhanced/**` exclusion verified in `.nx/SELF_HEALING.md`
- One end-to-end test of the self-heal pipeline (intentional lint break → auto-fix PR within 10 min)

## Token Budget

| Phase | Agents | Tokens each | Total |
|---|---|---|---|
| 0 audit | 1 | 25k | 25k |
| Track A | 7 | 30–40k | ~245k |
| Track B | 3 | 25–35k | ~90k |
| Orchestration | (me) | — | ~50k |
| **Total** | 11 agents | | **~410k** |

## Leave-Behind Scaffolding

- `.nx/SELF_HEALING.md` — exclusions and project conventions for Nx Cloud agent
- `quarantine.json` at repo root — single source of truth for skipped flakes
- `.claude/commands/ci-audit.md` — `/ci:audit` slash command (re-runs Phase 0)
- `.claude/commands/ci-quarantine-review.md` — `/ci:quarantine-review` (lists overdue quarantines)
- Coverage merge action wired in `.github/workflows/ci.yml`

## Research Sources

- Nx Cloud Self-Healing CI: https://nx.dev/docs/features/ci-features/self-healing-ci
- Auto-apply suggestions: https://nx.dev/blog/self-healing-ci-auto-apply-suggestions
- Google flake baseline (1.5% of runs, 16% of tests): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- Microsoft 2-week quarantine SLA: https://www.minware.com/guide/best-practices/flaky-test-quarantine
- Coverage merge action: https://github.com/dkhunt27/action-nx-code-coverage

## Out of Scope

- Migrating to a different CI provider
- Replacing pnpm or Nx
- Application-code changes (Track B never modifies app logic)
- Modifying anything in `apps/crypto-enhanced/` (always escalates to human)
