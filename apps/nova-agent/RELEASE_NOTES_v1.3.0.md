# NOVA Agent v1.3.0 — Release Notes

**Release date:** 2026-04-18
**Previous release:** v1.1.0 (2026-01-27)
**Platform:** Windows x64 (MSI + NSIS installers)

---

## Highlights

- RAG pipeline migrated from ChromaDB to in-process **LanceDB**, eliminating the external service dependency.
- New two-stage retrieval with HyDE query expansion and a cross-encoder reranker.
- **GravityClaw** integration wired end-to-end: CSP-compliant voice I/O, task approval flow, retry + persistence.
- Memory Architecture Unification completed across all six phases (shared with `memory-mcp`).
- Windows build reliability + memory-use fixes.
- Jan 31 dashboard CSS regression fixed, with regression guards now in place.

## RAG & Memory

- `feat(nova-agent): add TypeScript LanceDB RAG pipeline (indexer, retriever, reranker, cache)` — replaces ChromaDB entirely, in-process and Windows-friendly.
- `feat(nova-agent/rag): Phase 5 — two-stage retrieval, HyDE, cross-encoder reranker` — retrieval quality bump.
- `fix(nova-agent): replace RecordBatchIterator with Vec for lancedb 0.27 Scannable API` — compatibility with lancedb 0.27.1.
- `chore(nova-agent): bump lancedb 0.26.2 → 0.27.1 to align with Node SDK`.
- `fix(nova-agent): pin arrow to 57.2.0 to avoid broken serde_core in 57.3`.
- `test(nova-agent): add RAG smoke test and enable withGlobalTauri` — covers the indexer → retriever → reranker path.
- `feat(memory): complete Memory Architecture Unification (all 6 phases)` — shared layer now used here and by `memory-mcp`.

## GravityClaw / Voice / Task Approval

- `feat(nova-agent): integrate GravityClaw backend, voice I/O, and task approval`.
- `fix(nova-agent): type alignment, task executor model, polling race, timestamp uniqueness`.
- `feat(nova-agent): complete GravityClaw integration — CSP, voice retry, persistence, tests`.

## UI / CSS

- **Fixed** — Jan 31 dashboard regression caused by double-escaped responsive selectors (`.lg\\:grid-cols-4` → `.lg\:grid-cols-4`). Root cause + timeline in `POST-MORTEM-2026-01-31.md`.
- **Added** — Stylelint config (`.stylelintrc.json`) with `lint:css` and `lint:css:fix` scripts. Stylelint now also runs on staged CSS via lint-staged.
- **Added** — Playwright visual regression tests (`e2e/visual.spec.ts`) covering the dashboard at mobile (375), md (768), and lg (1280) viewports, plus a direct CSS probe that asserts `lg:grid-cols-4` resolves to 4 tracks.
- **Added** — Husky `pre-commit` hook that runs `lint-staged` + `lint:css` before every commit.
- **Added** — `.github/workflows/nova-agent-visual.yml` — path-filtered CI job that runs Stylelint and the visual regression suite whenever nova-agent CSS, TSX, Tailwind config, or tests change.
- `refactor(nova-agent): remove particle-network UI, update RAG pipeline`.

## Build & Windows Reliability

- `fix(nova-agent): use direct node tauri.js invocation for Windows reliability` — fixes flaky Tauri CLI resolution on Windows.
- `build(nova-agent): codegen-units=1 to reduce peak LLVM memory during release` — addresses OOM during Rust release builds.
- `chore(build): nova-agent memory optimization + pnpm-lock for command-center`.
- `chore(nova-agent): move build-time deps to devDependencies`.

## Type Safety & Cleanup

- `fix(quality): zero lint warnings + type cleanup in nova-agent and vibe-code-studio`.
- `refactor(nova-agent): replace :any with proper types in source files`.
- `fix(nova-agent): repoint @nova/core and @nova/types imports to @vibetech/vibetech-shared` — aligns with monorepo shared package.

## Security

- HTTP mobile bridge remains bound to **127.0.0.1:3000** only. To enable network access, edit `src-tauri/src/main.rs:243` and add authentication first. (Unchanged from v1.1.0 baseline.)
- CSP hardened as part of GravityClaw voice integration.

## Data Storage

- Databases remain under `D:\databases\` (monorepo D:\ policy). Auto-migration and WAL mode unchanged.

## Known Non-Blockers

- Frontend `assets/three-*.js` chunk still ~1.3 MB. Code-splitting three.js via dynamic `import()` is a good follow-up but not required to ship.
- The stub `prediction_engine.rs` remains disabled in `main.rs`. Working prediction logic lives in `guidance_engine.rs`. Cleanup is cosmetic.

## Test Results (target to reproduce on release build)

| Suite | Expected |
|-------|----------|
| `pnpm --filter nova-agent run test` (Vitest) | 79 passed, 1 skipped |
| `pnpm --filter nova-agent run lint:css` | 0 errors |
| `pnpm --filter nova-agent run test:visual` | 4 passed (mobile/md/lg screenshots + CSS probe) |
| `cargo test` in `src-tauri/` | passes |

## Installers

Built by `pnpm --filter nova-agent run build` (Tauri):

- `src-tauri\target\release\bundle\msi\NOVA Agent_1.3.0_x64_en-US.msi`
- `src-tauri\target\release\bundle\nsis\NOVA Agent_1.3.0_x64-setup.exe`

## Upgrade Notes

- No database schema migration required from v1.1.0 → v1.3.0 at the app level; existing data under `D:\databases\nova-agent.db` remains valid. The LanceDB indexes live separately.
- If coming from a ChromaDB-era install, delete the old ChromaDB cache directory (if present) after upgrade; nothing references it anymore.
