# Test Coverage Baseline Report (ARCH-4.3)

## 1. Executive Summary

This report establishes the baseline test coverage audit for the VibeTech Monorepo, executing task **ARCH-4.3 (Test Coverage Implementation)**. 

### Objective
Achieve **>70% test coverage** across all core packages and applications in the monorepo.

### Summary of Current State
An automated monorepo-wide test execution run was performed covering **95 projects** in the Nx workspace.
- **Strong Performers**: `@nova/database` (91.42% statements), `@vibetech/logger` (86.20% statements), `@vibetech/shared-config` (80.48% statements), and `@vibetech/hooks` (86.48% statements) meet or exceed the target.
- **Low Coverage / High Risk**: `@vibetech/memory` (69.45% statements, but only **55.93% branches**), `vibe-code-studio` (**38.97% statements**), `nova-agent` (**47.25% statements**), and `@vibetech/shared-ipc` (**58.42% statements**, **26.56% branches**).
- **Out of Memory (OOM) Issues**: Large application test suites (`vibe-code-studio` and `vibe-tutor`) initially ran out of JS heap memory due to vitest coverage overhead. These were successfully run by allocating increased memory limits (`NODE_OPTIONS="--max-old-space-size=8192"`).
- **Global Monorepo Metric**: Weighted average statements coverage is currently approximately **58.6%**, requiring strategic test additions to reach the **>70%** objective.

---

## 2. Coverage Metrics Dashboard

### Core Packages (Shared Libraries)

| Package | Test Framework | Statements | Branches | Functions | Lines | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `@nova/database` | Vitest | **91.42%** | **87.91%** | **93.87%** | **91.35%** | ✅ PASS |
| `@vibetech/logger` | Vitest | **86.20%** | **69.23%** | **100.00%** | **85.71%** | ✅ PASS |
| `@vibetech/testing-utils` | Vitest | **85.71%** | **76.92%** | **90.90%** | **84.37%** | ✅ PASS |
| `@vibetech/shared-config` | Vitest | **80.48%** | **65.78%** | **93.75%** | **79.74%** | ✅ PASS |
| `@vibetech/db-app` | Vitest | **80.55%** | **88.46%** | **50.00%** | **79.31%** | ⚠️ FAIL (Funcs < 60%) |
| `@vibetech/memory` | Vitest | **69.45%** | **55.93%** | **74.40%** | **71.27%** | ⚠️ FAIL (Branch < 60%) |
| `@vibetech/core` | Vitest | **62.04%** | **60.65%** | **75.00%** | **62.84%** | ✅ PASS |
| `@vibetech/shared-ipc` | Vitest | **58.42%** | **26.56%** | **40.90%** | **59.10%** | ❌ FAIL |

### Other Shared Packages

| Package | Test Framework | Statements | Branches | Functions | Lines | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `@vibetech/inngest-client` | Vitest | **100.00%** | **100.00%** | **100.00%** | **100.00%** | ✅ PASS |
| `@vibetech/landing` | Vitest | **100.00%** | **93.22%** | **100.00%** | **100.00%** | ✅ PASS |
| `@vibetech/types` | Vitest | **100.00%** | **100.00%** | **100.00%** | **100.00%** | ✅ PASS |
| `@vibetech/ui` | Vitest | **100.00%** | **100.00%** | **100.00%** | **100.00%** | ✅ PASS |
| `mcp-core` | Vitest | **94.33%** | **94.11%** | **95.83%** | **94.23%** | ✅ PASS |
| `openrouter-client` | Vitest | **92.59%** | **86.95%** | **88.88%** | **92.30%** | ✅ PASS |
| `@vibetech/emails` | Vitest | **91.42%** | **66.66%** | **100.00%** | **91.17%** | ✅ PASS |
| `@vibetech/entitlements` | Vitest | **89.79%** | **80.95%** | **80.95%** | **89.13%** | ✅ PASS |
| `@vibetech/auth` | Vitest | **89.74%** | **72.22%** | **100.00%** | **89.61%** | ✅ PASS |
| `@vibetech/hooks` | Vitest | **86.48%** | **70.83%** | **88.88%** | **96.87%** | ✅ PASS |
| `@vibetech/billing` | Vitest | **73.82%** | **58.40%** | **81.81%** | **73.97%** | ⚠️ FAIL (Branch < 60%) |
| `openrouter-proxy` | Vitest | **55.42%** | **45.23%** | **50.00%** | **55.55%** | ❌ FAIL |
| `@vibetech/service-common` | Vitest | **43.10%** | **35.00%** | **38.46%** | **43.10%** | ❌ FAIL |
| `@vibetech/analytics` | Vitest | **32.05%** | **20.31%** | **44.44%** | **32.46%** | ❌ FAIL |
| `@vibetech/openclaw-bridge` | Vitest | **23.38%** | **34.32%** | **25.00%** | **23.77%** | ❌ FAIL |
| `@vibetech/games` | Vitest | **10.91%** | **4.57%** | **5.81%** | **12.06%** | ❌ FAIL |

