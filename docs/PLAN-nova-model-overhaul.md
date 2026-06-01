# Plan: Nova Agent Model Integration & Feature Overhaul

## Overview
Nova Agent is a Tauri desktop application featuring a React frontend and a Rust backend. Currently, its LLM and tool-calling loops are orchestrated in the Rust backend (`provider.rs` / `commands.rs`) using direct HTTP requests and manual SSE stream parsing. This structure has several limitations:
1. **Inefficient Integration:** It replicates connection logic rather than utilizing the monorepo's shared `@vibetech/ai` package, which is designed to centralize and manage model endpoints (Moonshot/Kimi, Google, Codex OAuth, DeepSeek).
2. **Credentials Desync:** The Rust RAG service (`rag.rs`) and other backend subsystems retrieve API keys solely from startup-loaded environment variables (`Config::from_env`), meaning they ignore credentials saved by the user via the settings UI and securely written to the Windows Credential Manager (`CredentialStore`).
3. **Streaming & Tool Overhead:** Handling real-time message streaming, reasoning extraction, and recursive tool execution (e.g., executing code, scanning files) in Rust webview boundaries adds serialization and state overhead.

### Proposed Architecture
We will migrate the agent orchestration layer to the React frontend. The React frontend will directly consume `@vibetech/ai`, while the Rust backend acts as a high-performance utility manager for native OS calls, SQLite databases, and local vector search.

```mermaid
graph TD
    subgraph Frontend (React 19)
        Chat[ChatInterface / Copilot] -->|Initiates Loop| NovaAgent[NovaAiAgent Service]
        NovaAgent -->|Uses| VibeAI[@vibetech/ai Provider]
        VibeAI -->|Requests| LLM[LLM API: DeepSeek, Gemini, Moonshot]
        LLM -->|Returns Tool Calls| NovaAgent
        NovaAgent -->|Intercepts & Resolves| ToolRunner[Frontend Tool Dispatcher]
    end
    subgraph Backend (Tauri / Rust)
        ToolRunner -->|tauri::invoke| TauriCmds[Tauri Rust Commands]
        TauriCmds -->|Executes Natively| OS[OS: Filesystem, Terminal, Process Exec]
        TauriCmds -->|Queries / Writes| DB[(SQLite: Tasks, Learning, Activity)]
        TauriCmds -->|Vector Search| Lance[(LanceDB)]
        
        TauriCmds -->|get_decrypted_api_keys| Keyring[Windows Credential Manager]
        Keyring -.->|Return keys to local WebView| VibeAI
    end
```

---

## Project Type
**WEB / BACKEND (Tauri Desktop React Frontend + Rust Backend)**

---

## Success Criteria
1. **Model Backend Centralization:** 100% of desktop chat and copilot LLM requests routed through `@vibetech/ai` on the React frontend.
2. **Full Provider Support:** Complete integration with Moonshot (Kimi), Google, Codex OAuth, and DeepSeek, including support for fallback routing.
3. **Decrypted API Keys Sync:** Secure retrieval of credentials from the Windows Credential Manager keyring to the local webview via a new Tauri command `get_decrypted_api_keys`.
4. **Token-by-Token Streaming:** Smooth message streaming and reasoning blocks visible in the `ChatInterface` UI.
5. **Robust Tool Loop:** React frontend successfully intercepts model `tool_calls`, dispatches them to Tauri commands, feeds results back to the LLM, and loops recursively without crashes.
6. **RAG Embedding Key Sync:** Rust-based RAG service (`rag.rs`) reads keys from the secure `CredentialStore` instead of environment variables, resolving the startup configuration sync issue.
7. **Complete Feature Audit:** 100% of buttons, fields, and pages (Dashboard, Chat, Copilot, Context Guide, Document Analysis, Calendar, Settings, Admin) validated and verified operational.
8. **Monorepo Standards Compliance:** Code passes all lint checks (ESLint, Biome), typechecks cleanly, passes all unit tests, and compiles successfully under production constraints.

---

