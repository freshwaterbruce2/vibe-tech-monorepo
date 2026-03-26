# Testing Strategy

## Tools & Targets

- **E2E**: Playwright (`pnpm run test`, `pnpm run test:ui`)
- **Unit**: Vitest + React Testing Library (`pnpm run test:unit`)
- **Coverage target**: 80%+ overall; pages 80%, components 75%, hooks 90%
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

## Pre-commit Checks (auto-run, 10 total)

File size (<5MB), security scan, ESLint/TS, Python ruff, PowerShell, Rust fmt, JSON/YAML, conflict markers, import depth, trading system safety.

Bypass (emergency only): `git commit --no-verify -m "emergency fix"`