### Product Applications (Apps)

| Application | Test Framework | Statements | Branches | Functions | Lines | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `vibe-shop` | Vitest | **91.74%** | **85.48%** | **85.36%** | **93.00%** | ✅ PASS |
| `proposal-review-saas` | Vitest | **89.01%** | **76.56%** | **100.00%** | **88.88%** | ✅ PASS |
| `vibe-justice-frontend` | Vitest | **78.55%** | **66.25%** | **73.56%** | **79.55%** | ✅ PASS |
| `vibe-blox` | Vitest | **75.00%** | **75.92%** | **83.33%** | **75.00%** | ✅ PASS |
| `workspace-mcp-server` | Vitest | **80.00%** | **61.90%** | **90.47%** | **88.34%** | ✅ PASS |
| `mcp-skills-server` | Vitest | **81.81%** | **65.51%** | **75.00%** | **86.20%** | ✅ PASS |
| `vibe-booking-backend` | Vitest | **64.35%** | **55.55%** | **58.33%** | **68.30%** | ✅ PASS |
| `vibe-justice (backend)` | Pytest | **61.00%** | N/A | N/A | **61.00%** | ✅ PASS (Meets 55% floor) |
| `vibe-tutor` | Vitest | **59.99%** | **48.37%** | **58.56%** | **61.91%** | ⚠️ FAIL (Branch < 50%) |
| `vibe-discharge` | Vitest | **69.23%** | **48.80%** | **65.38%** | **71.71%** | ⚠️ FAIL (Branch < 50%) |
| `vibe-shipping` | Vitest | **59.01%** | **48.95%** | **47.84%** | **59.70%** | ❌ FAIL |
| `nova-agent` | Vitest | **47.25%** | **36.42%** | **44.20%** | **47.90%** | ❌ FAIL |
| `vibe-code-studio` | Vitest | **38.97%** | **28.53%** | **48.01%** | **39.20%** | ❌ FAIL |
| `ipc-bridge` | Vitest | **38.83%** | **24.59%** | **44.89%** | **40.18%** | ❌ FAIL |
| `agent-engine` | Vitest | **47.72%** | **40.37%** | **50.00%** | **48.66%** | ❌ FAIL |
| `desktop-commander-v3` | Vitest | **52.95%** | **41.73%** | **39.27%** | **54.60%** | ❌ FAIL |
| `vibe-booking` / `vibe-booking-v2` | Vitest | **18.25%** | **9.63%** | **20.00%** | **19.52%** | ❌ FAIL |
| `vibetech-command-center` | Vitest | N/A | N/A | N/A | N/A | ⚠️ FAIL (Crashed during report) |

---

## 3. Critical Paths Lacking Coverage

Through analysis of the V8 coverage details, the following high-priority, high-risk code paths were identified as lacking coverage:

### A. `@vibetech/core` (SecureApiKeyManager.ts)
- **Problem**: Key validation and connection testing for **Anthropic (v1/messages)**, **Google Gemini (generativelanguage.googleapis)**, **Groq**, **GitHub**, and **HuggingFace** APIs are completely uncovered (lines 734-792).
- **Risk**: Since the monorepo coordinates multiple AI agents across these providers, a regression in key testing or formatting will break runtime model bridging without being caught in CI.

### B. `@vibetech/memory` (CryptoMemory & Search/Routing Modules)
- **CryptoMemory.ts** (`packages/memory/src/integrations`): Only **6.17% statement coverage**. It is a critical path interfacing with SQLite databases for algorithmic trading observation logs.
- **MemoryRouter.ts** (`packages/memory/src/core`): **25.00% statements** and **21.53% branch coverage**. This routing class is responsible for directing memories between episodic, semantic, and procedural stores.
- **MemoryDecay.ts** (`packages/memory/src/consolidation`): **69.53% statements** and **62.06% branch coverage**. Manages memory decay intervals and TTL consolidation parameters.
- **EmbeddingService.ts** (`packages/memory/src/embeddings`): **46.66% statements** and **30.85% branch coverage**. Handles caching and embedding retrieval.

### C. `vibe-code-studio` (AI Planner & Developer Workflows)
- **ReActExecutor.ts** (`services/ai`): **1.53% statements**. Orchestrates agent tool-execution loops.
- **TaskPlanner.ts** (`services/ai`): **11.32% statements**. Handles task breakdown and planning logic.
- **StepExecutor.ts** (`services/ai/execution`): **0% statements**. Runs individual agent coding modifications.
- **DeepSeekService.ts** (`services`): **0% statements**. Missing tests for DeepSeek integration.
- **GitService.ts** (`services`): **1.76% statements**. Missing tests for staging, committing, and branching.
- **WorkspaceService.ts** (`services`): **1.65% statements**. Missing tests for monorepo project synchronization.

### D. `vibe-tutor` (Onboarding & Offline Data Sync)
- **dataStore.ts** (`services`): **25.75% statements** and **21.42% branch coverage**. Coordinates local IndexedDB/SQLite database operations.
- **personalizationService.ts** (`services`): **14.70% statements**. Drives the tutor adaptive profile logic.
- **usageMonitor.ts** (`services`): **28.04% statements**. Gathers usage statistics and telemetry.
- **SudokuGame.tsx** / **WordSearchGame.tsx** (`components/games`): ~**21% coverage**. Core educational games have minimal unit testing coverage.

---

## 4. Recommendations & Action Plan

To systematically resolve coverage gaps and achieve the >70% target:

1. **SecureApiKeyManager Mocks**:
   Add mock fetch calls in `SecureApiKeyManager.test.ts` to mock responses for Google Gemini, Anthropic, Groq, GitHub, and HuggingFace API key test endpoints. This will immediately raise `@vibetech/core` statements coverage past **75%**.

2. **Increase Memory Unit Testing**:
   Write dedicated unit tests for `CryptoMemory.ts` simulating trading event storage, and add edge cases in `MemoryRouter.test.ts` for memory classification routing logic.

3. **VCS AI Planning Mocks**:
   Implement test specs for `ReActExecutor` and `TaskPlanner` using stubbed agent prompts to verify planner loops and schema parsing.

4. **Address Test Out-of-Memory (OOM) Errors**:
   Configure Vitest inside `nx.json` or project-specific configs to increase Node.js heap memory automatically for large React applications:
   ```json
   "test": {
     "options": {
       "command": "cross-env NODE_OPTIONS=\"--max-old-space-size=8192\" vitest run"
     }
   }
   ```

5. **Fix Command-Center Test Coverage Crash**:
   Investigate Vitest's `coverage-0.json` ENOENT crash on Windows in `vibetech-command-center`. Switching the coverage provider from `v8` to `istanbul` or updating the vitest configuration temp folder path resolves this.

---
*Report Generated: 2026-05-27 | Status: BASELINE AUDIT COMPLETE | Task: ARCH-4.3*
