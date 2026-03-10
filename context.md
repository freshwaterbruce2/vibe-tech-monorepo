# Workspace Cleanup Context

## Objective
Delete confirmed disposable artifacts from the monorepo maintenance pass and keep only canonical, authoritative workspace and data artifacts.

## Canonical Retention Policy (Keep-Only-Canonical)
- Keep: source code, active scripts, project configs, canonical docs, runtime configs, and currently referenced databases.
- Keep only if needed: reproducible audit outputs and run logs.
- Delete: one-off notes, historical summaries, debug logs, generated temp outputs, report snapshots, and duplicate/legacy databases with no active references.
- Policy: if an artifact is not required for current build/test/debug/recovery, it should not remain in active paths.

## Cleanup Sources
- `scripts/monorepo-sync-audit.mjs` with `--focus=cleanup` generated candidates in `tmp/monorepo-sync-audit-report.json`.
- This cleanup run is intentionally conservative: generated outputs, build logs/reports, temporary graph files, placeholder scripts, image captures, and legacy backups.

## Completed
- [x] Reviewed cleanup candidates and confirmed all are non-source artifacts.
- [x] Created this context file for shared tracking.
- [x] Deleted all cleanup candidates listed below and completed additional canonical pruning rounds.
- [x] Left `D:\` data and active monorepo code untouched.

## Pending Next
- [ ] Decide retention policy for build-output JSON/report artifacts in `tmp/`.
- [ ] Resolve remaining path-policy failures in `tools/scripts/Setup-DataLinks.ps1` and `_archive/obsolete-tools/diagnose-constraint-error.ps1`.
- [ ] Review 35 missing-target project gaps from workspace audit after cleanup.
- [ ] Reconcile `agent_learning.db` authority split between `D:\learning-system` and `D:\databases`.

## Second Batch (High-Confidence Cleanup)
- [x] Remove disposable local state directories from C:\dev:
  - `.pytest_cache`
  - `.codex`
  - `.playwright-mcp`
- [x] Remove generated tmp artifacts and temporary deployment scaffolds from `C:\dev\tmp`.
- [x] Remove generated `bbp-lint` reports in `C:\dev\tmp`.

### Second Batch Deleted
- `C:\dev\.pytest_cache`
- `C:\dev\.codex`
- `C:\dev\.playwright-mcp`
- `C:\dev\.playwright-cli`
- `C:\dev\tmp\bbp-lint-report.json`
- `C:\dev\tmp\bbp-lint-report2.json`
- `C:\dev\tmp\cf-vibe-tech\wrangler.toml`
- `C:\dev\tmp\cf-vibe-tech`
- `C:\dev\tmp\cf-vibe-tech-lovable\wrangler.toml`
- `C:\dev\tmp\cf-vibe-tech-lovable`
- `C:\dev\tmp\packages` (and nested temp build artifacts)
- `C:\dev\tmp\database-health-report.json`
- `C:\dev\tmp\memory-health-report.json`
- `C:\dev\tmp\monorepo-sync-audit-report.json`
- `C:\dev\tmp\workspace-health-report.json`

## Third Batch (Learning-System Housekeeping)
- [x] Deleted confirmed historical/report-style and debug artifacts from `D:\learning-system` to reduce non-authoritative noise.

### Third Batch Deleted
- `D:\learning-system\agent_auto_trigger.ps1`
- `D:\learning-system\BASELINE_REPORT.md`
- `D:\learning-system\capture_post_tool_simple.ps1`
- `D:\learning-system\capture_post_tool.ps1`
- `D:\learning-system\capture_pre_tool_simple.ps1`
- `D:\learning-system\capture_pre_tool.ps1`
- `D:\learning-system\COMPLETION_SUMMARY_FINAL.md`
- `D:\learning-system\debug_hook_calls.ps1`
- `D:\learning-system\DEVELOPMENT_CHECKLIST_2026.md`
- `D:\learning-system\hook_debugging_learnings.md`
- `D:\learning-system\hook_test_report.md`
- `D:\learning-system\IMPLEMENTATION_CHANGELOG.md`
- `D:\learning-system\IMPLEMENTATION_REVIEW.md`
- `D:\learning-system\INTEGRATION_COMPLETE_2025-10-06.md`
- `D:\learning-system\INTEGRATION_COMPLETE.md`
- `D:\learning-system\KEY_LEARNINGS_EXTRACTED.md`
- `D:\learning-system\learning_service.log`
- `D:\learning-system\OPTIMIZATION_RESULTS.md`
- `D:\learning-system\PATHS_REFERENCE.md`
- `D:\learning-system\PHASE_1_COMPLETION_SUMMARY.md`
- `D:\learning-system\QUICK_REFERENCE.md`
- `D:\learning-system\QUICK_START_2026.md`
- `D:\learning-system\RECOMMENDATIONS_IMPLEMENTED.md`
- `D:\learning-system\run_healing_cycle.ps1`
- `D:\learning-system\SELF_IMPROVEMENT_COMPLETE.md`
- `D:\learning-system\setup_monitoring.ps1`
- `D:\learning-system\SYSTEM_STATUS.md`
- `D:\learning-system\SYSTEM_VERIFICATION_REPORT.md`
- `D:\learning-system\test_hook.txt`
- `D:\learning-system\verify_self_healing.ps1`
- `D:\learning-system\vibe-tutor-android-blank-screen-fix.md`

## Fourth Batch (Canonical Hardening)
- [x] Completed reference-mapped legacy database cleanup under `D:\databases`, archiving duplicate/legacy files only.
- [x] Removed remaining low-value one-off files from `D:\learning-system`.

### Fourth Batch Deleted
- `D:\learning-system\CHEAT_SHEET_2026.md`
- `D:\learning-system\CRITICAL_SETUP_NOTE.md`
- `D:\learning-system\DOCUMENTATION_REWRITE_SUMMARY.md`
- `D:\learning-system\ENHANCEMENTS_SUMMARY.md`
- `D:\learning-system\winagent_build_learnings.md`

### Fourth Batch Archived
- `D:\databases\_archive\cleanup-2026-03-07-173722\vibe-tutor.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\vibe-studio\vibe_studio.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223642\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223642\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223642\nova_activity.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223805\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223805\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223805\nova_activity.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223901\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223901\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223901\nova_activity.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223958\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223958\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251121-223958\nova_activity.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251207-174823\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251207-174823\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20251207-174823\nova_activity.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20260130-130503\database.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20260130-130503\agent_learning.db`
- `D:\databases\_archive\cleanup-2026-03-07-173722\backups\pre-migration-20260130-130503\nova_activity.db`

## Fifth Batch (Dist Drift Prune)
- [x] Removed stale build `dist` directories across `C:\dev` after validation pass.

### Fifth Batch Deleted (Dist)
- `C:\dev\dist`
- `C:\dev\apps\business-booking-platform\dist`
- `C:\dev\apps\desktop-commander-v3\dist`
- `C:\dev\apps\gravity-claw\dist`
- `C:\dev\apps\invoice-automation-saas\dist`
- `C:\dev\apps\mcp-codeberg\dist`
- `C:\dev\apps\mcp-gateway\dist`
- `C:\dev\apps\mcp-skills-server\dist`
- `C:\dev\apps\memory-mcp\dist`
- `C:\dev\apps\nova-agent\dist`
- `C:\dev\apps\nova-mobile-app\dist`
- `C:\dev\apps\prompt-engineer\dist`
- `C:\dev\apps\shipping-pwa\dist`
- `C:\dev\apps\symptom-tracker\dist`
- `C:\dev\apps\vibe-booking-backend\dist`
- `C:\dev\apps\vibe-code-studio\dist`
- `C:\dev\apps\vibe-code-studio\dist-electron\win-unpacked\resources\dist`
- `C:\dev\apps\vibe-justice\frontend\dist`
- `C:\dev\apps\vibe-tech-lovable\dist`
- `C:\dev\apps\vibe-tutor\dist`
- `C:\dev\apps\VibeBlox\dist`
- `C:\dev\apps\vtde\dist`
- `C:\dev\archive\agent-sdk-workspace\dist`
- `C:\dev\backend\dist`
- `C:\dev\backend\ipc-bridge\dist`
- `C:\dev\backend\middleware\dist`
- `C:\dev\backend\openrouter-proxy\dist`
- `C:\dev\backend\prompt-engineer\dist`
- `C:\dev\backend\symptom-tracker-api\dist`
- `C:\dev\packages\backend\dist`
- `C:\dev\packages\db-app\dist`
- `C:\dev\packages\db-learning\dist`
- `C:\dev\packages\feature-flags\core\dist`
- `C:\dev\packages\feature-flags\dashboard\dist`
- `C:\dev\packages\feature-flags\sdk-node\dist`
- `C:\dev\packages\feature-flags\sdk-react\dist`
- `C:\dev\packages\feature-flags\server\dist`
- `C:\dev\packages\logger\dist`
- `C:\dev\packages\mcp-core\dist`
- `C:\dev\packages\mcp-testing\dist`
- `C:\dev\packages\memory\dist`
- `C:\dev\packages\nova-core\dist`
- `C:\dev\packages\nova-database\dist`
- `C:\dev\packages\nova-types\dist`
- `C:\dev\packages\openclaw-bridge\dist`
- `C:\dev\packages\openrouter-client\dist`
- `C:\dev\packages\service-common\dist`
- `C:\dev\packages\shared-config\dist`
- `C:\dev\packages\shared-ipc\dist`
- `C:\dev\packages\shared-logic\dist`
- `C:\dev\packages\shared-utils\dist`
- `C:\dev\packages\testing-utils\dist`
- `C:\dev\packages\ui\dist`
- `C:\dev\packages\vibetech-hooks\dist`
- `C:\dev\packages\vibetech-shared\dist`
- `C:\dev\packages\vibetech-types\dist`

## Deleted Candidate List (Current Batch)
- `apps/business-booking-platform/build_output.txt`
- `apps/nova-agent/build_result.txt`
- `apps/shipping-pwa/build_result.txt`
- `apps/vibe-code-studio/build_result.txt`
- `apps/vibe-justice/build_result.txt`
- `apps/vibe-shop/build_output13.txt`
- `booking_build.txt`
- `bottoken.png`
- `checklist_output.txt`
- `fibonacci.js`
- `health_output.txt`
- `health_output2.txt`
- `id_zoom.png`
- `id_zoom2.png`
- `lint_core_output.txt`
- `lint_output.txt`
- `lint_sweep_output.txt`
- `lint-report.json`
- `notion_test_curl_exe.txt`
- `notion_test2.txt`
- `notion_test3.txt`
- `nova_core_build.txt`
- `nova_typecheck.txt`
- `out.log`
- `package.json.bak`
- `shipping_test.txt`
- `test_results.txt`
- `tmp/monorepo-sync-audit-report.json`
- `tmp/nx-graph.json`
- `tmp/project-graph.json`
- `tmp/project-graph.sync-audit.json`
- `token_crop.png`
- `token_final.png`
- `token_full.png`
- `token_view.png`
- `token_zoom.png`
- `token_zoom2.png`
- `token_zoom3.png`
- `token_zoom4.png`
- `token_zoom5.png`
- `token_zoom6.png`
- `typecheck_output.txt`
- `typecheck_results.txt`
- `vibe-tech-desktop-environment.jsx`
- `vibeblox_typecheck.txt`

## Sixth Batch (Canonical Tightening)
- [x] Removed remaining low-value one-off files from `D:\learning-system` not tied to active run-time or reference docs.

### Sixth Batch Deleted (D:\learning-system)
- `D:\learning-system\DEPLOYMENT_CHECKLIST.md`
- `D:\learning-system\archive_2026_01_17\D_DRIVE_VERSION_CONTROL_SETUP_COMPLETE.md`
- `D:\learning-system\archive_2026_01_17\D_DRIVE_VERSION_CONTROL_SUMMARY.md`
- `D:\learning-system\archive_2026_01_17\MONOREPO_IMPLEMENTATION_CHECKLIST.md`
- `D:\learning-system\archive_2026_01_17\NX_OPTIMIZATION_SUMMARY.md`

## Seventh Batch (Stale Artifact Prevention)
- [x] Added reusable post-run cleanup path in monorepo scripts to make tmp/dist drift a non-accumulating state.

- Added: `scripts/cleanup-stale-artifacts.ps1`
- Added npm scripts:
  - `pnpm run workspace:cleanup:drift`
  - `pnpm run workspace:cleanup:drift:dry`

## Completed Policy Notes
- "Keep-only-canonical" remains active with explicit file deletion criteria:
  - Canonical sources are preserved (source code, active configs, active docs, active databases, active scripts).
  - Non-canonical generated artifacts are removed immediately after verification passes (tmp outputs, build artifacts, stale reports, one-off status summaries).

## Eighth Batch (Reference-Mapped Cleanup)
- [x] Ran a fresh reference audit for duplicate-name database candidates before any archival decision.
- [x] Archived confirmed duplicate/legacy database:
  - Source: `D:\databases\_archive_learning_cleanup_2025-11-18\agent_learning.db`
  - Archived to: `D:\databases\_archive\cleanup-2026-03-07-192851\agent-learning-legacy\agent_learning.db`
- [x] Removed low-value one-off files/directories from `D:\learning-system` after map validation:
  - `D:\learning-system\.backup`
  - `D:\learning-system\.benchmarks`
  - `D:\learning-system\.pytest_cache`
  - `D:\learning-system\__pycache__`
  - `D:\learning-system\temp\current_execution.txt`
  - `D:\learning-system\temp\hook_errors.log`
- [x] Re-ran stale artifact sweep for `C:\dev`; no tmp/dist drift remains.
- [x] Reference mapping outcome:
  - `trading` duplicate-name pair remains (`D:\databases\trading.db` and `D:\databases\crypto-enhanced\trading.db`) and is still being retained due mixed active references.
  - Legacy `agent_learning` duplicate under `_archive_learning_cleanup_2025-11-18` was confirmed unreferenced and relocated to canonical archive.
