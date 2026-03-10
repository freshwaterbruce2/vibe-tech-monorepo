# Desktop Test Smart Command

---

name: test-smart
display_name: Desktop Test Smart
category: desktop
description: Intelligent test execution with coverage analysis and flaky test detection
priority: high

---

## Command

```bash
/desktop:test-smart [options]
```

## Options

- **`--scope`** (default: affected) - Test scope: `affected`, `full`, `targeted`
- **`--project`** (default: auto-detect) - Specify project
- **`--coverage`** (default: true) - Generate coverage report
- **`--e2e`** (default: false) - Include Playwright E2E tests
- **`--retry-flaky`** (default: true) - Auto-retry flaky tests

## Description

Delegates to the **desktop-test-coordinator** sub-agent for intelligent test execution. Uses Nx affected graph to run only impacted tests, detects and retries flaky tests, and generates comprehensive coverage reports.

## What It Does

1. **Test Selection Intelligence**
   - Analyzes changed files to determine which tests to run
   - Uses Nx affected:test to skip unchanged tests
   - Distinguishes between unit, integration, and E2E tests
   - Prioritizes fast tests before slow ones

2. **Test Execution**
   - Runs Vitest unit tests with proper configuration
   - Executes Playwright E2E tests (if enabled)
   - Manages test parallelization for speed
   - Handles Electron test environment setup

3. **Flaky Test Management**
   - Detects flaky tests (inconsistent pass/fail)
   - Auto-retries with exponential backoff
   - Tracks flaky test patterns
   - Suggests tests for quarantine

4. **Coverage Analysis**
   - Generates statement/branch/function/line coverage
   - Compares against thresholds (80% statement)
   - Identifies untested critical paths
   - Reports coverage gaps

## Examples

### Basic usage (affected tests only)

```bash
/desktop:test-smart
```

### Full test suite with E2E

```bash
/desktop:test-smart --scope=full --e2e
```

### Specific project without coverage

```bash
/desktop:test-smart --project=nova-agent --coverage=false
```

### Targeted tests (run specific test files)

```bash
/desktop:test-smart --scope=targeted
# Will prompt for test file selection
```

## Expected Output

```
✓ Desktop Test Smart Complete

Summary:
  Total: 127 tests
  Passed: 124
  Failed: 0
  Skipped: 2
  Flaky: 1 (AuthService login test - passed on retry 2)

Coverage:
  Statements: 82.5% ✓ (threshold: 80%)
  Branches: 76.3% ✓ (threshold: 75%)
  Functions: 84.2% ✓ (threshold: 80%)
  Lines: 81.8% ✓ (threshold: 80%)

Coverage Gaps:
  - src/services/payment.ts (0% coverage)

Execution time: 4.2s
```

## When To Use

- **Before committing code** - Ensure tests pass
- **After feature implementation** - Validate new code
- **CI/CD pipeline** - Automated testing gate
- **Coverage check** - Identify untested paths
- **Flaky test investigation** - Track inconsistent tests

## Test Scopes Explained

### Affected (default - recommended)

```bash
/desktop:test-smart --scope=affected
```

- Uses Nx affected graph
- Only runs tests for changed code
- **Fastest** - typically 40-60% time savings
- Ideal for frequent testing during development

### Full

```bash
/desktop:test-smart --scope=full
```

- Runs entire test suite
- **Slowest** - 5-10 minutes typical
- Use before major releases or when affected fails

### Targeted

```bash
/desktop:test-smart --scope=targeted
```

- Runs specific test files
- Prompts for test file selection
- Good for debugging specific features

## Sub-Agent Details

- **Delegates to**: desktop-test-coordinator
- **Model**: Claude Sonnet 4 (reasoning for test strategy)
- **Context**: 5k tokens (test configs + file list)
- **Execution time**: 4-8 minutes typical
- **Cost**: ~$0.05 per run (Sonnet pricing)

## Flaky Test Handling

The sub-agent automatically detects and retries flaky tests:

**Detection Algorithm:**

- Tracks last 5 test runs
- Flaky if 20-80% pass rate
- Quarantine if <20% pass rate

**Retry Strategy:**

- 3 retries with exponential backoff
- 1s → 2s → 4s delays
- Reports retry count in output

**Quarantine System:**

```
⚠ test-name moved to quarantine (80%+ failure rate)
Path: tests/quarantine/test-name.spec.ts
Reason: Failed 8 of last 10 runs
```

## Coverage Thresholds

Default thresholds (can be customized in vitest.config.ts):

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

**Failing build if thresholds not met:**

```
✗ Coverage below threshold:
  Statements: 74.5% < 80% (missing 5.5%)

Suggestions:
  - Add tests for src/services/payment.ts (0% coverage)
  - Improve branch coverage in src/hooks/useAuth.ts
```

## Playwright Integration

When `--e2e` is enabled:

1. **Auto-installs Playwright browsers** (if missing)
2. **Runs E2E tests** after unit tests
3. **Captures screenshots** on failure
4. **Generates trace files** for debugging

```bash
# E2E tests with Playwright
/desktop:test-smart --e2e

# Output includes:
✓ Unit tests: 4.2s (127 tests)
✓ E2E tests: 8.5s (15 tests)
  - Auth flow: 3.2s
  - Dashboard: 2.1s
  - Settings: 1.8s
```

## Integration

This command triggers the desktop-test-coordinator sub-agent through desktop-expert. The sub-agent uses Claude Sonnet 4 for test strategy reasoning (which tests to run, how to handle flaky tests).

## Related Commands

- `/desktop:quality-check` - Run quality checks before tests
- `/desktop:cleanup` - Clean test artifacts
- `/test` - Basic test run (no intelligence)

## Troubleshooting

### Playwright browsers missing

```bash
# The sub-agent auto-installs, but you can manually install:
npx playwright install chromium
```

### Tests timeout

```bash
# Increase timeout in vitest.config.ts
testTimeout: 10000  # 10 seconds
```

### Flaky tests not detected

```bash
# Need at least 5 test runs to detect patterns
# Run tests multiple times to build history
```

### Coverage report missing

```bash
# Ensure vitest.config.ts has coverage configured
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html']
}
```

---

**Created**: 2026-01-15
**Last Updated**: 2026-01-15
**Status**: Active (Phase 1)
