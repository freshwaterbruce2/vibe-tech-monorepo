# Vibe Justice Finish Findings

## 2026-08-16 baseline discovery

- Canonical remote: `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`.
- Fresh checkout HEAD: `db33d791459061ca28789ee6011cb08054e36f3c` on `main`.
- Finish branch: `codex/vibe-justice-finish-20260816`.
- Host Node is `v24.19.0`, satisfying the repository's Node 22+ range.
- Host pnpm is `9.15.0`, below the pinned `10.33.0` contract.
- `corepack pnpm` resolves the repository-pinned pnpm `10.33.0`; an older standalone
  pnpm shim precedes Corepack on PATH, so Phase 0 commands will explicitly use Corepack.
- Host Python command resolves to CPython `3.11.15`; Python launcher also lists 3.14.
- Rust is stable `1.95.0` with Cargo `1.95.0`.
- `apps/vibe-justice/project.json` exposes all seven requested baseline Nx targets.
- Backend tests run through `apps/vibe-justice/backend/run-pytest.ps1` and expect `.venv`.
- The backend README explicitly supports Python 3.11-3.13 and a requirements-based `.venv`.
- The existing React frontend plus FastAPI backend can support private localhost web
  operation, but web success cannot prove installer or Tauri sidecar acceptance.
- Repository instructions require Nx-mediated gates and specialist delegation for complex changes.
- Existing `C:\Users\fresh\vibe-development` is not a usable Git checkout; its `.git`
  directory contains only `HEAD`.
- The root install would cover 106 projects and 5,241 packages. The user explicitly
  rejected whole-monorepo setup; use a filtered Vibe Justice install instead.
- A normal pnpm `--filter vibe-justice-frontend...` install is still unsuitable:
  the repository's hoisted linker attempts to materialize all 5,241 lockfile packages.
- The frontend declares `@vibetech/core` but does not import it anywhere in source.
  Its scripts also hardcode root `node_modules` paths, preventing a clean standalone install.
- A viable app-only direction is to remove the unused workspace dependency, use local
  package binaries, and install the frontend with pnpm `--ignore-workspace`; this needs
  verification against CI/Nx before implementation.
- App-local backend baseline on Python 3.11.15: 185 passed, 1 expected xfail in 6.08s;
  coverage 63.10% exceeded the configured 55% floor. This is test evidence only.
- Existing baseline tests explicitly encode unauthenticated chat behavior, confirming
  that green legacy tests do not satisfy the new all-non-health authentication contract.
- Isolated frontend install succeeds with 505 packages after removing unused workspace
  coupling and adding an app-local lockfile. It no longer requires root Nx/node_modules.
- Frontend lint, typecheck, 427 tests (plus 1 todo), and production build pass.
- The first build exposed a missing direct `@tailwindcss/postcss` declaration; adding it
  removed accidental root-node_modules resolution and the retry built 1,949 modules.
- Playwright was targeting port 5173 while Vite owns 5175 and reused an unrelated Vibe
  Assistant server. Both are now fixed to loopback `127.0.0.1:5175`, reuse is disabled,
  and workers are capped at one. The browser settings E2E passes in 5.7 seconds.
- Case-creation E2E remains red by design: the test describes a required feature that
  does not exist yet. This is a Phase 2 product gap, not a test to weaken.
- Phase 1A backend verification after security changes: 190 passed, 1 expected xfail,
  63.58% coverage. Every non-health route is authenticated; `/api/health` stays public.

## 2026-08-16 durable case slice

- Case creation now publishes from a unique staging directory with atomic metadata
  writes and an exclusive sibling lock. Duplicate IDs return 409 without overwrite;
  failed creation removes only its own staging tree.
- The backend exposes validated create/list/get/current/archive/restore contracts.
  Current case is persisted in app data, survives a fresh client/backend restart, is
  cleared on archive, and is not silently selected on restore.
- The frontend restores authoritative current state from the backend, provides an
  accessible create dialog, keyboard case selection, `aria-current`, and a visible
  Current marker. Chat/evidence are intentionally not case-scoped in this slice.
