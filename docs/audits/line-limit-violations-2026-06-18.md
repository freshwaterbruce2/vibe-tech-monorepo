# Line-Limit Violations Report

**Generated:** 2026-06-18 | **Scope:** full `V:\monorepo` tree, code files only
**Policy:** 500 soft / 600 hard (see `.claude/rules/code-size-limits.md`)
**Tool:** `node scripts/validate-file-size.js` (regenerate any time)

✅ Checked 2903 file(s) | **60 over 600 (hard)** | **49 in 500-600 band (warn)**

> These are PRE-EXISTING files. The caps hard-block changed/affected code going forward; this
> list drives incremental cleanup of legacy files. Excludes tests, markdown, generated code,
> migrations, and scaffolding (per the policy doc).

## Violations by area (>600 lines)

| Area | Files over 600 |
|------|----------------|
| `apps/vibe-code-studio` | 17 |
| `apps/vibe-shipping` | 13 |
| `apps/crypto-enhanced` | 5 |
| `apps/vibe-justice` | 3 |
| `apps/vibe-invoice` | 3 |
| `apps/serenity-flow` | 2 |
| `apps/cme-track` | 2 |
| `apps/vibe-tech-lovable` | 2 |
| `apps/vibe-discharge` | 2 |
| `apps/vibe-booking-backend` | 1 |
| `packages/memory` | 1 |
| `apps/memory-mcp` | 1 |
| `packages/core` | 1 |
| `scripts/monorepo-sync-audit.mjs` | 1 |
| `packages/agent-lats` | 1 |
| `apps/vibe-booking` | 1 |
| `apps/vibe-tutor` | 1 |
| `apps/vibe-blox` | 1 |
| `packages/shared-ipc` | 1 |
| `apps/agent-engine` | 1 |

## Hard violations (>600 lines) — must be split

