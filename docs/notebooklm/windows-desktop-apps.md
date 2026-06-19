# VibeTech — Windows Desktop Apps (live-tree verified 2026-06-18)

This document is the single authoritative inventory of the VibeTech monorepo's
Windows desktop applications — the Tauri v2 apps and the one Electron app. Every fact
below was read directly from each app's `package.json`, `src-tauri/tauri.conf.json`,
and `Cargo.toml` on the live `V:\monorepo` filesystem on 2026-06-18. No claim here is
inferred from prior knowledge-base text. Desktop apps target Windows 11 only; all
source lives on `V:\monorepo`, all data/DBs/logs live on `D:\`.

> SUPERSEDES and invalidates the following stale documents (delete them from any
> NotebookLM / knowledge-base context): "CANONICAL FACTS (disk-verified) 2026-06-16",
> "VibeTech Ecosystem Review and System Health Audit 2026", "source1_vtde_status.md",
> "source_vtde.md", "claudecode06142026". Those describe FALSE state — a live
> `apps/vtde` Tauri app, a `WORKSPACE.json`, and a `guard-protect-source.ps1` "error" —
> none of which exist in the live tree.

## CRITICAL truth-keeping: there is no `apps/vtde`

- `apps/vtde` **DOES NOT EXIST**. There is no Tauri v2 desktop-OS-shell, no xterm.js
  terminal "VTDE" app, and no portable-pty Rust PTY backend in this monorepo. Any
  document claiming a "live vtde Tauri app" that "passes 14 frontend + 8 Rust tests"
  is FALSE and comes from the superseded sources above.
- "VTDE" is the **legacy name** of `apps/vibetech-command-center` (package
  `@vibetech/command-center`) — the Electron app documented in Section B. When older
  docs say "VTDE", they mean Command Center, which is Electron (not Tauri).

> How to read this if you are an AI grounded only in uploaded docs: you cannot see the
> live filesystem, run PowerShell, or observe hooks. Any phrasing like "disk-verified"
> or "system health sweep confirmed" in another source is an inference from uploaded
> text, not an observation. Trust the live `V:\monorepo` tree over any such claim.

---

## A) Tauri v2 apps

Four real Tauri v2 apps plus one smoke fixture. All use a React 19 + TypeScript 5.9
frontend with a Rust/Tauri v2 shell, bundled for Windows via NSIS (and MSI for
vibe-justice). Vite 7 is the frontend bundler in every case.

### nova-agent — "NOVA Agent" AI assistant

- **Purpose**: Neural Omnipresent Virtual Assistant — a personalized desktop AI agent
  with episodic/semantic memory, RAG, and project management. Package `nova-agent`
  v1.3.0; identifier `com.nova.agent`.
- **Framework + versions**: Tauri v2 (Rust crate `tauri = "2.10.3"`, `tauri-build = "2.5.6"`,
  rust-version 1.70). Frontend React 19.2.4 / React-DOM 19.2.4, `@tauri-apps/api` 2.10.1,
  `@tauri-apps/cli` 2.10.1, Vite 7, TypeScript 5.9.3.
- **Key deps**: `@lancedb/lancedb` (vector store), `better-sqlite3` 12.6.2, full Radix UI
  set, `@tanstack/react-query`, `@vibetech/openrouter-client`, `@vibetech/inngest-client`,
  `@vibetech/core`, `@vibetech/shared-ipc`, `@vibetech/ui` (workspace packages),
  Tauri plugins fs/shell/store, Inngest for background RAG jobs. Rust side uses
  `rusqlite` (bundled), `tokio`, `reqwest`, `tokio-tungstenite`.
- **Dev / build**: `pnpm dev` (`tauri dev --config src-tauri/tauri.dev.conf.json`),
  `pnpm build` (`tauri build`); frontend-only build via `pnpm build:frontend`.
  Tauri devUrl `http://localhost:5173`; the Node server side runs on port 3000
  (per the port registry).
