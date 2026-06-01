# Cleanup Analysis & Plan: Nova Agent

This document outlines the findings of the dead code, unused libraries, duplicate utility helper files, and redundant features audit for **Nova Agent** (`apps/nova-agent`) and its related workspace modules.

> [!IMPORTANT]
> **Rule of Engagement:** NO code modification is to be performed under this plan without explicit validation. This document acts as the analysis and task plan. Sibling projects in the workspace must be protected during cleanup.

---

## 1. Executive Summary

A comprehensive graph-traversal import-resolution audit was conducted starting from `src/main.tsx`, `src/cli.ts`, and `src/test/setup.ts` entry points. The audit reveals significant areas of dead code, outdated pages, redundant local utilities, and obsolete workspace packages.

### Key Metrics
* **Unused Pages:** 6 pages
* **Unused Services:** 13 service files/folders
* **Unused Components:** 14 components
* **Unused shadcn/ui Components:** 36 primitives
* **Unused Workspace Packages:** 2 packages (`@nova/database`, `@nova/types`)
* **Dead Files & Scripts:** 4 files
* **Dead Dependencies:** 11 third-party/workspace npm packages

---

## 2. Detailed Audit Findings

### 2.1 Unused Pages
These page components are never imported in active routers or layout wrappers:
* `src/pages/Dashboard.tsx` — Superseded by `NovaDashboard.tsx` and `NovaDashboard2026.tsx`. Note: Appears referenced in `LazyRouteLoader.tsx`, but that loader itself is unused.
* `src/pages/Orchestrator.tsx` — Legacy orchestrator view.
* `src/pages/ProjectDetail.tsx` — Legacy project view.
* `src/pages/Resources.tsx` — Legacy developer resources layout.
* `src/pages/TradingTest.tsx` — Observation/testing view for trading api.
* `src/pages/PalettePreview.tsx` — Legacy color preview playground.

### 2.2 Unused Services
These services are defined but have no active runtime imports or references:
* `src/services/database.ts` — Mock IndexedDB/local database API (superseded by Rust/Tauri database commands).
* `src/services/DesktopAgentAdapter.ts` — Unreferenced client adapter.
* `src/services/ExtensionManager.ts` & `ExtensionRegistry.ts` — Stale extensions architecture.
* `src/services/featureFlags.ts` — Custom feature-flag engine (Tauri build uses `FeatureFlaggedRoute.tsx` which defaults flags to enabled).
* `src/services/ImageToCodeService.ts` — direct client-side Moonshot/Kimi conversion service.
* `src/services/RAGService.ts` — Local RAG routing wrapper (app uses memory-mcp HTTP bridge or Tauri Rust IPC).
* `src/services/TerminalService.ts` & `src/services/terminal/*` — Obsolete terminal manager.
* `src/services/WorkspaceService.ts` — Stale workspace indexing interface.
* `src/services/cryptoTradingApi.ts` — Stale cryptocurrency dashboard API.
* `src/services/LanguageServer.ts` & `src/services/languageserver/*` — Unused local LSP client (includes `CompletionProvider.ts`, `DiagnosticEngine.ts`, and `types.ts`).
* `src/services/openrouter.ts` — Stale direct client-side OpenRouter API caller (superseded by Tauri Rust LLM bridge).
* `src/services/moonshot.ts` — Direct Moonshot client API caller (superseded by Tauri Rust LLM bridge).

