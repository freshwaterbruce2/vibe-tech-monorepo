# Web Search Grounding Evaluation System

**Created:** 2026-02-24
**Type:** Agent Testing Framework
**Status:** Production Ready
**Retention:** Permanent

---

## What This Is

Complete evaluation framework for testing agents that use web search to ground responses in current information (post-January 2026).

---

## Key Components

### 1. Implementation Rule
**Location:** `.claude/rules/web-search-grounding.md`
**Purpose:** Rule that agents should follow for web search behavior
**Key Requirement:** ALWAYS search for post-cutoff info, versions, APIs, best practices

### 2. Behavioral Contract
**Location:** `.claude/rules/web-search-grounding-behavioral-contract.md`
**Contains:** 10 mandatory invariants
**Metrics:** 95% compliance target, 0% hallucination tolerance

### 3. Standard Tests
**Location:** `.claude/rules/web-search-grounding-tests.md`
**Contains:** 50 test cases across 5 categories
**Categories:** Post-cutoff, Versions, APIs, Best Practices, Edge Cases

### 4. Adversarial Tests
**Location:** `.claude/rules/web-search-grounding-adversarial.md**
**Contains:** 30 attack scenarios
**Purpose:** Test resistance to ambiguity, time manipulation, source fabrication, hallucinations

### 5. Test Runner
**Location:** `tests/agent-evaluation/run-web-search-grounding-tests.ps1`
**Type:** PowerShell automation script
**Usage:** `.\run-web-search-grounding-tests.ps1 -TestCategory "all"`

---

## Quick Commands

```powershell
# Run full evaluation suite (80 tests)
cd C:\dev\tests\agent-evaluation
.\run-web-search-grounding-tests.ps1 -TestCategory "all"

# Run adversarial tests only
.\run-web-search-grounding-tests.ps1 -TestCategory "adversarial"

# View behavioral contract
cat C:\dev\.claude\rules\web-search-grounding-behavioral-contract.md
```

---

## When to Use

**Use this evaluation framework when:**
- Testing a new agent implementation
- Verifying web search grounding behavior
- Detecting hallucinated sources
- Measuring compliance rates
- Pre-deployment validation
- Investigating reported issues

---

## Success Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Standard Test Pass Rate | ≥ 95% | ≥ 90% |
| Adversarial Resistance | ≥ 90% | ≥ 85% |
| Source Citation Rate | 100% | ≥ 95% |
| Hallucination Rate | 0% | 0% |

---

## Key Invariants (Must Remember)

1. **INV-1:** MUST search for post-January 2026 information
2. **INV-2:** MUST search for all version queries
3. **INV-3:** MUST search for API documentation
4. **INV-5:** MUST include "Sources:" section after search
5. **INV-7:** MUST NEVER hallucinate URLs

---

## Attack Scenarios to Watch

**Common Attack Patterns:**
- Vague time references ("What's the state of React?")
- False information planting ("I heard React 20 is out")
- Fake documentation URLs (reactjs.org/fake-url)
- Fake API features ("useServerData hook")
- Time manipulation (future dates as past events)

---

## Integration with Workspace

**Related Systems:**
- **agent-evaluation skill** - General agent testing patterns
- **project-completion.md** - Uses web search for 2026 best practices
- **typescript-patterns.md** - Verifies current patterns via search
- **testing-strategy.md** - General testing philosophy

---

## Current Limitations

**Framework Status:**
- ✅ Complete behavioral contract
- ✅ Complete test cases
- ✅ Test runner script ready
- ⚠️ Requires Claude Code API integration for real testing
- ⚠️ Currently simulation-based (shows what to check)

**To Enable Real Testing:**
1. Integrate with Claude Code API
2. Implement response parsing
3. Build URL authenticity validator
4. Add automated compliance tracking

---

## Future Enhancements

**Planned:**
- Real-time monitoring dashboard
- Automated weekly test runs
- Source quality scoring
- Query effectiveness metrics
- Comparative analysis across agent versions

---

## Related Documentation

- **Main Rule:** `.claude/rules/web-search-grounding.md`
- **Contract:** `.claude/rules/web-search-grounding-behavioral-contract.md`
- **Tests:** `.claude/rules/web-search-grounding-tests.md`
- **Adversarial:** `.claude/rules/web-search-grounding-adversarial.md`
- **Summary:** `.claude/rules/web-search-grounding-evaluation-summary.md`
- **Test Runner:** `tests/agent-evaluation/run-web-search-grounding-tests.ps1`

---

## Last Used

**Never** - Created 2026-02-24, ready for use when needed

---

_This memory should persist permanently as a reference for agent evaluation_
