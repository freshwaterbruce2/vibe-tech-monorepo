---
name: dead-code-sweep
description: Systematic audit-first dead code removal in a TypeScript/React monorepo. Find all symbols with zero live imports, then delete them in bulk — never refactor, never fix in place. Triggers on requests like "remove dead code", "clean up unused components", "dead code sweep", "audit unused files", or when starting any large vibe-tutor session. Encodes the rule: audit → delete → fix. Never fix → audit.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Dead Code Sweep

> Identify every file with zero live imports, then delete it entirely — never refactor dead code. The pattern: audit first, delete second, feature-work last.

---

## Pattern Overview

The dead-code-sweep pattern was extracted from four commits on the `feature/vibe-code-studio-optimize` branch (`70140bf`, `616204e`, `247f074`, `119b7b1`) that removed 41 files and ~3,650 lines from `apps/vibe-tutor`. The sweep reduced the component surface before any functional work began.

**What triggered the pattern:**

During a prior session, time was spent fixing an XSS bug and removing test buttons in `TokenSystem.tsx`. After the fix was complete, a grep revealed zero imports of `TokenSystem` anywhere in the project. The component was dead code — the fix was entirely wasted work.

**Core properties:**

- The audit happens before any other work — including bug fixes and refactoring
- Deletion is confirmed only after `import.*<Symbol>` grep returns zero results
- Entire directories are swept, not just individual files — orphaned folders are a common dead-code vector
- `index.ts` barrel files are checked explicitly — they re-export dead symbols and create false confidence
- TypeScript's own compiler is used as the final verification pass
- Dead-code commits are kept separate from feature commits for clean history

**Evidence in this monorepo:**

| Commit | Files deleted | Lines removed | What was swept |
|--------|--------------|---------------|----------------|
| `70140bf` | 8 | 89 | NotificationContainer + 7 icon components (zero imports each) |
| `616204e` | 2 | ~497 | AchievementPopup (subset of AchievementToast), TokenSystem (superseded by TokenWallet) |
| `247f074` | 16 | ~3,061 | Entire `schedule/` folder — parallel data model superseded by SchedulesHub |
| `119b7b1` | 25+ | ~1,900+ | 22 outdated slash commands with stale paths or missing dependencies |

---

## When to Apply

Apply this pattern when any of these signals are present:

- Starting a session in a large app with accumulated history (vibe-tutor, nova-agent, etc.)
- About to fix a bug in an unfamiliar component — verify it is imported first
- TypeScript compile reports are slow — dead files add parse overhead
- `git log --stat` shows many files modified but diff is confusing — dead files distort the picture
- A refactor candidate has fewer callsites than expected — some may be dead

**Order is mandatory:** Run the sweep first. Do not fix, refactor, or add features until the sweep is complete.

---

## Step 1 — Identify Target Cell

Choose one layer to sweep at a time. Mixing layers creates confusion.

```
apps/<project>/src/
  components/     ← components cell
  hooks/          ← hooks cell
  services/       ← services cell
  utils/          ← utils cell
  commands/       ← commands cell (for .claude/commands/ etc.)
```

Pick one cell. Run the full audit on it before moving to the next.

---

## Step 2 — Enumerate All Symbols in Cell

```bash
# List all component files in a cell
find apps/vibe-tutor/src/components/ui -name "*.tsx" | sort

# Or using Glob
# Glob pattern="apps/vibe-tutor/src/components/ui/**/*.tsx"
```

Record every file name. This is your candidate list.

---

## Step 3 — Zero-Import Check

For each candidate, search the entire project for any import of that symbol:

```bash
# Check a single component
grep -rn "import.*NotificationContainer" apps/ .claude/
# → zero results = safe to delete

# Check a hook
grep -rn "import.*useDatabase" apps/ .claude/
# → zero results = safe to delete

# Check by file name (catches dynamic imports and path-only imports)
grep -rn "NotificationContainer" apps/ .claude/
```

**Rule: If ANY result is found — even in a comment or a test — stop and investigate before deleting.**

