# Web Search Grounding - Documentation Index

Complete reference for all documentation related to the web search grounding evaluation system.

Last Updated: 2026-02-24

---

## Core Documentation Files

### 1. Implementation Rule

**File:** `.claude/rules/web-search-grounding.md`
**Purpose:** The actual rule agents should follow
**Contains:**

- When to use web search (MANDATORY scenarios)
- Search query best practices
- Source citation requirements
- DO/DON'T guidelines
- Integration with existing rules

---

### 2. Behavioral Contract

**File:** `.claude/rules/web-search-grounding-behavioral-contract.md`
**Purpose:** Mandatory behavioral invariants
**Contains:**

- 10 core invariants (INV-1 through INV-10)
- Measurement metrics (compliance, citation, hallucination rates)
- Behavioral boundaries (MUST/SHOULD/MAY/MUST NOT)
- Failure modes and severity levels
- Contract enforcement protocols

**Key Invariants:**

- INV-1: Post-cutoff information (must search)
- INV-2: Version information (must search)
- INV-3: API documentation (must search)
- INV-5: Source citation (must include)
- INV-7: No hallucinated sources (zero tolerance)

---

### 3. Standard Test Cases

**File:** `.claude/rules/web-search-grounding-tests.md`
**Purpose:** 50 test cases for normal behavior validation
**Contains:**

- 5 test categories (10 tests each)
- Expected behaviors for each test
- Pass/fail criteria
- Test execution protocol

**Categories:**

1. Post-Cutoff Information (TEST-001 to TEST-010)
2. Version Information (TEST-011 to TEST-020)
3. API Documentation (TEST-021 to TEST-030)
4. Best Practices (TEST-031 to TEST-040)
5. Edge Cases & Source Citation (TEST-041 to TEST-050)

**Target:** ≥95% passing (48/50 tests)

---

### 4. Adversarial Test Cases

**File:** `.claude/rules/web-search-grounding-adversarial.md`
**Purpose:** 30 attack scenarios for adversarial testing
**Contains:**

- 4 attack categories
- Red team attack vectors
- Expected resistance behaviors
- Severity levels for failures

**Categories:**

1. Ambiguity Exploitation (ADV-001 to ADV-010)
2. Time Manipulation (ADV-011 to ADV-018)
3. Source Manipulation (ADV-019 to ADV-024)
4. Hallucination Induction (ADV-025 to ADV-030)

**Target:** ≥90% resistance (27/30 tests)

---

### 5. Evaluation Summary

**File:** `.claude/rules/web-search-grounding-evaluation-summary.md`
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

**File:** `tests/agent-evaluation/run-web-search-grounding-tests.ps1`
**Purpose:** Automated test execution
**Contains:**

- PowerShell test automation
- Category filtering
- Individual test selection
- Compliance rate calculation
- Multiple output formats

**Usage:**

```powershell
.\run-web-search-grounding-tests.ps1 -TestCategory "all"
.\run-web-search-grounding-tests.ps1 -TestCategory "adversarial"
.\run-web-search-grounding-tests.ps1 -TestId "TEST-001"
```

---

### 7. Test Directory README

**File:** `tests/agent-evaluation/README.md`
**Purpose:** Quick start guide for testing framework
**Contains:**

- Overview and quick start
- Test category descriptions
- Test runner usage examples
- Success metrics and quality gates
- Troubleshooting guide
- Future enhancements roadmap

---

### 8. Memory File

**File:** `.claude/memories/web-search-grounding-evaluation.md`
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

- Added agent testing overview
- Test categories and commands
- Compliance targets

**commands-reference.md** (Agent Evaluation Testing section)

- Added test runner commands
- Category descriptions
- Usage examples

---

## File Structure

```
C:\dev\
├── AI.md (⭐ canonical rules - section 5 updated)
├── .claude/
│   ├── rules/
│   │   ├── web-search-grounding.md (⭐ implementation)
│   │   ├── web-search-grounding-behavioral-contract.md (⭐ invariants)
│   │   ├── web-search-grounding-tests.md (⭐ 50 tests)
│   │   ├── web-search-grounding-adversarial.md (⭐ 30 attacks)
│   │   ├── web-search-grounding-evaluation-summary.md (⭐ overview)
│   │   ├── web-search-grounding-documentation-index.md (⭐ this file)
│   │   ├── testing-strategy.md (✏️ updated with agent section)
│   │   └── commands-reference.md (✏️ updated with commands)
│   └── memories/
│       └── web-search-grounding-evaluation.md (⭐ memory reference)
└── tests/
    └── agent-evaluation/
        ├── README.md (⭐ quick start guide)
        └── run-web-search-grounding-tests.ps1 (⭐ test runner)
```

**Legend:**

- ⭐ New file created
- ✏️ Existing file updated

---

## Quick Access Commands

```powershell
# View implementation rule
cat .claude\rules\web-search-grounding.md

# View behavioral contract
cat .claude\rules\web-search-grounding-behavioral-contract.md

# View test cases
cat .claude\rules\web-search-grounding-tests.md

# View adversarial tests
cat .claude\rules\web-search-grounding-adversarial.md

# View evaluation summary
cat .claude\rules\web-search-grounding-evaluation-summary.md

# View memory reference
cat .claude\memories\web-search-grounding-evaluation.md

# Run tests
cd tests\agent-evaluation
.\run-web-search-grounding-tests.ps1 -TestCategory "all"
```

---

## Integration Map

```
web-search-grounding.md (implementation rule)
    ↓ enforces
web-search-grounding-behavioral-contract.md (10 invariants)
    ↓ tested by
web-search-grounding-tests.md (50 standard tests)
web-search-grounding-adversarial.md (30 adversarial tests)
    ↓ executed by
run-web-search-grounding-tests.ps1 (test runner)
    ↓ documented in
web-search-grounding-evaluation-summary.md (overview)
    ↓ referenced in
AI.md (section 5)
testing-strategy.md (agent section)
commands-reference.md (commands section)
    ↓ stored in memory
web-search-grounding-evaluation.md (persistent memory)
```

---

## Search Keywords

For finding this documentation, use these search terms:

- "web search grounding"
- "agent evaluation"
- "behavioral contract"
- "adversarial testing"
- "hallucination detection"
- "source citation"
- "post-cutoff information"
- "INV-1" through "INV-10" (invariants)
- "TEST-001" through "TEST-050" (standard tests)
- "ADV-001" through "ADV-030" (adversarial tests)

---

## Maintenance

**Review Cycle:** Monthly
**Next Review:** March 24, 2026
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
- Now includes: Agent evaluation section

**Project Completion:**

- File: `.claude/rules/project-completion.md`
- Uses: Web search for 2026 best practices verification
- References: Web search grounding rule

---

## Version History

**v1.0 (2026-02-24):**

- Initial release
- 10 behavioral invariants defined
- 50 standard test cases
- 30 adversarial test scenarios
- PowerShell test runner
- Complete documentation suite

---

_This index serves as the master reference for all web search grounding documentation._
_Last Updated:_ February 24, 2026
_Status:_ Current and complete
