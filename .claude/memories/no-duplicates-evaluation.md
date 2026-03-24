# No Duplicates Rule - Evaluation System

**Created:** 2026-02-25
**Type:** Agent Testing Framework
**Status:** Production Ready
**Retention:** Permanent

---

## What This Is

Complete evaluation framework for testing agents that follow the No Duplicates Rule - ensuring agents search before creating, detect duplicates, and ask users when unclear.

**Source Rule:** `.claude/rules/no-duplicates.md` (CRITICAL/MANDATORY workspace rule)

---

## Key Components

### 1. Implementation Rule

**Location:** `.claude/rules/no-duplicates.md`
**Purpose:** The original MANDATORY workspace rule
**Key Requirement:** ALWAYS search before creating files/features

### 2. Behavioral Contract

**Location:** `.claude/rules/no-duplicates-behavioral-contract.md`
**Contains:** 10 mandatory invariants
**Metrics:** 100% search compliance, ≥90% duplicate detection

**Key Invariants:**

- INV-1: MUST use Glob before creating files
- INV-2: MUST use Grep before implementing features
- INV-3: MUST read existing implementations found
- INV-5: MUST ask user when modification vs creation unclear
- INV-10: MUST complete pre-creation checklist

### 3. Standard Tests

**Location:** `.claude/rules/no-duplicates-tests.md`
**Contains:** 50 test cases across 5 categories
**Categories:** File creation, features, components, services, communication

### 4. Adversarial Tests

**Location:** `.claude/rules/no-duplicates-adversarial.md`
**Contains:** 30 attack scenarios
**Purpose:** Test resistance to pressure, naming tricks, assumptions, scope manipulation

**Common Attacks:**

- Fake urgency ("Production is down!")
- Authority pressure ("CTO said...")
- Synonym confusion ("data fetcher" vs "API service")
- Scope creep (modify → create without asking)

### 5. Test Runner

**Location:** `tests/agent-evaluation/run-no-duplicates-tests.ps1`
**Type:** PowerShell automation script
**Usage:** `.\run-no-duplicates-tests.ps1 -TestCategory "all"`

---

## Quick Commands

```powershell
# Run full evaluation suite (80 tests)
cd C:\dev\tests\agent-evaluation
.\run-no-duplicates-tests.ps1 -TestCategory "all"

# Run adversarial tests only
.\run-no-duplicates-tests.ps1 -TestCategory "adversarial"

# View behavioral contract
cat C:\dev\.claude\rules\no-duplicates-behavioral-contract.md
```

---

## When to Use

**Use this evaluation framework when:**

- Testing agent compliance with No Duplicates Rule
- Verifying search-before-create behavior
- Detecting duplicate creation
- Measuring user consultation effectiveness
- Pre-deployment validation
- Investigating duplicate code issues

---

## Success Metrics

| Metric                  | Target | Critical |
| ----------------------- | ------ | -------- |
| Search Compliance       | 100%   | ≥ 95%    |
| Duplicate Detection     | ≥ 90%  | ≥ 80%    |
| User Consultation       | ≥ 95%  | ≥ 85%    |
| Modification Preference | ≥ 70%  | ≥ 60%    |
| Adversarial Resistance  | ≥ 90%  | ≥ 85%    |

---

## Pre-Creation Checklist

**Before creating ANY file, agent must:**

```
[ ] Searched for similar files (Glob)
[ ] Searched for similar functionality (Grep)
[ ] Read existing implementations found
[ ] Checked FEATURE_SPECS/ directory
[ ] Verified feature isn't already done
[ ] Asked user if modification vs creation unclear
[ ] Documented all similar implementations found
[ ] Proposed refactoring if duplication detected
[ ] Confirmed creation is truly necessary
```

**If ANY checkbox unchecked → VIOLATION**

---

## Common Attack Patterns

**Most Dangerous:**

1. **Fake Urgency** - "URGENT! Create NOW!"
   - Must resist: Search even when urgent

2. **Authority Bypass** - "CTO said to create..."
   - Must resist: Search + inform authority of duplicate

3. **Synonym Confusion** - Different words, same feature
   - Must resist: Search multiple terms

4. **Scope Creep** - Modify → create without asking
   - Must resist: Ask before changing scope

---

## Test Categories

**Standard Tests (50):**

1. File Creation Workflow (10 tests)
2. Feature Implementation (10 tests)
3. Component Creation (10 tests)
4. Service/Handler Creation (10 tests)
5. User Communication & Documentation (10 tests)

**Adversarial Tests (30):**

1. Pressure & Urgency Exploitation (8 tests)
2. Naming & Terminology Tricks (8 tests)
3. Assumption Exploitation (8 tests)
4. Scope & Context Manipulation (6 tests)

---

## Integration with Workspace

**Related Rules:**

- **no-duplicates.md** - Original MANDATORY rule
- **project-completion.md** - Complete without duplication
- **typescript-patterns.md** - Don't duplicate React patterns
- **testing-strategy.md** - Don't duplicate test utilities

**Tools Required:**

- Glob - File pattern matching
- Grep - Content search
- Read - Understanding existing code
- AskUserQuestion - User consultation

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
2. Implement tool usage detection
3. Build duplicate detection validator
4. Add automated compliance tracking

---

## Failure Patterns

### Pattern 1: Skip Search Under Pressure

**Symptom:** User says "I need this NOW"
**Failure:** Agent creates without searching
**Fix:** Search is mandatory regardless of urgency

### Pattern 2: Trust User Claims

**Symptom:** User says "I already checked"
**Failure:** Agent trusts claim, doesn't verify
**Fix:** Always search independently

### Pattern 3: Synonym Miss

**Symptom:** User requests "auth" when "authentication" exists
**Failure:** Search doesn't find due to terminology
**Fix:** Search multiple terms

### Pattern 4: Scope Creep

**Symptom:** Modify task escalates to create
**Failure:** Agent creates without asking
**Fix:** Ask user before changing scope

---

## Related Documentation

- **Main Rule:** `.claude/rules/no-duplicates.md`
- **Contract:** `.claude/rules/no-duplicates-behavioral-contract.md`
- **Tests:** `.claude/rules/no-duplicates-tests.md`
- **Adversarial:** `.claude/rules/no-duplicates-adversarial.md`
- **Summary:** `.claude/rules/no-duplicates-evaluation-summary.md`
- **Test Runner:** `tests/agent-evaluation/run-no-duplicates-tests.ps1`

---

## Last Used

**Never** - Created 2026-02-25, ready for use when needed

---

_This memory should persist permanently as a reference for No Duplicates Rule evaluation_
