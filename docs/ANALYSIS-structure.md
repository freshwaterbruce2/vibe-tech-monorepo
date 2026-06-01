# 🔍 Nova Agent Structure & Boundary Audit Report

**Date:** June 1, 2026  
**Auditor:** Codebase Structure Reviewer Agent  
**Target:** `apps/nova-agent` (Nova Agent) and its dependencies  
**Status:** Completed (Read-Only Audit, No Code Modified)  

---

## 1. Executive Summary

An audit of the directory layout, package boundaries, and workspace imports of Nova Agent (`apps/nova-agent`) and its dependencies has identified several critical architectural boundary violations, layout drifts, and configuration anomalies. 

While the application compiles and runs successfully (partly due to complex bundler-level shims and permissive linter rules), it exhibits structural tech debt that compromises monorepo modularity, build optimization, and long-term maintainability.

### Key Findings Summary:
1. **Deep Cross-App Relative Imports**: Sibling MCP servers (`apps/mcp-rag-server` and `apps/memory-mcp`) bypass the workspace package structure entirely by importing files directly from the source directory of `apps/nova-agent` via relative paths. Neither app declares `nova-agent` in their `package.json` dependencies, breaking Nx/pnpm build graphs.
2. **Implicit/Undeclared Workspace Dependencies**: Nova Agent's `tsconfig.json` maps path aliases for `@vibetech/shared-config` and `@vibetech/logger`, but these are omitted from its `package.json` dependencies, creating undeclared runtime and typechecking links.
3. **Phantom/Unused Dependency**: `@vibetech/ui` explicitly declares a workspace dependency on `@vibetech/core` in its package manifest, yet imports nothing from it. This triggers redundant Nx build invalidation cascades.
4. **Mixed Frontend/Backend Core Library**: `@vibetech/core` mixes frontend-safe functions with heavy backend-specific modules (e.g. SQLite database adapters and Python process engines). This forces Nova Agent's Vite bundler config to construct extensive stubs and virtual alias mappings to prevent compiler and runtime failures in browser/WebView2 environments.
5. **Workspace Inconsistent Exclusions**: In `pnpm-workspace.yaml`, the nested workspace `apps/gravity-claw` is listed as an inclusion despite comments stating it should be excluded.
6. **Cross-Language Schema Sync Drift**: Tauri Rust backend structs in `src-tauri` representing WebSocket messages mirror TypeScript Zod schemas defined in `@vibetech/shared-ipc` with no compile-time enforcement of synchronization, relying entirely on manual alignment.
7. **Version Mismatch Overrides**: `pnpm.overrides` forces a downgrade of `lucide-react` to `0.563.0` globally, overriding Nova Agent's requested `0.577.0` and creating discrepancies between source declarations and runtime packages.

---

## 2. Directory Layout Audit

### 2.1 Directory Structure Analysis
The layout of `apps/nova-agent` is structured around a Tauri desktop framework integration:
- **`src/` (React Frontend)**: Contains the presentation layer, Zustand stores, state context providers, page layouts, and styling.
  - `src/stubs/`: Houses stubs like `shared-config-shim.ts`, `node-empty.ts`, and `node-builtins-stub.ts`. These are structural workarounds designed to decouple frontend bundles from backend code (discussed in Section 4).
  - `src/shared/`: Houses minor local utilities (`lazy-loading.ts`, `performance-monitor.ts`) and `LazyImage.tsx`. 
- **`src-tauri/` (Tauri/Rust Backend)**: Hosts the native desktop capability backend.
  - `src-tauri/src/guidance_engine/`: Contains the split rules and types after refactoring the original 962-line guidance monolith into modular files (`engine.rs`, `rules.rs`, `types.rs`, `utils.rs`).
  - `src-tauri/src/websocket_client/`: Handles WS client bridge connections.
  - `src-tauri/src/database/`: Handles localized Rust database adapters for sqlite schemas.

### 2.2 Tauri Rust Compiler Profiling (OOM Mitigation)
The Tauri Rust package uses a highly customized release compilation profile inside `src-tauri/Cargo.toml` to prevent Out Of Memory (OOM) compiler crashes on CI systems (e.g. GitHub Actions runners) when compiling complex crates like `windows-rs` or the `arrow/datafusion/lancedb` stack:

```toml
[profile.release]
opt-level = "s"      # Optimize for size
lto = false          # Disable Link-Time Optimization to reduce memory usage during build
codegen-units = 1     # Single codegen unit — reduces peak LLVM memory usage
strip = true         # Strip debugging symbols
panic = "abort"      # Eliminate panic unwinding to reduce binary size

[profile.release.package."*"]
opt-level = 0
codegen-units = 256
incremental = false  # Disable incremental compilation caching to save memory
```
This configuration forces dependency crates to compile with zero optimization sequentially, significantly lowering the compiler's peak RSS memory footprint.

### 2.3 Configuration Drift in `pnpm-workspace.yaml`
A syntax error was identified in the monorepo-wide `pnpm-workspace.yaml` file:

```yaml
packages:
  - "packages/*"
  - "packages/feature-flags/*"
  - "apps/*"
  ...
  # Exclude local-only WIP workspaces not yet committed to git.
  - "apps/gravity-claw"
```
In pnpm workspace configurations, exclusions must be explicitly prefixed with an exclamation mark (e.g., `"!apps/gravity-claw"`). Because `apps/gravity-claw` is declared without this prefix, it is actually **included** in the pnpm workspace, contrary to the comment's intent. This forces pnpm to resolve lockfiles and manage packages for an uncommitted, local-only repository.

---

## 3. Dependency Boundary & Import Analysis

### 3.1 Deep Cross-App Relative Imports (Modularity Violations)
The most severe architectural violation in the monorepo is the direct referencing of internal files of `apps/nova-agent` by other applications (`apps/mcp-rag-server` and `apps/memory-mcp`).

#### Violations Identified:
* **`apps/memory-mcp/src/rag-bridge.ts`**:
  ```typescript
  import { RAGIndexer } from '../../nova-agent/src/rag/indexer.js';
  import { RAGRetriever } from '../../nova-agent/src/rag/retriever.js';
  import { RAGReranker } from '../../nova-agent/src/rag/reranker.js';
  import { RAGCache } from '../../nova-agent/src/rag/cache.js';
  import { DEFAULT_RAG_CONFIG } from '../../nova-agent/src/rag/types.js';
  import type { RAGConfig, SearchResult } from '../../nova-agent/src/rag/types.js';
  ```
* **`apps/mcp-rag-server/scripts/eval-contextual-chunking.ts`**:
  ```typescript
  import { RAGIndexer } from '../../nova-agent/src/rag/indexer.js';
  import { RAGRetriever } from '../../nova-agent/src/rag/retriever.js';
  ```
* **`apps/mcp-rag-server/tsconfig.json`**:
  ```json
  "compilerOptions": {
    "paths": {
      "@nova-rag/*": ["../nova-agent/src/rag/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "../nova-agent/src/rag/**/*"
  ]
  ```
* **`apps/mcp-rag-server/tsup.config.ts`**:
  ```typescript
  alias: {
    '@nova-rag': resolve(__dirname, '../nova-agent/src/rag'),
  }
  ```

#### Architectural Impact:
* **Bypassed Build Graph**: Neither `mcp-rag-server` nor `memory-mcp` lists `nova-agent` as a dependency in their `package.json`. Consequently, `pnpm` and `Nx` are completely unaware of these links. If files inside `apps/nova-agent/src/rag/` are edited, Nx will not flag `mcp-rag-server` or `memory-mcp` as affected, leading to stale builds or unrun verification checks.
* **Code Duplication**: `tsup` in both target applications bundles and inlines the RAG pipeline files from `nova-agent`'s source path. This results in three separate, compiled instances of the same business logic.
* **Fragile Structure**: A refactor to reorganize code inside `apps/nova-agent` will silently and immediately break compile states in completely separate applications.

### 3.2 Implicit/Undeclared Workspace Dependencies in TSConfig
Within `apps/nova-agent/tsconfig.json`, the configuration defines the following paths:
```json
"paths": {
  "@/*": ["./src/*"],
  "@vibetech/shared-ipc": ["../../packages/shared-ipc/src/index.ts"],
  "@vibetech/core": ["../../packages/core/src/index.ts"],
  "@vibetech/ui": ["../../packages/ui/src/index.ts"],
  "@vibetech/inngest-client": ["../../packages/inngest-client/src/index.ts"],
  "@vibetech/openrouter-client": ["../../packages/openrouter-client/src/index.ts"],
  "@vibetech/shared-config": ["../../packages/shared-config/src/index.ts"],
  "@vibetech/logger": ["../../packages/logger/src/index.ts"]
}
```
* **The Issue**: Neither `@vibetech/shared-config` nor `@vibetech/logger` is declared in `apps/nova-agent/package.json` dependencies or devDependencies.
* **Why it works now**: TypeScript compiles because the paths are hardcoded to relative files in sibling packages, and pnpm hoists the packages into root node_modules due to parent links.
* **The Hazard**: This introduces hidden workspace dependencies. If this project were built in an isolated CI container or published independently, compiler and package resolution failures would occur due to the missing declarations.