## Tech Stack
- **AI Integration Core:** `@vibetech/ai` (shared monorepo package)
- **Frontend Framework:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, Framer Motion
- **Desktop Bridge:** Tauri 2.0, `@tauri-apps/api`
- **Backend Languages & Libraries:** Rust 1.75+, `rusqlite`, `lancedb`, `keyring-rs`
- **Data & Log Locations:** Enforced to `D:\databases\`, `D:\lancedb\`, and `D:\logs\nova-agent\` (never in `C:\dev\`)
- **Testing suite:** Vitest, Playwright (E2E & visual regressions)

---

## File Structure

### Files to Modify
- `apps/nova-agent/package.json`: Register `"@vibetech/ai": "workspace:*"` dependency.
- `apps/nova-agent/src/services/AgentService.ts`: Add `getDecryptedApiKeys` IPC bridge function.
- `apps/nova-agent/src-tauri/src/modules/credentials.rs`: Implement and expose the `get_decrypted_api_keys` command.
- `apps/nova-agent/src-tauri/src/modules/rag.rs`: Update `embed` to load keys dynamically from `CredentialStore`.
- `apps/nova-agent/src-tauri/src/main.rs`: Register `get_decrypted_api_keys` inside `tauri::generate_handler!`.
- `apps/nova-agent/src/pages/ChatInterface.tsx`: Integrate the new streaming and tool-calling frontend dispatcher.
- `apps/nova-agent/src/pages/Settings.tsx`: Update to utilize active model routing and refresh API statuses.
- `apps/nova-agent/src/pages/settings/AiModelsTab.tsx` / `ApiKeysTab.tsx`: Audit validation and ensure correct configurations.

### Files to Create
- `apps/nova-agent/src/services/NovaAiAgent.ts`: Contains the `@vibetech/ai` instantiation, token cost calculations, and the recursive tool-calling agent loop.
- `apps/nova-agent/src/__tests__/NovaAiAgent.test.ts`: Unit tests for the new frontend-based agent chat loop and tool executor.

---

## Task Breakdown

### Phase 1: Setup & Dependency Wiring
Centralize dependencies and verify connection pathways.

#### Task 1.1: Add Shared AI Package Dependency
- **Agent/Skill Recommendation:** link-workspace-packages, nx-workspace
- **INPUT:** `apps/nova-agent/package.json`
- **OUTPUT:** Updated `package.json` with `@vibetech/ai` dependency linked in pnpm workspace.
- **VERIFY:** Run `pnpm install` at the workspace root, followed by `pnpm nx typecheck nova-agent` to ensure dependencies resolve successfully.

#### Task 1.2: Audit Settings & Model Configuration Mappings
- **Agent/Skill Recommendation:** web-design-guidelines
- **INPUT:** `apps/nova-agent/src/components/models-config.ts` and `apps/nova-agent/src/pages/settings/AiModelsTab.tsx`
- **OUTPUT:** Completed audit check of all models listed in the UI selector against the providers supported by `@vibetech/ai` (Gemini, OpenRouter, Moonshot, DeepSeek, OpenAI, Local).
- **VERIFY:** Map each UI model ID to its corresponding `@vibetech/ai` provider type. Confirm there are no dead model IDs in the dropdown.

---

### Phase 2: Credentials and RAG Keys Synchronization
Fix the desync issue by pulling keys from the secure credential manager on both the frontend and backend.

#### Task 2.1: Implement Tauri Command for Secure Decrypted Keys
- **Agent/Skill Recommendation:** rust-pro
- **INPUT:** `apps/nova-agent/src-tauri/src/modules/credentials.rs`
- **OUTPUT:** Implementation of `get_decrypted_api_keys` Tauri command which reads from `CredentialStore::get` and returns a structured object of keys (DeepSeek, Groq, OpenRouter, Google, Kimi) to the local Webview.
- **VERIFY:** 
  1. Add unit test in `credentials.rs` ensuring credentials set in keyring can be read by this function.
  2. Confirm command is registered in `main.rs`.

#### Task 2.2: Sync RAG Embeddings Key Resolution
- **Agent/Skill Recommendation:** rust-pro, database-design
- **INPUT:** `apps/nova-agent/src-tauri/src/modules/rag.rs`
- **OUTPUT:** Refactored `embed` function in `rag.rs` that loads the OpenRouter/Google key from the `CredentialStore` (using `get_with_fallback`) rather than relying strictly on `Config::from_env`.
- **VERIFY:** Run the RAG integration tests or a manual query verify (`verifyRagConnection` setting trigger) and check that search succeeds when the environment key is unset but the keyring key is saved.

---

### Phase 3: Frontend Model Orchestration & Chat Loop
Implement the core agent logic inside the React application.

#### Task 3.1: Create NovaAiAgent Service
- **Agent/Skill Recommendation:** nextjs-react-expert, clean-code
- **INPUT:** `packages/ai` exports and `apps/nova-agent/src/services/NovaAiAgent.ts` (new)
- **OUTPUT:** Frontend agent class that:
  1. Fetches decrypted keys from Tauri backend.
  2. Instantiates appropriate `@vibetech/ai` provider.
  3. Executes standard LLM chat and streaming.
  4. Automatically estimates token usage and logs cost statistics.
- **VERIFY:** Write a unit test `apps/nova-agent/src/__tests__/NovaAiAgent.test.ts` mocking the `@vibetech/ai` provider and asserting correct message forwarding.

#### Task 3.2: Wire up Chat Interface for Stream & Tool Loop
- **Agent/Skill Recommendation:** nextjs-react-expert, frontend-design
- **INPUT:** `apps/nova-agent/src/pages/ChatInterface.tsx` and `apps/nova-agent/src/services/NovaAiAgent.ts`
- **OUTPUT:** Refactored `sendMessage` handler in `ChatInterface.tsx` that triggers the frontend-driven chat loop:
  1. Calls `NovaAiAgent` with user message.
  2. If response is a text stream, renders token chunk-by-chunk.
  3. If response is a `tool_calls` request, intercepts it, triggers corresponding Tauri command invokes (e.g., `execute_code`, `read_file`), feeds outputs back, and loops.
- **VERIFY:** Run the desktop application and verify that entering a prompt requesting file scanning or code execution executes the tools, logs them in the UI console, and yields the final response correctly.

---

### Phase 4: UI-Wide Button and Feature Audit
Audit all buttons and views to ensure everything is working correctly.

#### Task 4.1: Audit Settings and General Admin Tabs
- **Agent/Skill Recommendation:** web-design-guidelines
- **INPUT:** `apps/nova-agent/src/pages/Settings.tsx` and tabs (`GeneralTab.tsx`, `SystemHealthTab.tsx`, `ApiKeysTab.tsx`)
- **OUTPUT:** Functional verification and remediation of settings buttons:
  - "Save Keys" writes correctly to keyring and updates active state.
  - "Verify RAG Connection" executes RAG search successfully.
  - "AdminLogin" and database migrations execute successfully.
- **VERIFY:** Assert that no settings save triggers fail or throw unhandled exceptions in the Webview console.

#### Task 4.2: Audit Copilot, ContextGuide, and Dashboards
- **Agent/Skill Recommendation:** web-design-guidelines
- **INPUT:** `apps/nova-agent/src/pages/Copilot.tsx`, `ContextGuide.tsx`, and `NovaDashboard2026.tsx`
- **OUTPUT:** Verification and fix of all interactive buttons and dashboards:
  - Grounded task creation/approval buttons trigger the correct database operations.
  - Code analysis and scanner triggers retrieve file trees correctly.
  - Focus state metrics, CPU/Memory grids, and active learnings list are updated periodically.
- **VERIFY:** Check web logs/console errors and verify that clicking every button on the dashboard triggers the anticipated Tauri command.

---

### Phase 5: Verification & Quality Assurance
Run tests and perform static analysis to verify the overhauled application.

#### Task 5.1: Execute Local Validation & Unit Tests
- **Agent/Skill Recommendation:** testing-patterns, tdd-workflow
- **INPUT:** `apps/nova-agent` test suites
- **OUTPUT:** Unbroken test execution runs covering new frontend loops, RAG searches, and keyring credential handling.
- **VERIFY:** Run `pnpm run test:all` inside `apps/nova-agent` and confirm 100% of unit/integration tests pass.

#### Task 5.2: E2E and Visual Regression Testing
- **Agent/Skill Recommendation:** webapp-testing, performance-profiling
- **INPUT:** `apps/nova-agent/e2e/visual.spec.ts`
- **OUTPUT:** Clean Playwright test reports asserting visual consistency of Chat Interface, Dashboards, and Settings panels.
- **VERIFY:** Run `pnpm run test:visual` in `apps/nova-agent` and verify no mismatching visual diff pixels exceed `maxDiffPixelRatio: 0.002`.

---

## Phase X: Final Verification Checklist
Prior to committing changes, verify the workspace health and enforce monorepo isolation rules.

- [ ] **Pre-Commit validation:** Run `pnpm run quality:fix` to trigger ESLint checks, Biome formatting, and TypeScript checking.
- [ ] **Unified Verification:** Run `python .agent/scripts/checklist.py .` from the workspace root to verify compliance with type safety, schema integrity, and security rules.
- [ ] **Workspace check:** Run `pnpm run workspace:health` and `pnpm run paths:check` to ensure no active databases or logs are leaking into `C:\dev\`. Verify they default to `D:\databases\` and `D:\logs\`.
- [ ] **Clean Lint:** Run `pnpm run lint` and verify zero errors in either flat ESLint or Biome files.
- [ ] **File Size Boundary check:** Confirm no single modified or created file exceeds **500 lines** (adhering to the monorepo soft limit). Split files early.
- [ ] **Handoff validation:** Update `D:\learning-system\sessions\CURRENT.md` with the new setup status.