- Backend verification: 203 passed, 1 expected xfail, 67.33% coverage.
- Frontend verification: 431 passed, 1 todo; lint, typecheck, and production build pass.
- Serialized loopback Playwright acceptance uses a unique exact-run `%TEMP%` root,
  one worker, and a test-only key. Both settings and full create -> reload -> archive ->
  restore -> reselect flows pass; no provider was called and no real case data was used.

## 2026-08-21 Windows completion reconciliation

- Fresh app-local baseline passes: backend 234 passed plus 1 expected xfail at 75.14%
  coverage; frontend lint/typecheck, 401 tests plus 1 todo, production build, and 3
  serialized Playwright flows pass. Browser E2E is synthetic and does not prove Tauri.
- The relational database now defaults to `VIBE_JUSTICE_DATA_DIR/vibe_justice.sqlite3`;
  explicit `DATABASE_PATH` remains the highest-priority compatibility override.
- Alembic revisions are frozen, startup upgrades before serving, SQLite enables WAL,
  foreign keys, and bounded busy timeout, and an adjacent-file lock serializes
  cross-process upgrades. Synthetic tests cover blank, legacy, same-path replacement,
  failure/retry, and concurrent upgrade cases.
- Providerless production startup is valid. A strong internal API key remains required;
  optional OpenRouter credentials are validated only when configured.
- Tauri now generates an in-memory per-launch internal key and instance UUID, starts the
  sidecar with explicit production/loopback/app-data settings, and accepts readiness
  only from authenticated `/api/ready` with the expected PID and instance UUID.
- Lifecycle state is generation-owned: concurrent starts are rejected, stale termination
  events cannot clear a newer child, and stop during startup invalidates/kills the child.
- Renderer capabilities no longer expose shell, recursive app data, D-drive, database,
  or directory access. Only dialog-selected file read/write remains.
- Direct browser OpenRouter calls are quarantined and tested to perform no fetch. This
  is a temporary fail-closed boundary until the explicit consent milestone.
- Native Rust compilation/tests and the Tauri installer are Blocked because MSVC
  `link.exe` is unavailable. Source review, Rust formatting, and Cargo metadata pass;
  no sidecar/installer or physical desktop lifecycle has been proven.

## 2026-08-20 personal eviction guide planning

- User goal is active guidance, not a passive document connector: show what to do
  next, why it matters, what date/status is verified, and which evidence supports it.
- Current OpenAI documentation now presents Apps SDK concepts under Plugins. The
  standard MCP Apps contract remains: data tools return concise `structuredContent`;
  only render tools attach `_meta.ui.resourceUri`; UI resources use
  `text/html;profile=mcp-app`; the widget receives `ui/notifications/tool-result` and
  uses `tools/call` for repeated interactions.
- Chosen archetype is `interactive-decoupled`: read-only case/guidance tools plus one
  long-lived React guide widget. This is not a company-knowledge connector, so custom
  case-scoped tools are preferable to pretending local evidence URLs satisfy public
  `search`/`fetch` citation requirements.
- The existing backend already owns case identity, immutable evidence, local retrieval,
  legal packs, cautious issue findings, citations, missing facts, and safe next steps.
  Phase 5A should compose those contracts, not create a parallel legal-analysis engine.
- The repository has unrelated dirty work under other apps and the root lockfile.
  Phase 5A must not stage, rewrite, clean, or otherwise touch those files.
- `chatgpt-app/` does not exist and MCP Apps dependencies are not installed locally.
  Any dependency setup must remain isolated to the new app-local package.
- The current case model does not establish eviction posture. It lacks structured paper
  type, court/case number, service or receipt event, hearing date, and counting-rule
  facts. `evidence_date` is provenance metadata, not a verified service event.
- The installed South Carolina pack is integrity/source checked but
  `not_approved_for_matching`, retains historical-effective-date uncertainty, and does
  not yet cover the complete eviction filing/service/response/hearing procedure. Any
  deadline must currently be `not_calculable` with a null date.
- The guide must summarize existing issue runs only. `POST .../issues/analyze` and
  disposition are writes. Legacy date extraction, violation detection, global
  retrieval, provider document analysis, and legal-cache paths do not satisfy this
  slice's case/citation contract and are excluded.
- Some service constructors can initialize schema, indexes, or the bundled pack. That
  bootstrap behavior must be separated from the guidance query path before the MCP
  tools can truthfully claim retry-safe, logical read-only behavior.
