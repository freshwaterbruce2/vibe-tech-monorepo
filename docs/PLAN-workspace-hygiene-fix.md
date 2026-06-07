# Project Plan: Monorepo Workspace Hygiene and Target Alignment

**Task Slug**: `workspace-hygiene-fix`
**Plan File**: [PLAN-workspace-hygiene-fix.md](file:///V:/monorepo/docs/PLAN-workspace-hygiene-fix.md)
**Project Type**: **WORKSPACE-WIDE**
**Status**: 📋 PENDING APPROVAL

---

## 1. Overview
This plan addresses the unexpected isolated projects and missing target warnings reported by the workspace sync audit. We will update [sync-audit.config.json](file:///V:/monorepo/tools/monorepo-sync/sync-audit.config.json) to:
1.  **Exempt Non-TypeScript/Dev Tools**: Allow `hermes-webui-devtools` to skip `typecheck`, `test`, and `build` targets since it is a pure Python + vanilla JS runtime utility.
2.  **Approve Legitimate Isolated Projects**: Add standalone applications (`hermes-webui-devtools`, `nova-mobile-app`, `vibe-hermes-control`, and `vibe-it-specialist-bot`) to the allowed isolated projects list.
3.  **Prune Stale Allowances**: Remove obsolete allowances for missing targets and isolation (e.g. deleted `chessmaster-academy-api`, stale `health-tracker` entries) to reduce sync warnings to **0**.

---

## 2. Success Criteria
- [ ] **0 Issues**: `unexpectedIsolated` and `missingTargetsUnexpected` counts drop to 0 in the audit report.
- [ ] **0 Warnings**: `staleMissingAllowances` and `staleIsolatedAllowances` are completely resolved.
- [ ] **Verified Health**: Running `pnpm run workspace:health` outputs a clean pass with 0 issues and 0 warnings.

---

## 3. Tech Stack & Reference Files
- **Workspace Tooling**: Nx, pnpm 10.x
- **Config Target**: [sync-audit.config.json](file:///V:/monorepo/tools/monorepo-sync/sync-audit.config.json)
- **Heuristic Checker**: [monorepo-sync-audit.mjs](file:///V:/monorepo/scripts/monorepo-sync-audit.mjs)

---

## 4. Task Breakdown

### Phase 1: Planning
- [x] Create [PLAN-workspace-hygiene-fix.md](file:///V:/monorepo/docs/PLAN-workspace-hygiene-fix.md) with task breakdown.
- [x] Define explicit acceptance criteria.

### Phase 2: Implementation (Build)
- [x] **Task 2.1: Update Allowed Missing Targets**
  - Add `"hermes-webui-devtools": ["typecheck", "test", "build"]` to `allowedMissingTargets`.
- [x] **Task 2.2: Update Allowed Isolated Projects**
  - Add `"hermes-webui-devtools"`, `"nova-mobile-app"`, `"vibe-hermes-control"`, and `"vibe-it-specialist-bot"` to `allowedIsolatedProjects`.
- [x] **Task 2.3: Remove Stale Missing Target Allowances**
  - Remove/align target list exemptions for `@vibetech/anthropic-api-tools`, `@vibetech/health-tracker`, `avatar-web-automator-e2e`, `desktop-bridge`, `devtools-mcp-server`, `mcp-rag-server`, `vibe-code-studio-vscode`, `vibe-reflection`, and `chessmaster-academy-api` based on actual targets.
- [x] **Task 2.4: Remove Stale Isolated Allowances**
  - Remove `@vibetech/workspace`, `chessmaster-academy-api`, and `vibe-booking-backend` from `allowedIsolatedProjects` list.

### Phase 3: Testing
- [x] Run `pnpm run sync:audit:report` locally to generate a fresh `/tmp/monorepo-sync-audit-report.json`.
- [x] Verify that `issues` and `warnings` sections in the JSON report are empty.

### Phase 4: Verification (Verify)
- [x] Execute `pnpm run workspace:health`.
- [x] Verify clean output console logs with no path or sync anomalies.

---

## 5. Acceptance Criteria
*   **scope_lock**: sync-audit config holds only active and valid allowances.
*   **Build done when**: [sync-audit.config.json](file:///V:/monorepo/tools/monorepo-sync/sync-audit.config.json) is updated and clean of stale references.
*   **Test done when**: `/tmp/monorepo-sync-audit-report.json` contains 0 issues and 0 warnings.
*   **Verify done when**: `pnpm run workspace:health` returns green.
