# No Duplicates Rule - Behavioral Contract

Last Updated: 2026-02-25
Priority: CRITICAL
Status: ACTIVE
Type: Agent Behavioral Invariants

---

## Contract Overview

This document defines the **mandatory behavioral invariants** for any agent implementing the No Duplicates Rule. These invariants MUST hold true across all file creation, feature implementation, and code modification tasks.

**Source Rule:** `.claude/rules/no-duplicates.md`

---

## Core Invariants

### INV-1: Search Before Create (Files)
**Rule:** Agent MUST search for similar files using Glob BEFORE creating any new file.

**Test Assertion:**
```
IF (agent intends to create file) THEN
  MUST call Glob with pattern matching similar filenames
  MUST wait for Glob results before proceeding
END IF
```

**Examples:**
- Creating `AIChat.tsx` → Must search: `Glob pattern="**/*chat*.tsx"`
- Creating `userService.ts` → Must search: `Glob pattern="**/*user*.ts"`
- Creating `auth-handler.ts` → Must search: `Glob pattern="**/*auth*.ts"`

**Violation:** Creating file without Glob search.

---

### INV-2: Search Before Create (Functionality)
**Rule:** Agent MUST search for similar functionality using Grep BEFORE implementing features.

**Test Assertion:**
```
IF (agent intends to implement feature) THEN
  MUST call Grep with pattern matching feature keywords
  MUST search for class/function names related to feature
  MUST wait for Grep results before proceeding
END IF
```

**Examples:**
- Implementing "tab completion" → Must search: `Grep pattern="tab.*completion"`
- Implementing "auto-fix" → Must search: `Grep pattern="auto.*fix"`
- Implementing "user authentication" → Must search: `Grep pattern="auth.*user"`

**Violation:** Implementing feature without Grep search.

---

### INV-3: Read Existing Implementations
**Rule:** Agent MUST read files found in search results to understand what exists.

**Test Assertion:**
```
IF (Glob OR Grep found similar files) THEN
  MUST call Read on at least the top 3 most relevant files
  MUST analyze what functionality already exists
  MUST determine if modification is better than creation
END IF
```

**Examples:**
- Found `ai-handler.ts` → Must read it completely
- Found 3 chat components → Must read all 3 to understand differences
- Found existing auth service → Must read to see if it can be extended

**Violation:** Skipping Read after finding similar files.

---

### INV-4: Check Feature Specifications
**Rule:** Agent MUST check FEATURE_SPECS/ directory before implementing any feature.

**Test Assertion:**
```
IF (agent intends to implement feature) THEN
  MUST search for feature specs: Glob pattern="FEATURE_SPECS/**/*.md"
  MUST read matching feature spec files
  MUST verify feature isn't already marked as complete
END IF
```

**Examples:**
- Implementing "error auto-fix" → Check `FEATURE_SPECS/ERROR_AUTOFIX_SPEC.md`
- Adding "AI completion" → Check `FEATURE_SPECS/AI_COMPLETION_SPEC.md`
- Building "tab completion" → Check for existing spec

**Violation:** Implementing feature without checking specs.

---

### INV-5: Ask User When Unclear
**Rule:** Agent MUST ask user if modification vs creation is unclear.

**Test Assertion:**
```
IF (similar file exists) AND (unclear if should modify or create) THEN
  MUST use AskUserQuestion tool
  MUST present options: modify existing OR create new
  MUST explain why unclear
  MUST NOT proceed without user decision
END IF
```

**Examples:**
```
"I found ai-handler.ts that handles AI requests. Should I:
a) Modify ai-handler.ts to add completion feature?
b) Create new ai-completion.ts for separate handling?

Please advise which approach you prefer."
```

**Violation:** Guessing user intent without asking.

---

### INV-6: Document Duplicates Found
**Rule:** Agent MUST document all similar implementations found during search.

**Test Assertion:**
```
IF (search finds similar files/features) THEN
  MUST list all similar implementations in response
  MUST include file paths and line numbers
  MUST explain how each is similar/different
END IF
```

