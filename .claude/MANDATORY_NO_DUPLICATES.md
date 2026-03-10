# MANDATORY: NO DUPLICATES RULE

**Last Updated:** 2026-01-07
**Status:** SYSTEM-WIDE ENFORCEMENT
**Priority:** CRITICAL

---

## THIS IS NOT OPTIONAL

Every AI assistant working in this monorepo MUST follow this rule for EVERY file/feature/service/function creation.

---

## THE RULE

**BEFORE CREATING ANYTHING:**

1. **SEARCH** - Use Glob + Grep to find existing implementations
2. **READ** - Understand what already exists
3. **ASK** - Clarify with user if modification vs creation is unclear
4. **ONLY THEN CREATE** - If truly nothing exists

---

## WHY THIS MATTERS

**Problem:** Creating duplicate files/features/services wastes time and creates maintenance burden.

**Examples of waste:**

- Creating a function that already exists
- Implementing a feature that's already done
- Building a service that's already available
- Writing code that duplicates existing code

**Impact:** Hours of wasted development time, confused codebase, frustrated user.

---

## ENFORCEMENT

This rule applies to:

- TypeScript/JavaScript files (.ts, .tsx, .js, .jsx)
- Python files (.py)
- Rust files (.rs)
- Markdown documentation (.md)
- Configuration files (.json, .yml, .yaml)
- All other source files

This rule is enforced:

- In root workspace (C:\dev\CLAUDE.md)
- In global settings (~\.claude\CLAUDE.md)
- In detailed guide (.claude/rules/no-duplicates.md)
- In this mandatory notice

---

## WORKFLOW

```plaintext
User Request: "Create feature X"
    ↓
1. SEARCH: Glob pattern="**/*X*.*" + Grep pattern="X"
    ↓
2. EVALUATE:
    ├─ Found similar? → READ completely → Ask user: modify vs create?
    └─ Nothing found? → Safe to create
    ↓
3. IMPLEMENT:
    ├─ Modify existing (if applicable)
    └─ Create new (if truly needed)
```

---

## CHECKLIST (MANDATORY)

Before creating ANY file:

- [ ] Searched with Glob for similar files by name
- [ ] Searched with Grep for similar functionality
- [ ] Read any similar files found completely
- [ ] Checked FEATURE_SPECS/ directory
- [ ] Reviewed project CLAUDE.md
- [ ] Asked user if modification vs creation is unclear
- [ ] Confirmed no duplicate functionality exists

**If ANY checkbox is unchecked → DO NOT CREATE**

---

## CONSEQUENCES

**If violated:**

- Duplicate work created
- Time wasted on redundant implementation
- Codebase becomes harder to maintain
- User becomes frustrated
- Trust in AI assistance decreases

**If followed:**

- Efficient use of time
- Clean, maintainable codebase
- User satisfaction increases
- Code reuse maximized
- Technical debt minimized

---

## EXAMPLES

### Good Behavior

```
User: "Create authentication service"
AI: "Let me search for existing auth implementations..."
AI: [Uses Glob + Grep to search]
AI: "I found AuthService.ts with OAuth integration. Should I:"
AI: "  a) Enhance existing AuthService"
AI: "  b) Create new service (if different auth method needed)"
User: "Enhance existing"
AI: [Modifies AuthService.ts]
Result: No duplicate, efficient work
```

### Bad Behavior

```
User: "Create authentication service"
AI: [Immediately creates NewAuthService.ts]
AI: "I've created the new authentication service"
Result: Duplicate of AuthService.ts, wasted time
```

---

## TOOLS TO USE

**Search Tools:**

- `Glob` - Find files by pattern (e.g., "\**/*auth\*.ts")
- `Grep` - Search code for functionality (e.g., "authentication")
- `Read` - Understand existing implementations

**Communication Tools:**

- `AskUserQuestion` - Clarify modify vs create when uncertain

---

## DETAILED DOCUMENTATION

For complete enforcement guide, workflow examples, and edge cases:

**See:** `.claude/rules/no-duplicates.md`

---

## SYSTEM-WIDE LOCATIONS

This rule is enforced in:

1. **Root workspace:** C:\dev\CLAUDE.md (Section: NO DUPLICATES RULE)
2. **Global config:** ~\.claude\CLAUDE.md (Section: CRITICAL: No Duplicates Rule)
3. **Detailed guide:** C:\dev\.claude\rules\no-duplicates.md
4. **This notice:** C:\dev\.claude\MANDATORY_NO_DUPLICATES.md

---

**REMEMBER: 5 minutes of searching prevents hours of duplicate work.**

**This is MANDATORY. This is NOT negotiable. This is CRITICAL.**

---

_Effective Date: January 7, 2026_
_Applies To: All AI assistants working in this monorepo_
_Enforcement: System-wide, all projects_
