# Testing Strategy

## Coverage Policy — 100% on New / Changed Code (MANDATORY)

Priority: MANDATORY — enforced by the pre-commit hook (hard block).
Last Updated: 2026-06-25

**Every executable line a commit ADDS or MODIFIES in app/package/backend source
must be covered by a test.** Scope is _changed code only_ — legacy untouched files
are grandfathered and cleaned up incrementally, so the gate never retroactively
blocks code you didn't touch.

- **Gate**: `scripts/check-diff-coverage.js`, run from `scripts/pre-commit.ps1`
  (step 3b). It computes added lines from the staged diff and checks them against
  per-project Istanbul coverage (`<project>/coverage/coverage-final.json`).
- **In scope**: `apps/<p>/**/src`, `packages/<p>/**/src`, `backend/**/src`
  (`.ts/.tsx/.js/.jsx/.mjs/.cjs`). **Out of scope**: tests, `.d.ts`, `*.config.*`,
  `types.ts` / `*.types.ts`, generated/migrations, and all tooling
  (`scripts/`, `tools/`, root configs).
- **Failure modes**: an added line that is executable but unhit → fail; an in-scope
  file with executable additions and no coverage report (no test exercises it) → fail.
- **Coverage is produced** by `nx affected -t test:coverage --files=<staged>` right
  before the gate runs. Project vitest configs must keep `json` in
  `coverage.reporter` (the v8 provider writes `coverage-final.json`).
- **Escape hatches** (rollout / emergency only): `COVERAGE_GATE=off` skips the gate;
  `git commit --no-verify` bypasses all pre-commit checks. Prefer adding the test.

The whole-project percentage thresholds below are the _floor_ for legacy code; new
work targets 100% via the diff gate.

## Tools & Targets

- **E2E**: Playwright (`pnpm run test`, `pnpm run test:ui`)
- **Unit**: Vitest + React Testing Library (`pnpm run test:unit`)
- **Legacy coverage floor**: 80%+ overall; pages 80%, components 75%, hooks 90%
- **New/changed code**: 100% (enforced — see Coverage Policy above)
- **Test locations**: `tests/` and `src/**/*.test.tsx`

## Coverage Commands

```bash
pnpm run test:coverage          # all coverage
pnpm run test:unit:coverage     # React/TS only
pnpm run crypto:coverage        # Python only (crypto-enhanced)
pnpm run test:coverage:all      # Nx parallel with caching
```

## Agent Evaluation Tests

Location: `tests/agent-evaluation/` — PowerShell runners for AI agent compliance.

```powershell
cd tests/agent-evaluation
.\run-web-search-grounding-tests.ps1 -TestCategory "all"   # 80 tests
.\run-no-duplicates-tests.ps1 -TestCategory "all"          # 80 tests
.\run-no-duplicates-tests.ps1 -TestId "TEST-ND-001"        # single test
```

Targets: web-search ≥95% standard / ≥90% adversarial / 0% hallucination; no-duplicates 100% search compliance. See `.claude/rules/*-evaluation-summary.md`.

## Testing Philosophy

- Write tests to discover problems, not to make them pass
- Test behavior, not implementation — focus on user-facing functionality
- Mock external dependencies; isolate units under test
- Arrange-Act-Assert pattern; descriptive test names

## Pre-commit Checks (auto-run)

Lint-staged path/AST checks, ESLint, Nx affected typecheck, **diff coverage gate
(100% on changed code)**, byte-size (<5MB) + line-count caps, verification harness,
database growth trend. Plus security scan, conflict markers, and trading-system safety.

Bypass (emergency only): `git commit --no-verify -m "emergency fix"`