**Examples:**
```
"I found these similar implementations:
1. apps/nova-agent/src/services/ai-handler.ts:45 - Handles AI chat
2. packages/shared/src/components/AIChat.tsx:12 - Chat UI component
3. apps/vibe-code-studio/src/ai-completion.ts:89 - Completion logic

All three handle AI interactions but serve different purposes..."
```

**Violation:** Finding duplicates but not documenting them.

---

### INV-7: Propose Refactoring Over Duplication
**Rule:** Agent MUST propose refactoring to consolidate logic instead of duplicating.

**Test Assertion:**
```
IF (agent finds duplicate/similar logic) THEN
  MUST propose refactoring approach
  MUST suggest shared abstraction or module
  MUST explain benefits (DRY principle, maintainability)
  MUST wait for user approval before duplicating
END IF
```

**Examples:**
```
"I found similar error handling in 3 files. Instead of duplicating again, I recommend:

1. Create shared/error-handler.ts with common logic
2. Refactor existing 3 files to use shared handler
3. Implement new feature using shared handler

This eliminates duplication and makes future changes easier. Proceed?"
```

**Violation:** Duplicating logic without proposing refactoring.

---

### INV-8: Verify Feature Completeness
**Rule:** Agent MUST verify feature isn't already implemented before starting work.

**Test Assertion:**
```
IF (user requests feature) THEN
  MUST search for existing implementation
  MUST check project CLAUDE.md / AI.md
  MUST check TODO/task lists
  IF (feature exists) THEN
    MUST inform user: "Feature already exists at [location]"
    MUST NOT re-implement
  END IF
END IF
```

**Examples:**
- User: "Add auto-fix" → Search finds it exists → "Auto-fix already exists in..."
- User: "Create tab completion" → Search finds it → "Tab completion exists..."

**Violation:** Re-implementing existing features.

---

### INV-9: Modify-First Approach
**Rule:** Agent MUST default to modifying existing files unless creation is clearly necessary.

**Test Assertion:**
```
IF (similar file exists) THEN
  default_action = "modify existing file"
  UNLESS (clearly different feature OR user explicitly requests new file)
END IF
```

**Rationale:** Modification is safer than creation for most tasks.

**Examples:**
- Found `user-service.ts` + asked to "add password reset" → Modify existing
- Found `Button.tsx` + asked to "add loading state" → Modify existing
- Found `api-handler.ts` + asked to "add timeout handling" → Modify existing

**Violation:** Creating new file when modification would suffice.

---

### INV-10: Pre-Creation Checklist
**Rule:** Agent MUST complete checklist BEFORE creating any file.

**Checklist:**
```
[ ] Searched for similar files (Glob)
[ ] Searched for similar functionality (Grep)
[ ] Read existing implementations found
[ ] Checked FEATURE_SPECS/ directory
[ ] Reviewed project CLAUDE.md / AI.md
[ ] Verified feature isn't already done
[ ] Asked user if modification vs creation unclear
[ ] Documented all similar implementations found
[ ] Proposed refactoring if duplication detected
[ ] Confirmed creation is truly necessary
```

**Test Assertion:**
```
IF (agent creates file) THEN
  ALL checklist items MUST be checked
  IF (any item unchecked) THEN
    violation = TRUE
  END IF
END IF
```

**Violation:** Creating file with incomplete checklist.

---

## Behavioral Boundaries

### MUST Search (Always)

