# Testing Strategy

## Web Application Testing

- **E2E Testing**: Playwright for end-to-end testing
- **Unit Testing**: Vitest with React Testing Library
- **Interactive Debugging**: `pnpm run test:ui` for Playwright UI mode
- **Coverage Reports**: `pnpm run test:unit:coverage`
- **Test Locations**: `tests/` and `src/**/*.test.tsx`
- **Coverage Target**: 80%+ (enforced in vitest.config.ts)

## Coverage Commands

```bash
# Run all coverage reports
pnpm run test:coverage

# Python only (crypto-enhanced)
pnpm run crypto:coverage

# React only
pnpm run test:unit:coverage

# View HTML reports
pnpm run crypto:coverage:report    # Python
start coverage/index.html         # React

# Nx optimized (parallel execution with caching)
pnpm run test:coverage:all
```

## Test Priority Areas

See `TEST_PRIORITY_ACTION_PLAN.md` for detailed priority breakdown.

### React Critical Areas

**High Priority:**

1. `src/pages/` - Error boundaries, loading states
2. `src/components/` - Form validation, conditional logic
3. `src/hooks/` - Async operations, race conditions

**Target Coverage:**

- Pages: 80%+ statement coverage
- Components: 75%+ branch coverage
- Hooks: 90%+ for async operations

## Agent Evaluation Testing

For testing AI agents (Claude Code, custom agents):

- **Framework**: Multiple evaluation suites (Web Search Grounding, No Duplicates Rule)
- **Location**: `tests/agent-evaluation/`
- **Documentation**: `.claude/rules/*-evaluation-summary.md`
- **Test Runners**: PowerShell scripts in `tests/agent-evaluation/`

### Web Search Grounding Evaluation

**Documentation**: `.claude/rules/web-search-grounding-*.md`

```powershell
cd tests/agent-evaluation

# Run all web search grounding tests (80 tests)
.\run-web-search-grounding-tests.ps1 -TestCategory "all"

# Run adversarial tests only
.\run-web-search-grounding-tests.ps1 -TestCategory "adversarial"

# Run specific test
.\run-web-search-grounding-tests.ps1 -TestId "TEST-001"
```

**Test Categories:**

1. **Behavioral Contract** - Verify 10 core invariants
2. **Standard Tests** (50 tests) - Post-cutoff info, versions, APIs, best practices
3. **Adversarial Tests** (30 tests) - Ambiguity, time manipulation, hallucination induction

**Target Compliance:**

- Standard Tests: ≥ 95%
- Adversarial Resistance: ≥ 90%
- Hallucination Rate: 0%

### No Duplicates Rule Evaluation

**Documentation**: `.claude/rules/no-duplicates-*.md`

```powershell
cd tests/agent-evaluation

# Run all no duplicates tests (80 tests)
.\run-no-duplicates-tests.ps1 -TestCategory "all"

# Run adversarial tests only
.\run-no-duplicates-tests.ps1 -TestCategory "adversarial"

# Run specific category
.\run-no-duplicates-tests.ps1 -TestCategory "file-creation"
```

**Test Categories:**

1. **Behavioral Contract** - Verify 10 core invariants
2. **Standard Tests** (50 tests) - File creation, features, components, services, communication
3. **Adversarial Tests** (30 tests) - Pressure exploitation, naming tricks, assumption exploitation, scope manipulation

**Target Compliance:**

- Search Compliance: 100%
- Duplicate Detection: ≥ 90%
- User Consultation: ≥ 95%
- Adversarial Resistance: ≥ 90%

### Common Attack Patterns

**Web Search Grounding:**

- Fake urgency bypassing search requirements
- Ambiguous date references
- Hallucinated sources
- Version confusion

**No Duplicates:**

- Pressure to skip search (fake urgency)
- Synonym confusion (different names, same feature)
- Trust user claims ("I already checked")
- Scope creep (modify → create without asking)

**See:**

- `.claude/rules/web-search-grounding-evaluation-summary.md`
- `.claude/rules/no-duplicates-evaluation-summary.md`

---

## Testing Philosophy

- **Never write tests just to make them pass** - write tests to discover problems
- **Test behavior, not implementation** - focus on user-facing functionality
- **Mock external dependencies** - isolate units under test
- **Use descriptive test names** - clearly state what is being tested and expected outcome
- **Arrange-Act-Assert pattern** - structure tests consistently

## Pre-commit Testing

The pre-commit hook includes:

- Unit tests for staged files
- Lint checks with auto-fix
- TypeScript type checking
- File size validation (<5MB)
- Security scanning for secrets

**Bypass (Emergency Only):**

```bash
git commit --no-verify -m "emergency fix"  # Skip all hooks
```

## Git Hooks & Pre-commit Quality Gates

The repository includes an enhanced pre-commit hook (`.git/hooks/pre-commit`) that runs automatically before each commit:

### Pre-commit Checks (10 total)

1. **File Size Validation** - Blocks files >5MB from being committed
2. **Security Scan** - Detects hardcoded secrets, API keys, tokens in code
3. **JavaScript/TypeScript** - ESLint with auto-fix, checks for console.log/debugger
4. **Python Linting** - Ruff check + format, warns about print statements
5. **PowerShell Analysis** - PSScriptAnalyzer for script quality
6. **Rust Formatting** - rustfmt for .rs files
7. **JSON/YAML Validation** - Syntax validation for config files
8. **Merge Conflict Detection** - Prevents committing conflict markers
9. **Import Validation** - Warns about deep relative imports (../../../)
10. **Trading System Safety** - Financial safety checks before code changes

### Performance

- **Target**: <5 seconds execution time
- **Typical**: 2-3 seconds for clean commits
- **Uses parallel checks** where possible