### 2.3 Unused Components
These components are dead files with no active parent references:
* `src/components/lazy/LazyComponents.tsx` — Dead component lazy loader.
* `src/components/lazy/LazyRouteLoader.tsx` — Dead route lazy loader.
* `src/components/chat/AgentSelector.tsx` — Replaced by built-in selection logic.
* `src/components/dashboard/AgentInteractionPanel.tsx` — Unused legacy panel.
* `src/components/dashboard/DashboardEmptyState.tsx` — Unused legacy layout.
* `src/components/dashboard/DashboardOverview.tsx` — Unused legacy layout.
* `src/components/dashboard/LearningMemory.tsx` — Stale memory details view.
* `src/components/DeepWorkDashboard.tsx` & `src/components/deepwork/*` — Stale Deep Work tracking components (includes `DeepWorkStates.tsx` and `DeepWorkStatsCards.tsx`).
* `src/components/FeatureFlagProviderStub.tsx` — Unused stub.
* `src/components/layout/CommandCenterLayout.tsx` — Unreferenced layout.
* `src/components/optimized/OptimizedImage.tsx` — Unused wrapper.
* `src/components/PredictiveCard.tsx` — Unreferenced card component.
* `src/components/ProactiveNotification.tsx` — Unreferenced notification component.
* `src/components/todo/*` — Redundant todo components (includes `TodoList.tsx`, `TodoItem.tsx`, `TodoForm.tsx`, `PrioritySelector.tsx`, `CategorySelector.tsx`, and `types.ts`).
* `src/shared/components/LazyImage.tsx` — Unused image component.
* `src/shared/utils/lazy-loading.ts` — Unused lazy-loading utility helper.
* `src/shared/utils/performance-monitor.ts` — Unused performance instrumentation utility.

### 2.4 Unused shadcn/ui Components (36 Primitives)
These UI primitives are defined in `src/components/ui/` but are never imported by active application views:
* `accordion.tsx`
* `alert-dialog.tsx`
* `alert.tsx`
* `animate-on-scroll.tsx`
* `aspect-ratio.tsx`
* `avatar.tsx`
* `breadcrumb.tsx`
* `carousel.tsx`
* `chart.tsx`
* `collapsible.tsx`
* `command.tsx`
* `context-menu.tsx`
* `drawer.tsx`
* `dropdown-menu.tsx`
* `form.tsx`
* `gradient-feather-icon.tsx`
* `gradient-icon.tsx`
* `hover-card.tsx`
* `input-otp.tsx`
* `menubar.tsx`
* `navigation-menu.tsx`
* `pagination.tsx`
* `paintbrush.tsx`
* `progress.tsx`
* `radio-group.tsx`
* `resizable.tsx`
* `responsive-container.tsx`
* `separator.tsx`
* `sheet.tsx`
* `sidebar-menu.tsx`
* `sidebar-provider.tsx`
* `sidebar-sections.tsx`
* `slider.tsx`
* `toast.tsx`
* `toggle-group.tsx`
* `toggle.tsx`

### 2.5 Dead Files & Stale Scripts
* `src/test/setup.ts` — Stale setup config. Vitest is configured to run `./src/__tests__/setup.ts`.
* `src/ui/tray_icon.py` — Unreferenced Python tray icon helper.
* `src/controllers/command_listener.py` — Unreferenced Python listener script.
* `scripts/prevent-cdev-data-storage.js` — Empty 0-byte file.

### 2.6 Stale Workspace Packages
These local library packages are completely unused within the monorepo:
* `packages/nova-database` — TypeScript database adapter using `better-sqlite3` (Tauri uses native Rust SQLite driver instead).
* `packages/nova-types` — Types have been inlined or mocked inside active packages to resolve Metro bundling issues.

---

## 3. Architectural Coupling Warning (The RAG Pipeline Leak)

> [!WARNING]
> **DO NOT DELETE `apps/nova-agent/src/rag` directly.**
> Although the `nova-agent` React frontend does not import any scripts from `src/rag/` (as it communicates via the `memory-mcp` HTTP bridge or Tauri Rust commands), **`apps/mcp-rag-server`** imports the RAG pipeline directly from this directory.
>
> **The Leak Mechanism:**
> * `apps/mcp-rag-server/tsconfig.json` defines a path alias: `@nova-rag/*: ["../nova-agent/src/rag/*"]`
> * `apps/mcp-rag-server/tsup.config.ts` bundles this path at compile time.
> * Deleting `apps/nova-agent/src/rag` will break the compilation of `mcp-rag-server`.

