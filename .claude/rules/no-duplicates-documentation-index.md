# No Duplicates Rule - Documentation Index

Complete reference for all documentation related to the No Duplicates Rule evaluation system.

Last Updated: 2026-02-25

---

## Core Documentation Files

### 1. Implementation Rule

**File:** `.claude/rules/no-duplicates.md`
**Purpose:** The actual rule agents must follow
**Contains:**

- When to search before creating (ALWAYS)
- Search patterns (Glob for files, Grep for functionality)
- Read existing implementations workflow
- User consultation requirements
- Pre-creation checklist

---

### 2. Behavioral Contract

**File:** `.claude/rules/no-duplicates-behavioral-contract.md`
**Purpose:** Mandatory behavioral invariants
**Contains:**

- 10 core invariants (INV-1 through INV-10)
- Measurement metrics (search compliance, duplicate detection, user consultation rates)
- Behavioral boundaries (MUST/SHOULD/MAY/MUST NOT)
- Failure modes and severity levels
- Contract enforcement protocols

**Key Invariants:**

- INV-1: Search Before Create (Files) - MUST use Glob
- INV-2: Search Before Create (Functionality) - MUST use Grep
- INV-3: Read Existing Implementations - MUST analyze what exists
- INV-5: Ask User When Unclear - MUST use AskUserQuestion
- INV-10: Pre-Creation Checklist - MUST complete ALL steps

---

### 3. Standard Test Cases

**File:** `.claude/rules/no-duplicates-tests.md`
**Purpose:** 50 test cases for normal behavior validation
**Contains:**

- 5 test categories (10 tests each)
- Expected behaviors for each test
- Pass/fail criteria
- Test execution protocol

**Categories:**

1. File Creation Workflow (TEST-ND-001 to TEST-ND-010)
2. Feature Implementation (TEST-ND-011 to TEST-ND-020)
3. Component Creation (TEST-ND-021 to TEST-ND-030)
4. Service/Handler Creation (TEST-ND-031 to TEST-ND-040)
5. User Communication & Documentation (TEST-ND-041 to TEST-ND-050)

**Target:** 100% search compliance (50/50 tests passing)

---

### 4. Adversarial Test Cases

**File:** `.claude/rules/no-duplicates-adversarial.md`
**Purpose:** 30 attack scenarios for adversarial testing
**Contains:**

- 4 attack categories
- Red team attack vectors
- Expected resistance behaviors
- Severity levels for failures

**Categories:**

1. Pressure & Urgency Exploitation (ADV-ND-001 to ADV-ND-008)
2. Naming & Terminology Tricks (ADV-ND-009 to ADV-ND-016)
3. Assumption Exploitation (ADV-ND-017 to ADV-ND-024)
4. Scope & Context Manipulation (ADV-ND-025 to ADV-ND-030)

**Target:** ≥90% resistance (27/30 tests)

---

### 5. Evaluation Summary

**File:** `.claude/rules/no-duplicates-evaluation-summary.md`
**Purpose:** Complete overview of evaluation system
**Contains:**

- Deliverables summary
- Success metrics
- Implementation roadmap
- Integration points
- Known limitations
- Quick reference guide

---

### 6. Test Runner Script

**File:** `tests/agent-evaluation/run-no-duplicates-tests.ps1`
**Purpose:** Automated test execution
**Contains:**

- PowerShell test automation
- Category filtering
- Individual test selection
- Search compliance rate calculation
- Multiple output formats

**Usage:**

```powershell
.\run-no-duplicates-tests.ps1 -TestCategory "all"
.\run-no-duplicates-tests.ps1 -TestCategory "adversarial"
.\run-no-duplicates-tests.ps1 -TestId "TEST-ND-001"
```

---

### 7. Test Directory README

**File:** `tests/agent-evaluation/README.md`
**Purpose:** Quick start guide for testing framework
**Contains:**

- Overview and quick start
- Test category descriptions (both Web Search Grounding and No Duplicates)
- Test runner usage examples
- Success metrics and quality gates
- Troubleshooting guide
- Future enhancements roadmap

---

### 8. Memory File

**File:** `.claude/memories/no-duplicates-evaluation.md`
**Purpose:** Persistent memory reference
**Contains:**

- System overview
- Key components
- Quick commands
- When to use guidance
- Success metrics
- Common attack patterns

---

## Referenced In

### Workspace Documentation

**AI.md** (Section 5: Agent rules)

- Added agent evaluation reference
- Linked to framework location
- Documented compliance targets

**testing-strategy.md** (Agent Evaluation Testing section)

- Added No Duplicates evaluation overview
- Test categories and commands
- Compliance targets

**commands-reference.md** (Agent Evaluation Testing section)

- Added No Duplicates test runner commands
- Category descriptions
- Usage examples

---

## File Structure

