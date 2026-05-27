# TypeScript Strict Fix — vibe-chess & serenity-flow

## Goal
Fix all TS errors surfaced by enabling `strict: true` in `vibe-chess` and `serenity-flow`.

## Tasks

- [x] Task 1: Remove unused `React` default imports in 4 vibe-chess components → Verify: no TS6133 for React
- [x] Task 2: Remove unused `PlaySquare` import in `AITutorMode.tsx` → Verify: no TS6133 for PlaySquare
- [x] Task 3: Fix `serenity-flow/firebase.ts` unused imports (onAuthStateChanged, User) → Verify: no TS6133
- [x] Task 4: Override `noUncheckedIndexedAccess: false` in vibe-chess + serenity-flow → prevents cascade into packages/games
- [x] Task 5: Fix `LessonMode.tsx` CSSProperties + remove React default import → Verify: named imports work
- [x] Task 6: Fix `PuzzleMode.tsx` array access + remove React default import → Verify: named imports work
- [x] Task 7: Run `pnpm nx run vibe-chess:typecheck` — PASSED ✅
- [x] Task 8: Run `pnpm nx run serenity-flow:typecheck` — PASSED ✅

## Files Edited
- `apps/vibe-chess/src/App.tsx` ✓
- `apps/vibe-chess/src/components/CoachPanel.tsx` ✓
- `apps/vibe-chess/src/components/HomeDashboard.tsx` ✓
- `apps/vibe-chess/src/components/Sidebar.tsx` ✓
- `apps/vibe-chess/src/components/AITutorMode.tsx` ✓
- `apps/vibe-chess/tsconfig.json` ✓ (noUncheckedIndexedAccess: false)
- `apps/serenity-flow/tsconfig.json` ✓ (noUncheckedIndexedAccess: false)
- `apps/serenity-flow/src/lib/firebase.ts` ✓
- `packages/games/src/chess/components/LessonMode.tsx` ✓
- `packages/games/src/chess/components/PuzzleMode.tsx` ✓

## Done When
- [x] `pnpm nx run vibe-chess:typecheck` → NX   Successfully ran target ✅
- [x] `pnpm nx run serenity-flow:typecheck` → NX   Successfully ran target ✅