---

## 4. Cleanup Task Plan

To clean the workspace safely, a 4-phase plan must be executed.

### Phase 1: Shared Package Extraction (Pre-requisite)
1. **Create Shared Package:** Scaffold a new package `packages/rag-core` (or similar) in the workspace.
2. **Move RAG Source Code:** Transfer all contents of `apps/nova-agent/src/rag` (chunker, indexer, connectors, embedder, contextualizer, etc.) to the new package.
3. **Refactor Sibling Imports:**
   * Update `apps/mcp-rag-server/tsconfig.json` path mapping to import from `@vibetech/rag-core` workspace module.
   * Update `apps/mcp-rag-server/tsup.config.ts` to bundle the new package.
4. **Compile & Verify:** Run `pnpm nx build mcp-rag-server` to ensure the compilation succeeds with zero filesystem leaks.

### Phase 2: Safe Deletion of Local Dead Code (After Phase 1)
Once the RAG pipeline has been extracted, delete the following files and directories from `apps/nova-agent`:

```powershell
# Deleting Unused Pages
Remove-Item -Recurse -Force src/pages/Dashboard.tsx
Remove-Item -Recurse -Force src/pages/Orchestrator.tsx
Remove-Item -Recurse -Force src/pages/ProjectDetail.tsx
Remove-Item -Recurse -Force src/pages/Resources.tsx
Remove-Item -Recurse -Force src/pages/TradingTest.tsx
Remove-Item -Recurse -Force src/pages/PalettePreview.tsx

# Deleting Unused Services
Remove-Item -Force src/services/database.ts
Remove-Item -Force src/services/DesktopAgentAdapter.ts
Remove-Item -Force src/services/ExtensionManager.ts
Remove-Item -Force src/services/ExtensionRegistry.ts
Remove-Item -Force src/services/featureFlags.ts
Remove-Item -Force src/services/ImageToCodeService.ts
Remove-Item -Force src/services/RAGService.ts
Remove-Item -Force src/services/TerminalService.ts
Remove-Item -Force src/services/WorkspaceService.ts
Remove-Item -Force src/services/cryptoTradingApi.ts
Remove-Item -Force src/services/LanguageServer.ts
Remove-Item -Force src/services/openrouter.ts
Remove-Item -Force src/services/moonshot.ts
Remove-Item -Recurse -Force src/services/languageserver/
Remove-Item -Recurse -Force src/services/terminal/

# Deleting Unused Components
Remove-Item -Recurse -Force src/components/lazy/
Remove-Item -Force src/components/chat/AgentSelector.tsx
Remove-Item -Force src/components/dashboard/AgentInteractionPanel.tsx
Remove-Item -Force src/components/dashboard/DashboardEmptyState.tsx
Remove-Item -Force src/components/dashboard/DashboardOverview.tsx
Remove-Item -Force src/components/dashboard/LearningMemory.tsx
Remove-Item -Force src/components/DeepWorkDashboard.tsx
Remove-Item -Recurse -Force src/components/deepwork/
Remove-Item -Force src/components/FeatureFlagProviderStub.tsx
Remove-Item -Force src/components/layout/CommandCenterLayout.tsx
Remove-Item -Recurse -Force src/components/optimized/
Remove-Item -Force src/components/PredictiveCard.tsx
Remove-Item -Force src/components/ProactiveNotification.tsx
Remove-Item -Recurse -Force src/components/todo/
Remove-Item -Force src/shared/components/LazyImage.tsx
Remove-Item -Force src/shared/utils/lazy-loading.ts
Remove-Item -Force src/shared/utils/performance-monitor.ts

# Deleting Unused UI Primitives
Remove-Item -Force src/components/ui/accordion.tsx
Remove-Item -Force src/components/ui/alert-dialog.tsx
Remove-Item -Force src/components/ui/alert.tsx
Remove-Item -Force src/components/ui/animate-on-scroll.tsx
Remove-Item -Force src/components/ui/aspect-ratio.tsx
Remove-Item -Force src/components/ui/avatar.tsx
Remove-Item -Force src/components/ui/breadcrumb.tsx
Remove-Item -Force src/components/ui/carousel.tsx
Remove-Item -Force src/components/ui/chart.tsx
Remove-Item -Force src/components/ui/collapsible.tsx
Remove-Item -Force src/components/ui/command.tsx
Remove-Item -Force src/components/ui/context-menu.tsx
Remove-Item -Force src/components/ui/drawer.tsx
Remove-Item -Force src/components/ui/dropdown-menu.tsx
Remove-Item -Force src/components/ui/form.tsx
Remove-Item -Force src/components/ui/gradient-feather-icon.tsx
Remove-Item -Force src/components/ui/gradient-icon.tsx
Remove-Item -Force src/components/ui/hover-card.tsx
Remove-Item -Force src/components/ui/input-otp.tsx
Remove-Item -Force src/components/ui/menubar.tsx
Remove-Item -Force src/components/ui/navigation-menu.tsx
Remove-Item -Force src/components/ui/pagination.tsx
Remove-Item -Force src/components/ui/paintbrush.tsx
Remove-Item -Force src/components/ui/progress.tsx
Remove-Item -Force src/components/ui/radio-group.tsx
Remove-Item -Force src/components/ui/resizable.tsx
Remove-Item -Force src/components/ui/responsive-container.tsx
Remove-Item -Force src/components/ui/separator.tsx
Remove-Item -Force src/components/ui/sheet.tsx
Remove-Item -Force src/components/ui/sidebar-menu.tsx
Remove-Item -Force src/components/ui/sidebar-provider.tsx
Remove-Item -Force src/components/ui/sidebar-sections.tsx
Remove-Item -Force src/components/ui/slider.tsx
Remove-Item -Force src/components/ui/toast.tsx
Remove-Item -Force src/components/ui/toggle-group.tsx
Remove-Item -Force src/components/ui/toggle.tsx

# Deleting Unused/Empty scripts and sandbox folders
Remove-Item -Force src/test/setup.ts
Remove-Item -Force src/ui/tray_icon.py
Remove-Item -Force src/controllers/command_listener.py
Remove-Item -Force scripts/prevent-cdev-data-storage.js
Remove-Item -Recurse -Force tests_sandbox/

# Deleting Stale Workspace Packages
Remove-Item -Recurse -Force packages/nova-database/
Remove-Item -Recurse -Force packages/nova-types/
```