The check must cover:
- `import { X }` named imports
- `import X from` default imports
- `import type { X }` type-only imports
- `from './<X>'` path-based imports (catches index barrel re-exports)
- `require('<X>')` for any CJS patterns

---

## Step 4 — Check index.ts Barrel Files

Barrel files silently re-export dead symbols, masking them from the zero-import check.

```bash
# Find all barrel files in the target cell
grep -rn "export.*from" apps/vibe-tutor/src/components/ui/index.ts

# If index.ts re-exports a dead symbol, the symbol appears "live"
# because the barrel itself is imported elsewhere.
# Verify that the dead symbol is NOT re-exported from any barrel:
grep -rn "AchievementPopup" apps/vibe-tutor/src/components/ui/index.ts
# If found → remove the re-export from the barrel, then re-run the zero-import check
```

**Common barrel trap:** `ui/index.ts` exports `AchievementPopup`. Something imports `{ Button, Modal }` from `ui/index.ts`. AchievementPopup looks "live" because `ui/index.ts` is imported — but no consumer ever uses `AchievementPopup` from that import. Remove it from the barrel and re-check.

---

## Step 5 — Check for Orphaned Directories

Entire directories can be dead when a feature is superseded. Look for:

- Directories with their own `index.ts` but no imports of that `index.ts` anywhere
- Directory names that match a removed or renamed feature

```bash
# Find directory index files
find apps/vibe-tutor/src/components -name "index.ts" | sort

# For each index, check if the directory itself is imported
grep -rn "from.*components/schedule" apps/ .claude/
# → zero results = entire directory is dead
```

Commit `247f074` removed `schedule/` this way — `VisualSchedule`, `ScheduleEditor`, and `StepCard` all lived inside it, along with their `index.ts`. None were imported because `SchedulesHub` had superseded the whole subsystem.

---

## Step 6 — Batch Delete

Once the candidate list is confirmed zero-import, delete everything in one go.

```bash
# Delete individual files
git rm apps/vibe-tutor/src/components/ui/NotificationContainer.tsx
git rm apps/vibe-tutor/src/components/ui/icons/DashboardIcon.tsx
git rm apps/vibe-tutor/src/components/ui/icons/FocusIcon.tsx

# Delete an entire directory
git rm -r apps/vibe-tutor/src/components/schedule/

# Use git rm (not rm) to avoid lock file race conditions on Windows
```

**Why `git rm` not `rm`:** On Windows, `rm` can leave a file-handle open that causes Git index corruption. `git rm` is safe.

---

## Step 7 — Typecheck Verification

After bulk deletion, run TypeScript to catch any missed references:

```bash
pnpm nx run vibe-tutor:typecheck
# or
pnpm --filter vibe-tutor typecheck
```

If TypeScript reports errors after deletion, a reference was missed. Fix those files before committing — do not suppress the error.

---

## Step 8 — Commit Separately

Commit the sweep in isolation, before any feature work:

```bash
git add -u   # only stage the deletions (git rm already stages them)
git commit -m "chore(vibe-tutor): remove N dead components

ComponentA, ComponentB, HookC had zero imports anywhere in the project.
Directory/cell: components/ui"
```

**Why separate commits matter:**

- `git log --stat` stays readable — feature diffs are not buried in deletions
- If a deletion was wrong (rare), it is trivially revertable with `git revert`
- CI diffs are smaller and faster

---

## Anti-Patterns

### Fix dead code instead of deleting it

```tsx
// WRONG: Spent 30 min fixing XSS in TokenSystem.tsx
// Then grep revealed: zero imports of TokenSystem anywhere
// The fix was completely wasted

// CORRECT: Before touching any unfamiliar file
grep -rn "import.*TokenSystem" apps/ .claude/
# If zero → delete the file, do not fix it
```

### Assume a file is dead without checking

```bash
# WRONG: "This looks unused, deleting..."
# CORRECT: Always run the grep first
grep -rn "import.*LoadingSpinner" apps/ .claude/ tests/
# LoadingSpinner had a test file (LoadingSpinner.test.tsx) → not zero → investigate before deleting
```