| File | Lines | Over |
|------|-------|------|
| `apps/crypto-enhanced/src/trading_engine.py` | 1859 | 1259 |
| `apps/serenity-flow/src/components/ZenColoring.tsx` | 1099 | 499 |
| `apps/crypto-enhanced/src/websocket_manager.py` | 1068 | 468 |
| `apps/vibe-justice/frontend/src/components/DocumentManager.tsx` | 1025 | 425 |
| `apps/vibe-booking-backend/server/src/index.ts` | 978 | 378 |
| `apps/vibe-shipping/src/stores/analyticsStore.ts` | 972 | 372 |
| `packages/memory/src/integrations/LearningBridge.ts` | 942 | 342 |
| `apps/memory-mcp/src/tools.ts` | 936 | 336 |
| `apps/serenity-flow/src/components/complexArtworks.ts` | 926 | 326 |
| `apps/vibe-invoice/server/src/routes/invoiceRoutes.ts` | 926 | 326 |
| `apps/vibe-code-studio/src/services/FileSystemService.ts` | 908 | 308 |
| `apps/vibe-shipping/src/sw/advanced-sw.ts` | 893 | 293 |
| `apps/vibe-code-studio/src/components/GitDiffViewer.tsx` | 857 | 257 |
| `apps/vibe-code-studio/src/components/Sidebar.tsx` | 850 | 250 |
| `apps/vibe-shipping/src/stores/mapStore.ts` | 847 | 247 |
| `apps/vibe-invoice/server/scripts/verify-criteria-tier2.ts` | 814 | 214 |
| `apps/cme-track/src/App.tsx` | 812 | 212 |
| `apps/vibe-code-studio/src/components/CustomInstructionsPanel.tsx` | 810 | 210 |
| `apps/vibe-code-studio/src/services/specialized-agents/AgentOrchestrator.ts` | 799 | 199 |
| `packages/core/src/utils/security/SecureApiKeyManager.ts` | 798 | 198 |
| `scripts/monorepo-sync-audit.mjs` | 793 | 193 |
| `apps/vibe-invoice/server/scripts/verify-criteria.ts` | 791 | 191 |
| `apps/vibe-shipping/src/components/ui/sidebar.tsx` | 769 | 169 |
| `packages/agent-lats/src/cli.ts` | 767 | 167 |
| `apps/vibe-tech-lovable/src/components/ui/sidebar.tsx` | 760 | 160 |
| `apps/vibe-code-studio/src/components/TaskMonitorPanel.tsx` | 755 | 155 |
| `apps/vibe-code-studio/src/services/SemanticSearchService.ts` | 753 | 153 |
| `apps/vibe-code-studio/src/services/CodeExecutor.ts` | 741 | 141 |
| `apps/crypto-enhanced/htmlcov/coverage_html_cb_188fc9a4.js` | 736 | 136 |
| `apps/vibe-justice/backend/htmlcov/coverage_html_cb_497bf287.js` | 734 | 134 |
| `apps/vibe-shipping/src/config/warehouse.ts` | 732 | 132 |
| `apps/vibe-shipping/scripts/pwa-build-optimizer.js` | 716 | 116 |
| `apps/vibe-code-studio/src/components/AIChat/styled.ts` | 712 | 112 |
| `apps/vibe-code-studio/src/services/GitDiffService.ts` | 698 | 98 |
| `apps/vibe-tech-lovable/src/pages/BlogEditor.tsx` | 691 | 91 |
| `apps/crypto-enhanced/src/strategies.py` | 683 | 83 |
| `apps/vibe-booking/src/app/booking-flow.tsx` | 663 | 63 |
| `apps/vibe-discharge/server/src/index.ts` | 663 | 63 |
| `apps/vibe-code-studio/scripts/backend-server.js` | 656 | 56 |
| `apps/vibe-code-studio/src/services/AgentReliabilityManager.ts` | 655 | 55 |
| `apps/vibe-code-studio/src/services/testing/TestGenerator.ts` | 650 | 50 |
| `apps/vibe-code-studio/src/services/WorkspaceService.ts` | 649 | 49 |
| `apps/vibe-shipping/src/services/advanced-offline-manager.ts` | 644 | 44 |
| `apps/vibe-shipping/src/components/VoiceDoorControl.tsx` | 641 | 41 |
| `apps/vibe-shipping/src/pages/Maps.tsx` | 641 | 41 |
| `apps/vibe-shipping/src/components/pwa/PWAAuditDashboard.tsx` | 640 | 40 |
| `apps/vibe-justice/backend/vibe_justice/prompts/violation_prompts.py` | 637 | 37 |
| `apps/vibe-shipping/src/services/emailService.ts` | 633 | 33 |
| `apps/vibe-shipping/src/pages/Support.tsx` | 631 | 31 |
| `apps/vibe-tutor/src/services/dataStore.ts` | 630 | 30 |
| `apps/vibe-code-studio/src/App.tsx` | 629 | 29 |
| `apps/cme-track/server/src/index.ts` | 622 | 22 |
| `apps/vibe-blox/src/app/routes/admin/Dashboard.tsx` | 622 | 22 |
| `apps/vibe-discharge/src/App.tsx` | 620 | 20 |
| `packages/shared-ipc/src/schemas.ts` | 618 | 18 |
| `apps/vibe-code-studio/src/components/WorkspaceTemplatesPanel.tsx` | 614 | 14 |
| `apps/vibe-shipping/src/components/pwa/PerformanceMonitor.tsx` | 613 | 13 |
| `apps/vibe-code-studio/src/services/CustomRulesEngine.ts` | 612 | 12 |
| `apps/crypto-enhanced/src/instance_lock.py` | 611 | 11 |
| `apps/agent-engine/src/services/execution-service.ts` | 602 | 2 |

## Warning band (500-600 lines) — split soon