### 3.3 Phantom/Unused Dependency in `@vibetech/ui`
The shared package `packages/ui` includes the following dependency in its `package.json`:
```json
"dependencies": {
  "@vibetech/core": "workspace:*"
}
```
* **The Issue**: A codebase search shows **zero** imports or references to `@vibetech/core` anywhere inside the `packages/ui` source folder.
* **Architectural Impact**: This is a phantom dependency. It links the lightweight UI presentation package directly to the heavy monorepo core library in the dependency graph. Any change to `@vibetech/core` unnecessarily invalidates the Nx build cache for `@vibetech/ui`, leading to cascade rebuild triggers across all applications that depend on UI components (including Nova Agent, Vibe Tutor, and Vibe Code Studio).

### 3.4 Relaxed ESLint Module Boundaries
The monorepo's unified `eslint.config.js` configures `@nx/enforce-module-boundaries` in `warn` mode:
```javascript
'@nx/enforce-module-boundaries': [
  'warn',
  {
    enforceBuildableLibDependency: true,
    depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
  }
]
```
* **Impact**: Because the constraints are set to allow `*` to depend on `*` and warnings do not halt builds, the monorepo does not actively prevent cross-boundary imports or path violations during development workflows.

---

## 4. Node/Browser Hybrid Bundling & Shims

Because `@vibetech/core` consolidates generic utilities, RAG components, database adapters, and python controllers, it imports:
* `better-sqlite3` (a native C++ node-addon)
* Node.js built-ins (`fs`, `path`, `child_process`, `os`, `crypto`, etc.)
* `@vibetech/shared-config` (which reads from file systems and environment variables)

When `apps/nova-agent` imports `@vibetech/core` to consume client/frontend utilities in its React UI, the bundler (Vite) attempts to compile the entire transitive dependency graph of `@vibetech/core` for the browser context (WebView2). 

To prevent Vite compile-time failures and browser runtime errors, the project implements complex redirect overrides inside `apps/nova-agent/vite.config.ts`:

```typescript
resolve: {
  alias: [
    { find: '@', replacement: path.resolve(__dirname, './src') },
    {
      find: '@vibetech/openrouter-client',
      replacement: path.resolve(__dirname, '../../packages/openrouter-client/dist/index.js'),
    },
    {
      find: '@vibetech/shared-config',
      replacement: path.resolve(__dirname, './src/stubs/shared-config-shim.ts'),
    },
    {
      find: 'better-sqlite3',
      replacement: path.resolve(__dirname, './src/stubs/node-empty.ts'),
    },
    // Exact Node.js built-ins shims using RegExp
    {
      find: /^(node:)?fs(\/promises)?$/,
      replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
    },
    {
      find: /^(node:)?path(\/(posix|win32))?$/,
      replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
    },
    {
      find: /^(node:)?(child_process|util|os|electron|crypto|url|stream|events|process)$/,
      replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
    },
  ],
}
```

### Architectural Critique:
* **Leaky Boundaries**: The necessity of virtual stubs (`shared-config-shim.ts`, `node-empty.ts`, and `node-builtins-stub.ts`) indicates that `@vibetech/core` fails to separate concerns. Frontend code should not have to strip out native database drivers or process runners via bundler regex.
* **Coupling Hazards**: If a developer introduces an import inside `@vibetech/core` that references another Node built-in not covered by these regex mappings, Nova Agent's frontend build will immediately fail.

---

## 5. Rust Backend & Cross-Language Schema Drift

The Tauri Rust backend exchanges messages with Vibe Code Studio and the desktop command center using the `@vibetech/shared-ipc` protocol.
* **Rust Definition** (`apps/nova-agent/src-tauri/src/websocket_client/messages.rs`):
  ```rust
  #[derive(Debug, Clone, Serialize, Deserialize)]
  #[serde(tag = "type")]
  pub enum IpcMessage {
      #[serde(rename = "file:open")]
      FileOpen { payload: FileOpenPayload },
      #[serde(rename = "learning:sync")]
      LearningSync { payload: LearningSyncPayload },
      ...
  }
  ```