### Phase 3: Cleaning package.json Dependencies
After code removal, clean the `apps/nova-agent/package.json` to purge these unused dependencies and devDependencies:

* **Remove Unused dependencies:**
  * `@lancedb/lancedb`
  * `@radix-ui/react-accordion`
  * `@radix-ui/react-aspect-ratio`
  * `@radix-ui/react-context-menu`
  * `@radix-ui/react-menubar`
  * `@radix-ui/react-navigation-menu`
  * `@radix-ui/react-radio-group`
  * `@radix-ui/react-slider`
  * `@radix-ui/react-toggle`
  * `@radix-ui/react-toggle-group`
  * `@tauri-apps/plugin-shell`
  * `better-sqlite3`
  * `embla-carousel-react`
  * `input-otp`
  * `ts-morph`
  * `vaul`
  * `vscode-languageserver-protocol`
  * `vscode-languageserver-textdocument`
* **Run installation cleanup:**
  ```powershell
  pnpm install
  ```

### Phase 4: Verification Checklist
Run validation targets to verify that the app builds and tests pass without compile-time errors from missing imports:
1. **Typecheck:** `pnpm nx typecheck nova-agent`
2. **Lint:** `pnpm nx lint nova-agent`
3. **Vitest Unit Tests:** `pnpm nx test nova-agent`
4. **Vite Production Compile:** `pnpm nx build nova-agent`
