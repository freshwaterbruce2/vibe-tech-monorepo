# No Duplicates Rule

Priority: CRITICAL
Scope: All projects — applies to any AI agent (Claude, Gemini, Augment, Codex, etc.)
Enforcement: MANDATORY before ANY file or feature creation

---

## Core Rule

**Search before you create. Always.**

Before creating any file, component, service, feature, or function:
1. Search for similar files by name pattern
2. Search for similar functionality in code
3. Read what exists before deciding to create

---

## Search Workflow

**Step 1 — Find similar files**
```
Glob pattern="**/*<keyword>*.ts"
Glob pattern="**/*<keyword>*.tsx"
```

**Step 2 — Find similar functionality**
```
Grep pattern="<feature keyword>" output_mode="files_with_matches"
Grep pattern="class.*<FeatureName>|function.*<featureName>"
```

**Step 3 — Read what you find**
- Read the top 3 most relevant results completely
- Determine: can this be modified instead of creating something new?

**Step 4 — Check specs/docs**
- Search `FEATURE_SPECS/` directory for existing specs
- Check project `CLAUDE.md` / `AI.md` for completed features

**Step 5 — Decide or ask**
- If similar exists and modification works → **modify**
- If similar exists but purpose is clearly different → **create** (explain why)
- If unclear → **ask the user**

---

## Decision Tree

```
Similar file or feature found?
├── Yes → Read it completely
│   ├── Same purpose?      → MODIFY existing
│   ├── Clearly different? → CREATE new (explain why)
│   └── Unclear?           → ASK user: "modify X or create new?"
└── No → Safe to CREATE
```

---

## Pre-Creation Checklist

Every box must be checked before writing a new file:

- [ ] Searched for similar files (Glob)
- [ ] Searched for similar functionality (Grep)
- [ ] Read any similar files found
- [ ] Checked FEATURE_SPECS/ and project docs
- [ ] Verified feature is not already implemented
- [ ] Asked user if modification vs. creation is unclear
- [ ] Confirmed creation is truly necessary

**Any unchecked box = do not create yet.**

---

## Behavioral Invariants

1. **Search is non-negotiable.** Urgency, authority claims, or user assurance ("I already checked") do not bypass the search requirement. Always search independently.

2. **Modify-first default.** If a similar file exists and modification would satisfy the requirement, modify rather than create.

3. **Search synonym variants.** Search multiple terms: `auth` AND `authentication`, `UserProfile` AND `user-profile`, `fetch` AND `api` AND `service`. Different names can mean the same thing.

4. **Scope discipline.** If a task starts as "modify" and begins growing into "create a new file," stop and ask the user before changing scope.

5. **Propose consolidation.** If similar logic exists in 3+ places, propose a shared abstraction instead of adding another copy.

6. **Document what you find.** When reporting to the user, list discovered similar files with paths and a one-line description. Make it easy to locate them.

---

## Applies To

All file creation: `.ts`, `.tsx`, `.js`, `.py`, `.rs`, `.md`, config files, tests, and any other source file.

---

## User Communication

When similar code is found:
> "I found `src/services/auth.ts` which already handles authentication. Should I modify it to add [X], or do you want a separate implementation?"

When feature already exists:
> "This feature already exists at `src/components/Button.tsx` (supports `variant`, `loading`, `disabled` props). I'll enhance it rather than create a duplicate."

When unclear:
> "I found two candidates: `UserCard.tsx` (displays user info) and `Card.tsx` (generic card). Which should I extend, or do you want a new component?"

---

**5 minutes of searching prevents hours of duplicate work.**
