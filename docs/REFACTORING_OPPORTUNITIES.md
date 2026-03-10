# Refactoring Opportunities

> Generated from file size audit on 2026-01-28
> Line limit threshold: **500 lines**

## Priority Refactoring Candidates

Files exceeding 500 lines that would benefit from being split into smaller, focused modules.

### High Priority (>1500 lines)

| Lines | File | Suggested Refactoring |
|-------|------|----------------------|
| 2224 | `apps/shipping-pwa/server.ts` | Split into: route handlers, middleware, utilities, config |
| 1647 | `apps/shipping-pwa/src/pages/Settings.tsx` | Extract settings sections as separate components (Profile, Notifications, Security, etc.) |

### Medium Priority (800-1500 lines)

| Lines | File | Suggested Refactoring |
|-------|------|----------------------|
| 1278 | `apps/vibe-tutor/src/components/features/MusicLibrary.tsx` | Split into: PlaylistManager, TrackList, PlayerControls, SearchFilters |
| 1118 | `apps/monorepo-dashboard/src/monorepo-health/MonorepoHealthDashboard.tsx` | Extract dashboard widgets into separate components |
| 1030 | `apps/vibe-justice/frontend/src/components/DocumentManager.tsx` | Split into: DocumentList, DocumentViewer, DocumentUploader, DocumentActions |
| 870 | `apps/desktop-commander-v3/src/mcp.ts` | Consider extracting tool handlers into separate files by category |
| 854 | `apps/business-booking-platform/src/components/booking/BookingFlow.tsx` | Extract flow steps into separate components (DatePicker, ServiceSelector, Confirmation) |

### Acceptable Large Files (no action needed)

| Lines | File | Reason |
|-------|------|--------|
| 2216 | `apps/VibeBlox/server/db/seed.ts` | Seed data - large by nature |
| 1325 | `apps/vibe-code-studio/src/__tests__/services/ai/ExecutionEngine.test.ts` | Test file - comprehensive tests expected |
| 953 | `apps/business-booking-platform/src/__tests__/services/bookingService.test.ts` | Test file |
| 848 | `apps/shipping-pwa/src/sw/advanced-sw.ts` | Service worker - monolithic by design |
| 829 | `apps/shipping-pwa/tests/security/security-tests.spec.ts` | Test file |

## Refactoring Guidelines

When refactoring these files:

1. **Extract by responsibility** - Each new file should have a single, clear purpose
2. **Maintain backwards compatibility** - Export from index files if needed
3. **Add tests first** - Ensure test coverage before refactoring
4. **Incremental changes** - Refactor in small PRs, not all at once
5. **Update imports** - Use barrel exports to minimize import changes

## Progress Tracking

| File | Status | Date | Notes |
|------|--------|------|-------|
| shipping-pwa/server.ts | ✅ Complete | 2026-01-28 | Split into server/{services,routes,middleware,utils,types}.ts - 2224→~15 files |
| shipping-pwa/Settings.tsx | Pending | - | - |
| vibe-tutor/MusicLibrary.tsx | Pending | - | - |
| monorepo-dashboard/MonorepoHealthDashboard.tsx | Pending | - | - |
| vibe-justice/DocumentManager.tsx | Pending | - | - |
| desktop-commander-v3/mcp.ts | Pending | - | - |
| business-booking-platform/BookingFlow.tsx | Pending | - | - |