- **Data location (D:\)**: activity DB `D:\databases\nova_activity.db` (WAL mode;
  the migration docs also reference a `D:\databases\nova_agent\` subfolder variant).
  RAG/vector data uses LanceDB under `D:\nova-agent-data\lance-db\`. Connections go
  through `DATABASE_PATH`.
- **Verifiable current state**: Active Tauri v2 app, version 1.3.0; CSP allowlists
  OpenRouter, DeepSeek, Groq, Moonshot, and local Ollama (`localhost:11434`).

### vibe-code-studio — "Vibe Code Studio" AI code editor

- **Purpose**: AI-powered code editor (Monaco-based, "Cursor alternative") with an
  integrated terminal and AI assistance. Package `vibe-code-studio` v1.2.0; identifier
  `com.vibetech.vibe-code-studio`.
- **Framework + versions**: Tauri v2 (Rust crate `tauri = "2"`, lib `vibe_code_studio_lib`).
  Frontend React 19.2.4, `@tauri-apps/api` ^2, `@tauri-apps/cli` ^2.10.1, Vite 7,
  TypeScript 5.9.3.
- **Key deps**: `@monaco-editor/react` + `monaco-editor` 0.55.1, `@xterm/xterm` 6 with
  fit/web-links addons, `@modelcontextprotocol/sdk` ^1.27.0, `monacopilot`, Yjs +
  y-monaco + y-websocket (collaborative editing), `react-force-graph`, `zustand`,
  `better-sqlite3` 12.6.2, Stripe, and workspace packages `@vibetech/auth`, `billing`,
  `entitlements`, `landing`, `feature-flags-sdk-node`, `shared-ipc`, `core`, `types`.
  Tauri plugins shell/dialog/fs/os/store/window-state.
- **Dev / build**: `pnpm dev` (Vite) for web; `pnpm tauri:dev` / `pnpm tauri:build`
  (wrapped by `scripts/run-tauri.cjs`) for the desktop shell. Tauri devUrl
  `http://localhost:5174`. NSIS install mode `currentUser`.
- **Data location (D:\)**: SQLite at `D:\databases\vibe_studio.db` (the Rust `db.rs`,
  the backend server, and `DatabaseService.ts` all target this path; docs also reference
  a `D:\databases\vibe-code-studio\` subfolder variant). App data folder convention
  `D:\data\vibe-code-studio`. Path overridable via `VITE_DATABASE_PATH`.
- **Verifiable current state**: Active Tauri v2 app, version 1.2.0; CSP allows
  OpenRouter, Anthropic, OpenAI, DeepSeek, Groq, Moonshot, GitHub, and Google
  generative APIs.

### vibe-justice — "Vibe-Justice" legal assistant (Tauri frontend + Python FastAPI sidecar)

- **Purpose**: Desktop legal document analysis assistant. Package
  `@vibetech/vibe-justice` v0.0.1 at the workspace root; the actual app lives under
  `apps/vibe-justice/frontend` (Tauri) and `apps/vibe-justice/backend` (Python). Tauri
  productName "Vibe-Justice", identifier `com.vibetech.vibe-justice` v1.0.0.
- **Architecture**: Tauri v2 React 19 + TypeScript frontend talking to a **FastAPI +
  Python 3.13 backend sidecar**. The backend ships as a PyInstaller-built binary
  declared in `tauri.conf.json` as `externalBin: ["binaries/backend"]` (built by
  `build_v8_final.ps1`, spec `native.spec`). All frontend network calls route through
  `frontend/src/services/httpClient.ts`; backend is rate-limited via `slowapi`.
- **Framework + versions**: Tauri v2 (Rust crate `tauri = "2"`, lib `vibe_justice_lib`,
  `tauri-plugin-dialog = "2.6"`, `reqwest = "0.12"`). Frontend devUrl
  `http://localhost:5175`. Bundle targets MSI **and** NSIS.
- **Backend env vars**: `DATABASE_PATH` (SQLite; `:memory:` in tests),
  `VIBE_JUSTICE_ENV` (development/test/production), `VIBE_JUSTICE_ALLOWED_ORIGINS`
  (CORS allowlist). Database path must come from env — never hardcoded.
- **Data location (D:\)**: SQLite `D:\databases\vibe_justice.db`; per-app data dir
  `D:\data\vibe-justice`; logs `D:\logs\vibe-justice` (resolved in
  `backend/vibe_justice/utils/paths.py`).
- **Nx targets / CI**: `vibe-justice:lint|typecheck|test:frontend|build:frontend`,
  `:test:backend` (pytest, 60% coverage floor), `:backend:build` (PyInstaller),
  `:tauri:dev|tauri:build`, `:e2e` (Playwright), `:backend:migrate*` (Alembic).
  CI `.github/workflows/vibe-justice.yml` runs a frontend job (lint→typecheck→Vitest→build)
  and a backend job (pytest, coverage floor 60%).
- **Verifiable current state**: Active Tauri v2 app, version 1.0.0, with a working
  PyInstaller FastAPI sidecar pipeline.

### vibe-tutor — "Vibe Tutor" AI homework assistant (Electron desktop + Android via Capacitor)

- **Purpose**: AI-powered homework manager for students. Package `vibe-tutor` v1.5.12.
- **Important framing**: vibe-tutor is **NOT a Tauri app**. Its primary target is the
  **Google Play Store (Android) via Capacitor 7/8**; it also ships a **personal-use
  Electron desktop build** (`electron` ^35.7.5, `electron-builder`, appId
  `com.vibetech.vibetutor`, NSIS x64). It is listed in this section because it is one of
  the project's Windows desktop deliverables, but its desktop shell is Electron, not Tauri.
- **Framework + versions**: React 19.2.4 + Vite 7 + TypeScript 5.9.3. Mobile:
  `@capacitor/core`/`android`/`cli` ^8.3.0, `@capacitor-community/sqlite`,
  `@capacitor/filesystem`. Desktop: Electron 35.7.5, `electron-store`.
- **Key deps**: `@electron/llm` (on-device AI; desktop/Chrome-only by design — Android
  intentionally degrades to no local AI backend), `@google/genai`, `@vibetech/openrouter-client`,
  `@vibetech/avatars`, `@vibetech/games`, `better-sqlite3` 12.6.2 (desktop), Express
  render backend.
- **Dev / build**: web `pnpm dev` (Vite); desktop `pnpm dev:app` (Vite + tsc + Electron),
  `pnpm build:desktop` (electron-builder --win); Android `pnpm android:full-build` /
  `android:full-release` (Gradle via `scripts/run-gradle.cjs`).
- **Android WebView rules (recurring)**: use `androidScheme: 'http'` + `cleartext: true`
  (https causes a blank screen), use `CapacitorHttp.request()` explicitly (not patched
  `fetch`), and increment `versionCode` per build.

### factory-tauri-smoke — Tauri smoke fixture (not a real product)

- **Purpose**: An app-factory smoke/test fixture verifying that a generated Tauri v2 +
  React shell builds and packages. Package `factory-tauri-smoke` v0.1.0; productName
  "FactoryTauriSmoke", identifier `com.vibetech.factory-tauri-smoke`. One of the 6
  app-factory fixtures, not a shipped application.
- **Framework + versions**: Tauri v2 pinned to `tauri = "=2.11.1"` (CLI 2.11.1,
  `@tauri-apps/api` 2.11.0), React 19.2.4, Vite 7, TypeScript 5.9.3, dep
  `@vibetech/billing`.
- **Dev / build**: `pnpm dev:web` (Vite on `127.0.0.1:4310`), `pnpm build`,
  `pnpm package` (`pnpm tauri build`), `pnpm package:check`. Tauri devUrl
  `http://127.0.0.1:4310`. No app-specific D:\ data.

---

## B) Electron app — vibetech-command-center

- **Identity**: Package `@vibetech/command-center` v0.1.0, productName
  "Vibe-Tech Command Center", appId `com.vibetech.command-center`.
  **Formerly called "VTDE"** — when older docs reference "VTDE" they mean this Electron
  app, not a Tauri desktop shell.
- **Purpose**: The monorepo operations control plane — a dashboard for diagnostics,
  process/app monitoring, DB metrics, Nx graph, RAG search, and a **Claude Code bridge**.
  It also hosts a standalone **MCP server** (registered in `V:\monorepo\.mcp.json` as
  `command-center`) exposing dashboard tools (overview, list-apps, health-check,
  invoke-claude, search-rag, db-metrics, backups, etc.).
- **Framework + versions**: Electron 33 (`electron` ^33.2.1) + `electron-vite` ^4.0.1,
  `electron-builder` ^25.1.8. React 19.2.4, TypeScript 5.9.3 strict, Tailwind +
  shadcn/ui, Zustand state, TanStack Query.
- **Key deps**: `@modelcontextprotocol/sdk`, `better-sqlite3` ^11.7.0 (read-only access
  to external DBs), `chokidar` v4 (file watching), `ws` (WebSocket/IPC bridge),
  `zustand`, `lucide-react`. Native modules rebuilt via `@electron/rebuild`.
- **Dev / build**: `pnpm dev` (electron-vite hot reload), `pnpm build`
  (`electron-vite build` + `build:mcp`), `pnpm package` (rebuild native → build →
  `electron-builder --win --x64`, producing
  `release\Vibe-Tech Command Center-Setup-${version}.exe`), MCP server via
  `pnpm mcp:start`. Tests: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright Electron).
  Dev ports: per the app's invariants UI dev 5180 / IPC-WS 3210 (the central port
  registry lists 5177 for the Command Center dev server); MCP server is stdio. App keeps
  running in the system tray after window close.
- **Data location (D:\)**: read-only consumer of external SQLite DBs at
  `D:\databases\*.db` and `D:\learning-system\*.db`, plus LanceDB RAG at
  `D:\nova-agent-data\lance-db\`. It never writes to those DBs. Manual zip backups go to
  `V:\monorepo\_backups\`.
- **Verifiable current state**: Shipped beta (post-Chunk 8). Electron only — explicitly
  no Next.js, no Tauri shell. This is the one and only app the legacy "VTDE" name refers to.