| File | Lines | Headroom |
|------|-------|----------|
| `apps/vibe-code-studio/src/components/SemanticSearchPanel.tsx` | 597 | 3 |
| `apps/vibe-code-studio/src/services/specialized-agents/BaseSpecializedAgent.ts` | 595 | 5 |
| `apps/vibe-code-studio/src/app/AppLayout.tsx` | 593 | 7 |
| `apps/vibe-code-studio/src/app/hooks/useAppHandlers.ts` | 588 | 12 |
| `apps/vibe-justice/frontend/src/components/views/KnowledgeBase.tsx` | 588 | 12 |
| `apps/vibe-code-studio/src/services/DatabaseService.ts` | 580 | 20 |
| `apps/vibe-code-studio/src/components/ModelPerformanceDashboard.tsx` | 578 | 22 |
| `apps/vibe-code-studio/src/components/ScreenshotToCodePanel.tsx` | 576 | 24 |
| `apps/vibe-reminder-v2/src/App.tsx` | 576 | 24 |
| `apps/crypto-enhanced/src/database.py` | 573 | 27 |
| `apps/vibe-code-studio/src/components/ApprovalDialog.tsx` | 573 | 27 |
| `apps/vibe-shipping/src/components/ShippingTable.tsx` | 568 | 32 |
| `apps/vibe-shipping/src/pages/SignupPage.tsx` | 567 | 33 |
| `apps/crypto-enhanced/src/api_server.py` | 563 | 37 |
| `packages/agent-lats/src/pipeline-evolution.ts` | 560 | 40 |
| `apps/vibe-shipping/src/stores/userStore.ts` | 559 | 41 |
| `apps/vibetech-command-center/src/shared/types.ts` | 559 | 41 |
| `apps/vibe-code-studio/src/components/ApiKeySettings.tsx` | 558 | 42 |
| `apps/vibe-tutor/src/components/schedules/SchedulesHub.tsx` | 558 | 42 |
| `packages/memory/src/stores/SemanticStore.ts` | 557 | 43 |
| `apps/vibe-code-studio/src/services/FileSystemStorageService.ts` | 555 | 45 |
| `apps/vibe-booking-v2/server/src/routes.ts` | 551 | 49 |
| `apps/vibe-code-studio/src/services/TaskQueue.ts` | 551 | 49 |
| `apps/vibe-portal/src/App.tsx` | 551 | 49 |
| `apps/vibe-tutor/src/services/achievementService.ts` | 546 | 54 |
| `apps/vibe-portal/server/src/index.ts` | 545 | 55 |
| `apps/vibe-shipping/src/components/pwa/PWAManager.tsx` | 544 | 56 |
| `apps/vibe-code-studio/src/services/AgentPerformanceOptimizer.ts` | 540 | 60 |
| `packages/feature-flags/sdk-python/feature_flags/client.py` | 539 | 61 |
| `apps/vibe-code-studio/src/components/Settings.tsx` | 538 | 62 |
| `apps/vibe-code-studio/src/components/CodeQualityPanel.tsx` | 533 | 67 |
| `apps/vibe-tutor/src/services/audioStreamService.ts` | 533 | 67 |
| `apps/desktop-commander-v3/src/FileSystemTools.ts` | 531 | 69 |
| `apps/vibe-code-studio/src/components/AIChat/AIChat.tsx` | 529 | 71 |
| `apps/vibe-code-studio/src/components/EnhancedAgentMode/stores/agentModeStore.ts` | 528 | 72 |
| `packages/agent-lats/src/db.ts` | 527 | 73 |
| `apps/vibe-code-studio/src/services/ai/CompletionAnalytics.ts` | 522 | 78 |
| `apps/vibe-code-studio/src/components/BackgroundTaskPanel.tsx` | 521 | 79 |
| `apps/vibe-code-studio/src/utils/SecureApiKeyManager.ts` | 520 | 80 |
| `apps/prior-auth-pro/src/App.tsx` | 514 | 86 |
| `apps/vibe-code-studio/src/services/ai/ReActExecutor.ts` | 514 | 86 |
| `apps/vibe-code-studio/src/components/GitPanel.tsx` | 512 | 88 |
| `apps/vibe-shipping/ShippingExpo/App.tsx` | 511 | 89 |
| `backend/ipc-bridge/src/server.ts` | 511 | 89 |
| `apps/vibe-tech-lovable/src/components/blog/enhancedBlogData.ts` | 510 | 90 |
| `apps/vibe-code-studio/src/components/KeyboardShortcuts.tsx` | 509 | 91 |
| `apps/vibe-code-studio/src/components/AnalyticsDashboard.tsx` | 508 | 92 |
| `apps/vibe-tutor/src/services/migrationService.ts` | 505 | 95 |
| `apps/vibe-code-studio/src/services/AutoFixService.ts` | 501 | 99 |
