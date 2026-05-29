# Monorepo Cleanup and Optimization Plan

## Goal
Optimize workspace performance and disk footprint by terminating stale background processes, clearing temp/cache/build artifacts, pruning redundant package stores, and resolving configuration gaps.

## Tasks
- [x] Task 1: Kill 36 stale background processes -> Run `pnpm run cleanup` (executes `scripts/cleanup-processes.ps1`). Verify: `pnpm run cleanup:dry` outputs `Would kill 0 Node/Python processes`.
- [x] Task 2: Remove 1,935+ stale temp/cache entries and 100 dist directories -> Run `pnpm run workspace:cleanup:drift` (executes `scripts/cleanup-stale-artifacts.ps1`). Verify: `pnpm run workspace:cleanup:drift:dry` outputs `Would remove 0 tmp, 0 cache, 0 dist paths`.
- [x] Task 3: Reclaim 5.83 GB of storage by pruning and reinstalling workspace packages -> Run `pnpm run cleanup:pnpm` (executes `scripts/pnpm-cleanup.ps1`). Verify: Command completes successfully with all `node_modules` restored via a clean `pnpm install`.
- [x] Task 4: Fix unexpected target gaps in workspace configuration -> 
  - Add missing `typecheck`, `test`, `build` targets to [desktop-bridge/project.json](file:///C:/dev/desktop-bridge/project.json).
  - Add missing `test` target to [apps/vibe-reflection/project.json](file:///C:/dev/apps/vibe-reflection/project.json).
  - Verify: Run `pnpm run workspace:health` and check that `Unexpected target gaps` is `0` under the sync audit section.
- [ ] Task 5: Verify workspace health and baseline compilation -> Run `pnpm run quality` and check that linting, typechecking, and builds succeed monorepo-wide.

## Done When
- [ ] Stale process count is `0`.
- [ ] Stale artifacts, cache files, and build outputs are removed.
- [ ] Workspace package directories are clean and fully reinstalled.
- [ ] Sync audit report shows zero unexpected target configuration gaps.
- [ ] Full `pnpm run quality` compile check passes.

## Notes
- The optimized `cleanup-stale-artifacts.ps1` has been updated to bypass traversing large non-project folders (`Ollama`, `_backups`, `_worktrees`, `.gradle`, etc.), reducing execution time from several minutes to under 15 seconds.
- Database collisions on duplicate-named files (`deepcode_database.db`, `invoiceflow.db`) will remain intact for now as they represent distinct application environments on `D:\databases`.