* **TypeScript Definition** (`packages/shared-ipc/src/schemas/`):
  Zod schemas defining the shape of messages.

### Critical Hazard:
There is no automated script, code-generator, or compiler verification linking the Rust structures to the Zod schemas. If the TypeScript schemas are updated or refactored, the Rust backend will compile without warning, but will crash or drop messages silently at runtime due to serialization format mismatches.

---

## 6. Version Synchronization Conflicts

The monorepo root package configuration implements a global version override mechanism:
* **Root `package.json`**:
  ```json
  "pnpm": {
    "overrides": {
      "lucide-react": "0.563.0"
    }
  }
  ```
* **`apps/nova-agent/package.json`**:
  ```json
  "dependencies": {
    "lucide-react": "0.577.0"
  }
  ```

### Drift Impact:
Due to pnpm's hoisting and overrides, Nova Agent is forced to resolve `lucide-react` to `0.563.0`. The explicit dependency version `0.577.0` declared in the app manifest is silently ignored. This creates configuration drift where developers may write code expecting features/icons of `v0.577.0` that will crash or fail to render because they are resolved to `v0.563.0` at runtime.

---

## 7. Remediation Plan & Recommendations

To resolve the identified structural violations and align the workspace with clean monorepo architecture rules, the following non-destructive refactoring plan is recommended:

```mermaid
graph TD
    subgraph "Current Violations"
        A[memory-mcp] -- Deep relative import --> R[nova-agent/src/rag]
        B[mcp-rag-server] -- Deep relative import --> R
    end

    subgraph "Proposed Remediation"
        R2[nova-agent/src/rag] -- Extract to new library --> PR[@vibetech/rag]
        PR -- workspace dependency --> A2[memory-mcp]
        PR -- workspace dependency --> B2[mcp-rag-server]
        PR -- workspace dependency --> N2[nova-agent]
    end
    
    style A fill:#ffcccc,stroke:#ff0000
    style B fill:#ffcccc,stroke:#ff0000
    style R fill:#ffcccc,stroke:#ff0000
    style PR fill:#ccffcc,stroke:#00aa00
```

### Step 1: Resolve Deep Cross-App Imports (Extract `@vibetech/rag`)
1. Create a new shared workspace package: `packages/rag` (scoped as `@vibetech/rag`).
2. Move `apps/nova-agent/src/rag/*` into the new library's directory.
3. Update `package.json` files for `apps/nova-agent`, `apps/memory-mcp`, and `apps/mcp-rag-server` to list `"@vibetech/rag": "workspace:*"` under dependencies.
4. Remove the manual path mappings and includes pointing to `../nova-agent/src/rag/*` inside `apps/mcp-rag-server/tsconfig.json` and its `tsup.config.ts`.
5. Repoint all import headers to use `@vibetech/rag` directly.

### Step 2: Separate concerns in `@vibetech/core`
1. Split `@vibetech/core` into two separate packages:
   * `@vibetech/core-client` (containing frontend-safe utilities, math functions, environment structures, and path parsers that compile in pure browser environments).
   * `@vibetech/core-server` (containing SQLite adapters, process executors, filesystem validators, and logger transports that require Node runtime modules).
2. Update Nova Agent's frontend imports to reference `@vibetech/core-client`, eliminating the need to maintain `node-builtins-stub.ts`, `shared-config-shim.ts`, and `node-empty.ts` inside Nova Agent's local source tree.

### Step 3: Remove Phantom Dependencies and Sync Manifests
1. Remove `@vibetech/core` from `packages/ui/package.json` dependencies.
2. Declare `@vibetech/shared-config` and `@vibetech/logger` explicitly inside `apps/nova-agent/package.json` dependencies to resolve the implicit tsconfig paths mappings.
3. Align `lucide-react` version in `apps/nova-agent/package.json` to match the pinned root version `0.563.0` (or update the root override to `0.577.0` to permit new features).
4. Correct `pnpm-workspace.yaml` by changing the entry `apps/gravity-claw` to `"!apps/gravity-claw"` so that the exclusion is properly parsed by pnpm.

### Step 4: Enforce Rust-TS Schema Synchronization
1. Integrate a tool like `ts-rs` or `specta` in the Tauri Rust codebase.
2. Automatically compile and generate TypeScript type declarations from Rust structs during the build step, exporting them directly into a shared workspace package (`packages/shared-ipc` or a dedicated `@vibetech/bridge-types`), ensuring compile-time safety and preventing runtime interface drift.
