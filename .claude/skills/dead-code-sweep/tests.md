# Dead Code Sweep — Test Scenarios

These scenarios validate that an agent applying the dead-code-sweep skill follows the correct workflow. Each scenario describes the setup, the expected agent actions, and the observable outcomes that confirm compliance.

---

## Scenario 1 — Zero-Import Check Before Deletion

**Setup:** A file `apps/vibe-tutor/src/components/ui/OldModal.tsx` exists. No other file imports it.

**Correct agent behavior:**
1. Run `grep -rn "import.*OldModal" apps/ .claude/`
2. Observe zero results
3. Run `git rm apps/vibe-tutor/src/components/ui/OldModal.tsx`
4. Run typecheck to confirm no errors

**Observable outcomes:**
- Agent issues grep BEFORE issuing any edit or delete command
- Agent does not refactor OldModal before deleting
- `git rm` is used, not `rm`
- Typecheck passes after deletion

**Failure signal:** Agent edits or attempts to "clean up" OldModal before confirming zero imports.

---

## Scenario 2 — Barrel File Trap

**Setup:**
- `apps/vibe-tutor/src/components/ui/index.ts` contains `export * from './AchievementPopup'`
- `apps/vibe-tutor/src/components/SomeScreen.tsx` contains `import { Button } from '../ui'` (does NOT destructure AchievementPopup)
- `apps/vibe-tutor/src/components/ui/AchievementPopup.tsx` exists

**Correct agent behavior:**
1. Check `index.ts` for re-exports of AchievementPopup
2. Recognize that `index.ts` is imported by SomeScreen but AchievementPopup is not actually consumed
3. Remove `export * from './AchievementPopup'` from `index.ts`
4. Re-run `grep -rn "import.*AchievementPopup" apps/` → confirm 0 results
5. Delete `AchievementPopup.tsx`

**Observable outcomes:**
- Barrel file is edited before the target file is deleted
- Two separate checks are run (before and after barrel edit)
- Agent does not skip the barrel check

**Failure signal:** Agent deletes AchievementPopup without checking/editing the barrel, leaving a broken export.

---

## Scenario 3 — Orphaned Directory

**Setup:** `apps/vibe-tutor/src/components/schedule/` contains `VisualSchedule.tsx`, `ScheduleEditor.tsx`, `StepCard.tsx`, and `index.ts`. No file outside this directory imports from it.

**Correct agent behavior:**
1. Run `grep -rn "from.*components/schedule" apps/ .claude/`
2. Observe zero results
3. Run `git rm -r apps/vibe-tutor/src/components/schedule/`
4. Confirm the entire directory is removed
5. Run typecheck

**Observable outcomes:**
- Single grep on the directory path (not file by file)
- `git rm -r` used (recursive flag)
- All files in directory deleted in one commit

**Failure signal:** Agent only deletes some files from the directory, or greps individual files rather than the directory path.

---

## Scenario 4 — Live Code NOT Deleted

**Setup:** `apps/vibe-tutor/src/components/features/ChatWindow.tsx` is imported by `apps/vibe-tutor/src/screens/HomeScreen.tsx`.

**Correct agent behavior:**
1. Run `grep -rn "import.*ChatWindow" apps/ .claude/`
2. Observe at least one result in `HomeScreen.tsx`
3. Stop — do not delete

**Observable outcomes:**
- Agent does not delete ChatWindow
- Agent reports that the file is live

**Failure signal:** Agent deletes ChatWindow without checking, or ignores grep results.

---

## Scenario 5 — Typecheck Failure After Deletion

**Setup:** `WorksheetPractice.tsx` is deleted (zero direct component imports). However, it also exported a type `WorksheetStep` that `WorksheetView.tsx` imports.

**Correct agent behavior:**
1. Delete `WorksheetPractice.tsx` (zero component imports found)
2. Run `pnpm nx run vibe-tutor:typecheck`
3. TypeScript reports error: `Cannot find module './WorksheetPractice'`
4. Agent locates the import in `WorksheetView.tsx`
5. Agent moves or redeclares `WorksheetStep` before committing

**Observable outcomes:**
- Typecheck is run after deletion (not skipped)
- Agent does not commit with typecheck errors
- Agent fixes the type reference before committing

**Failure signal:** Agent commits without running typecheck, or suppresses the error with `// @ts-ignore`.

---

## Scenario 6 — Commit Separation

**Setup:** Agent has confirmed 3 dead components and also has a feature to add (a new GoalsPanel component).

**Correct agent behavior:**
1. Delete the 3 dead components with `git rm`
2. Run typecheck
3. Commit: `git commit -m "chore(vibe-tutor): remove 3 dead components"`
4. THEN implement the new GoalsPanel feature
5. Commit: `git commit -m "feat(vibe-tutor): add GoalsPanel component"`

**Observable outcomes:**
- Two separate commits
- Dead-code commit message says "remove" or "chore" and names the cell
- Feature commit is separate

**Failure signal:** Single commit mixes deletions and new feature code.

---

## Scenario 7 — Self-Referential Import (False Positive)

**Setup:** `OldHook.ts` imports a type from itself via a re-export pattern:
```ts
// OldHook.ts
export type { HookResult } from './OldHook';
```
Grep for `import.*OldHook` returns only this self-referential line.

**Correct agent behavior:**
1. Run grep — finds one result
2. Inspect the result — it is in `OldHook.ts` itself (self-referential)
3. Conclude: no external consumers → safe to delete

**Observable outcomes:**
- Agent reads the grep result before acting
- Agent correctly classifies self-referential as "no external consumer"
- File is deleted

**Failure signal:** Agent treats any grep result as "file is live" without reading where the import originates.

---

## Verification Checklist (run after skill application)

```bash
# No TypeScript errors should remain after sweep
pnpm nx run vibe-tutor:typecheck

# No dead files should remain in the swept cell
# (Manual review — agent should report what was deleted)

# Commit history should show separate sweep commits
git log --oneline -5
```

All 3 checks passing = skill applied correctly.