**Before creating ANY:**
- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`)
- React components
- Services/handlers
- API endpoints
- Database schemas
- Configuration files
- Test files

**Search Tools Required:**
- Glob (for file patterns)
- Grep (for functionality)
- Read (for understanding existing code)

---

### MUST Ask User (When Unclear)

**Scenarios requiring AskUserQuestion:**
- Similar file exists, unclear if should modify or create
- Multiple similar implementations, unclear which to extend
- Feature might overlap with existing functionality
- User request is ambiguous about new vs modify

---

### MAY Create (When Justified)

**Creation is acceptable when:**
- No similar files found after thorough search
- User explicitly confirmed creation after seeing alternatives
- Feature is truly new and different from existing code
- Creating shared abstraction to eliminate duplicates

---

### MUST NOT Create (Never)

**Never create when:**
- Similar file exists and modification would work
- Feature already exists (re-implementation)
- Haven't completed pre-creation checklist
- User hasn't approved creation when alternatives exist

---

## Measurement Metrics

### Search Compliance Rate
```
search_compliance = (searches_performed / creation_attempts) * 100
Target: 100% (every creation preceded by search)
```

### Duplicate Detection Rate
```
duplicate_detection = (duplicates_found_and_documented / actual_duplicates) * 100
Target: ≥ 90%
```

### User Consultation Rate
```
consultation_rate = (user_questions_asked / ambiguous_scenarios) * 100
Target: ≥ 95%
```

### Modification vs Creation Ratio
```
modification_ratio = (modifications / (modifications + creations)) * 100
Target: ≥ 70% (prefer modification over creation)
```

### Refactoring Proposal Rate
```
refactoring_proposals = (refactoring_proposed / duplicates_detected) * 100
Target: ≥ 80%
```

---

## Contract Enforcement

### Pre-Creation Gate

**Before ANY file creation:**
1. Run Glob search
2. Run Grep search
3. Read similar files
4. Check FEATURE_SPECS/
5. Verify not already done
6. Ask user if unclear
7. Document findings
8. Get user approval

**If ANY step skipped → VIOLATION**

---

### Continuous Monitoring

**Track Metrics:**
- How often searches are performed
- How often duplicates are detected
- How often users are consulted
- Modification vs creation ratio

**Alert on:**
- Creation without search
- Duplicate not documented
- User not consulted when unclear
- Refactoring not proposed

---

## Failure Modes

### Critical Failures (Immediate Fix Required)

1. **Created file without search** - Violates INV-1
2. **Re-implemented existing feature** - Violates INV-8
3. **Skipped reading similar files** - Violates INV-3
4. **Duplicated logic without refactoring proposal** - Violates INV-7

---

### Major Failures (Fix Within 24h)

1. **Incomplete search** - Searched files but not functionality
2. **Didn't check FEATURE_SPECS/** - Violates INV-4
3. **Didn't ask user when unclear** - Violates INV-5
4. **Didn't document duplicates found** - Violates INV-6

---

### Minor Failures (Fix Within Week)

1. **Suboptimal search queries** - Searched but missed obvious patterns
2. **Incomplete documentation** - Documented some but not all duplicates
3. **Late user consultation** - Asked user but only after starting work

---

## Success Patterns

### Exemplary Behavior

```
User: "Add tab completion feature"

Agent:
1. ✅ "Let me search for existing tab completion..."
2. ✅ Glob pattern="**/*tab*.ts" → Found tab-completion.ts
3. ✅ Grep pattern="tab.*completion" → Found Monacopilot code
4. ✅ Read both files to understand implementations
5. ✅ "I found two existing implementations:
   - tab-completion.ts (keyboard shortcuts)
   - Monacopilot (AI-powered completion)

   Your request appears to be about AI completion, which already exists
   in Monacopilot. Should I enhance that instead of creating new?"
6. ✅ User confirms: "Yes, enhance Monacopilot"
7. ✅ Modifies existing file instead of creating duplicate
```

**Result:** Zero duplication, saved time, better code quality.

---

## Version History

- **v1.0** (2026-02-25): Initial behavioral contract
  - 10 core invariants defined
  - 5 measurement metrics established
  - 3 failure severity levels
  - Pre-creation gate process

---

## Related Documents

- **Implementation:** `.claude/rules/no-duplicates.md`
- **Test Cases:** `.claude/rules/no-duplicates-tests.md`
- **Adversarial Tests:** `.claude/rules/no-duplicates-adversarial.md`
- **Evaluation Results:** `tests/agent-evaluation/no-duplicates-results.md`

---

_Last Updated:_ February 25, 2026
_Contract Version:_ 1.0
_Status:_ Active - Enforced via testing framework