### Delete without running typecheck

If `WorksheetPractice.tsx` re-exports a type that `WorksheetView.tsx` imports, TypeScript will fail after deletion. Always run typecheck after the bulk delete and before committing.

### Mix sweep commits with feature commits

```bash
# WRONG: One giant commit with deletions + new feature + bug fix
# CORRECT:
git commit -m "chore: remove dead components"   # sweep first
git commit -m "feat: add new homework modal"     # feature second
```

### Rely on IDE "find usages" alone

IDEs miss dynamic imports, template literal paths, and files that are `require()`'d at runtime. Always confirm with grep on the actual file system.

### Sweep across multiple cells in one commit

Mixing `components/`, `hooks/`, and `commands/` deletions in one commit makes the commit message meaningless and the diff hard to review. One sweep per cell per commit.

---

## Decision Table

| Situation | Action |
|-----------|--------|
| `grep -rn "import.*X" apps/` returns 0 results | Safe to delete |
| Grep returns results only in the file itself (self-referential) | Safe to delete |
| Grep returns results only in a barrel `index.ts` | Remove from barrel, re-check, then delete |
| Grep returns results in a `.test.tsx` file | Delete both the source file and the test |
| Grep returns results in a live feature file | NOT dead — stop, do not delete |
| Directory `index.ts` has zero imports from outside the directory | Entire directory is dead |
| TypeScript errors appear after deletion | A reference was missed — find and fix before committing |

---

## Checklist

Before marking a dead-code sweep complete:

- [ ] One cell audited completely (not partial)
- [ ] Every candidate passed the zero-import check
- [ ] All barrel files checked for invisible re-exports
- [ ] Orphaned directories identified and swept
- [ ] `git rm` used (not `rm`) for all deletions
- [ ] `pnpm nx run <project>:typecheck` passes clean
- [ ] Sweep committed separately from any feature work
- [ ] Commit message lists which cell was swept

---

## Real-World Evidence

**Commit `70140bf` — 8 icon components deleted:**

```bash
# Each of these returned zero results before deletion:
grep -rn "import.*NotificationContainer" apps/ .claude/
grep -rn "import.*DashboardIcon" apps/ .claude/
grep -rn "import.*FocusIcon" apps/ .claude/
grep -rn "import.*FriendIcon" apps/ .claude/
grep -rn "import.*HeartbeatIcon" apps/ .claude/
grep -rn "import.*LockIcon" apps/ .claude/
grep -rn "import.*SendIcon" apps/ .claude/
grep -rn "import.*TutorIcon" apps/ .claude/
```

**Commit `247f074` — Entire `schedule/` directory (16 files, 3,061 lines):**

```bash
grep -rn "from.*components/schedule" apps/ .claude/
# → 0 results — SchedulesHub had superseded the entire subsystem
git rm -r apps/vibe-tutor/src/components/schedule/
```

**Commit `616204e` — Barrel file cleanup:**

```bash
# AchievementPopup was re-exported from ui/index.ts
# Remove from barrel first, then delete the file
grep -rn "AchievementPopup" apps/vibe-tutor/src/components/ui/index.ts
# → found: "export * from './AchievementPopup'"
# Edit: remove that line from index.ts
# Re-check: grep -rn "import.*AchievementPopup" apps/ → 0 results
# Delete: git rm apps/vibe-tutor/src/components/ui/AchievementPopup.tsx
```

---

## Integration with Session Start

Per `feedback_vibe_tutor_audit_first.md`, the dead-code sweep is the **first task** of any vibe-tutor session — before bug fixes, before features, before refactoring.

Workflow for a new vibe-tutor session:

```
1. Sweep components/ui/          → commit
2. Sweep components/core/        → commit
3. Sweep hooks/                  → commit
4. Sweep services/               → commit
5. NOW start the actual feature work
```

This order guarantees all subsequent fix/feature work lands on live code only.