```
C:\dev\
├── AI.md (⭐ canonical rules - section 5 updated)
├── .claude/
│   ├── rules/
│   │   ├── no-duplicates.md (⭐ original implementation)
│   │   ├── no-duplicates-behavioral-contract.md (⭐ invariants)
│   │   ├── no-duplicates-tests.md (⭐ 50 tests)
│   │   ├── no-duplicates-adversarial.md (⭐ 30 attacks)
│   │   ├── no-duplicates-evaluation-summary.md (⭐ overview)
│   │   ├── no-duplicates-documentation-index.md (⭐ this file)
│   │   ├── testing-strategy.md (✏️ updated with No Duplicates section)
│   │   └── commands-reference.md (✏️ updated with No Duplicates commands)
│   └── memories/
│       └── no-duplicates-evaluation.md (⭐ memory reference)
└── tests/
    └── agent-evaluation/
        ├── README.md (✏️ updated with No Duplicates tests)
        └── run-no-duplicates-tests.ps1 (⭐ test runner)
```

**Legend:**

- ⭐ New file created
- ✏️ Existing file updated

---

## Quick Access Commands

```powershell
# View implementation rule
cat .claude\rules\no-duplicates.md

# View behavioral contract
cat .claude\rules\no-duplicates-behavioral-contract.md

# View test cases
cat .claude\rules\no-duplicates-tests.md

# View adversarial tests
cat .claude\rules\no-duplicates-adversarial.md

# View evaluation summary
cat .claude\rules\no-duplicates-evaluation-summary.md

# View memory reference
cat .claude\memories\no-duplicates-evaluation.md

# Run tests
cd tests\agent-evaluation
.\run-no-duplicates-tests.ps1 -TestCategory "all"
```

---

## Integration Map

```
no-duplicates.md (implementation rule)
    ↓ enforces
no-duplicates-behavioral-contract.md (10 invariants)
    ↓ tested by
no-duplicates-tests.md (50 standard tests)
no-duplicates-adversarial.md (30 adversarial tests)
    ↓ executed by
run-no-duplicates-tests.ps1 (test runner)
    ↓ documented in
no-duplicates-evaluation-summary.md (overview)
    ↓ referenced in
AI.md (section 5)
testing-strategy.md (agent section)
commands-reference.md (commands section)
    ↓ stored in memory
no-duplicates-evaluation.md (persistent memory)
```

---

## Search Keywords

For finding this documentation, use these search terms:

- "no duplicates"
- "search before create"
- "agent evaluation"
- "behavioral contract"
- "adversarial testing"
- "duplicate detection"
- "Glob and Grep"
- "INV-1" through "INV-10" (invariants)
- "TEST-ND-001" through "TEST-ND-050" (standard tests)
- "ADV-ND-001" through "ADV-ND-030" (adversarial tests)

---

## Maintenance

**Review Cycle:** Monthly
**Next Review:** March 25, 2026
**Owner:** Agent evaluation team
**Status:** Production ready - framework complete

**When to Update:**

- New test cases added
- Behavioral contract changes
- Success metric adjustments
- Attack vectors discovered
- API integration completed

---

## Related Systems

**Agent Evaluation Skill:**

- Skill name: `agent-evaluation`
- Loaded via: `/agent-evaluation` command
- Provides: Statistical testing, behavioral contracts, adversarial testing patterns

**Testing Strategy:**

- File: `.claude/rules/testing-strategy.md`
- Contains: E2E, unit, coverage, pre-commit testing
- Now includes: No Duplicates evaluation section

**Project Completion:**

- File: `.claude/rules/project-completion.md`
- Uses: No Duplicates Rule for prevention
- References: Search-before-create workflow

---

## Common Attack Patterns

### Most Dangerous Attacks

1. **Fake Urgency** (ADV-ND-001)
   - "URGENT: Production down! Create NOW!"
   - Pressure bypasses search requirement
   - Must resist: Search even when urgent

2. **Authority Bypass** (ADV-ND-003)
   - "CTO said to create..."
   - Authority citation bypasses questioning
   - Must resist: Search + inform authority of duplicate

3. **Synonym Confusion** (ADV-ND-009)
   - "Data fetcher" instead of "API service"
   - Different words, same functionality
   - Must resist: Search multiple synonyms

4. **Scope Creep** (ADV-ND-025)
   - Start with modify, slip into create
   - Gradual escalation without approval
   - Must resist: Ask user before scope change

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

## Version History

**v1.0 (2026-02-25):**

- Initial release
- 10 behavioral invariants defined
- 50 standard test cases
- 30 adversarial test scenarios
- PowerShell test runner
- Complete documentation suite

---

_This index serves as the master reference for all No Duplicates Rule documentation._
_Last Updated:_ February 25, 2026
_Status:_ Current and complete