- Synthetic mode must not instantiate the real backend client or read the case root.
  Real-case ChatGPT use is a later data-egress/auth decision; the current backend API
  key must never enter the widget, model-visible result, or `_meta`.
- The compact widget should separate urgency from verification, display candidate-rule
  approval separately from authority approval, and never repeat the desktop claim that
  data stays on-device once data is sent through ChatGPT.

## 2026-08-16 Phase 2B evidence-import audit

- The existing evidence surface is not case-scoped: `api/evidence.py` uses a global
  `EvidenceService`, treats the filename as the evidence identifier, and retains
  indexing/deletion routes that belong outside this slice.
- Additional upload implementations exist in document analysis, batch processing,
  and search. Phase 2B must establish one canonical case-scoped import service rather
  than duplicating their validation logic; unrelated legacy routes remain compatibility
  surfaces and are not evidence-acceptance proof.
- `EvidenceBoard.tsx` still hardcodes `CASE-2024-001` for upload/export/analysis and
  displays demo evidence. The Phase 2A backend-restored current case must be passed into
  the evidence surface instead.
- Existing app-local dependencies already include SQLModel, pypdf, python-docx, and
  Pillow. Upstream review confirms SQLModel is MIT licensed, pypdf uses the permissive
  BSD 3-Clause license, and `filetype` 1.2.0 is the current PyPI release (2022-11-02)
  under MIT. If used, pin `filetype==1.2.0`; do not copy signature tables.
- Paperless-ngx remains architecture reference only. No GPL source may be copied or
  translated into this ISC-licensed application.
- User direction supersedes the continuation prompt's push step: retain local Git
  checkpoints, but do not connect, push, publish, or open a pull request on GitHub.
- Phase 2B now uses durable SQLModel evidence and extraction-attempt records, generated
  case-contained storage names, bounded streaming SHA-256, parser/signature validation,
  immutable originals, duplicate-content provenance links, and authenticated case-
  constrained list/get/download/text/retry routes.
- Failure injection exposed and then corrected a cross-resource publish gap. A failed
  pre-publish rename removes only the request row/staging/generated empty directory;
  a post-publish finalization failure retains an explicit staged record for startup
  reconciliation, so an original is not orphaned.
- Focused adversarial coverage now includes the exact configured size boundary,
  encrypted PDF preservation/status, DOCX traversal/entry/expanded-size/compression
  defenses, and atomic-publish cleanup without damage to pre-existing evidence.
- The frontend Evidence tab is gated by the authoritative current case and shows
  provenance, MIME/type, size, SHA-256, import time, truthful extraction status, and
  retry without claiming analysis, indexing, or citation.
- Phase 2B was initially Partial because the dedicated restart-aware Playwright flow was
  missing; that gap is now closed by the physical acceptance result recorded below.

## 2026-08-16 Phase 3A retrieval and citation result

- The new case workflow does not use the legacy global Chroma collections, proxy
  embeddings, hash-vector fallback, legal cache, or keyword violation detector.
- `EvidenceChunk` records are tied to case, evidence, extraction attempt, exact derived-
  text SHA-256, ordinal, and source locator. Indexing is deterministic and idempotent.
- Extraction attempts now store the derivative SHA-256 at creation. A narrow additive
  SQLite migration adds the column to existing databases; legacy attempts without a
  trusted digest must be re-extracted before indexing.
- Direct and pre-index derivative tampering fail closed. Missing, stale, empty, or
  whitespace-only derivatives never produce citation text.
- PDF indexing reconstructs page spans from the immutable original, verifies exact
  equality with the derivative, and distinguishes identical passages on different pages.
- Offline lexical search is bounded and case-filtered before ranking. Results expose
  exact quotes, matched terms, evidence identity, page/paragraph/character locators,
  extraction attempt, and text hash without making legal conclusions.
- Independent review found and closed cross-case and same-case asynchronous UI races.
  Late loads, searches, indexes, retries, and downloads cannot overwrite a newer case
  or query state.
- Serialized Playwright acceptance now proves import -> index -> search -> reload ->
  search -> changed backend PID -> search using one exact synthetic data root.
