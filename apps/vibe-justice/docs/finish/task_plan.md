# Vibe Justice Finish Execution Plan

## Objective

Finish `apps/vibe-justice` as a dependable, private, single-user Windows desktop
paralegal, using the user-supplied 2026-08-16 finish plan as the product and
acceptance contract.

## Constraints

- Production base is this React/Tauri/FastAPI app; `Vibe-Paralegal` is reference only.
- Core behavior is matter-agnostic. Walmart and landlord records are acceptance cases.
- Preserve originals and never send, file, message, or contact anyone autonomously.
- Privacy, matter isolation, provenance, citations, valid exports, and recoverability are gates.
- Work one bounded vertical slice at a time and record confirmed/partial/blocked/untested status.
- Pre-change source truth is `main` commit `db33d791459061ca28789ee6011cb08054e36f3c`.
- Working branch is `codex/vibe-justice-finish-20260816`.

## Checklist

### Phase 0 - Reproducible baseline

- [x] Create a complete canonical checkout and dedicated finish branch.
- [x] Preserve the untouched main commit as a recoverable pre-change reference.
- [x] Align Node, pnpm 10.33.0, Python 3.11-3.13, and Rust stable.
- [x] Install only Vibe Justice frontend dependencies; do not require root Nx tooling.
- [x] Create and install the Vibe Justice backend virtual environment.
- [ ] Run and record lint, typecheck, frontend tests, backend tests, frontend build, E2E, and Tauri build. (All app-local gates pass; native Tauri compile/build is blocked by missing MSVC `link.exe`.)
- [x] Reconcile stale test/config mismatches, including Electron assumptions in Tauri E2E.

### Phase 1A - Launch, authentication, and canonical storage

- [x] Bind production backend to loopback and reject unsafe binding by default.
- [x] Authenticate every non-health API route.
- [ ] Align launcher probing and prove one sidecar lifecycle. (Authenticated `/api/ready` PID/instance readiness and generation-safe lifecycle are implemented; Rust execution and physical sidecar proof are blocked by missing MSVC `link.exe`.)
- [x] Fail closed on unsafe or missing production configuration.
- [x] Define one canonical application-data root and relational database ownership.
- [x] Establish frozen additive Alembic migrations with blank, legacy, replacement,
  failure/retry, and concurrent-upgrade tests.
- [x] Add bounded, signature-validated evidence uploads and safe filename handling.
- [ ] Add explicit provider/model/outbound-data consent with local-only mode.

### Remaining phases

### Phase 2A - Durable case identity and selection

- [x] Create a valid synthetic case without overwriting an existing case ID.
- [x] Open/select a case through an accessible current-case UI.
- [x] Persist current-case selection in app data and restore it after reload/restart.
- [x] Archive the current case safely, then restore it without silently reselecting it.
- [x] Prove the flow with temporary backend data and a serialized localhost E2E.

### Later phases

- [x] Phase 2B: case-scoped evidence provenance and durable reopening.
- [x] Phase 3: case-scoped retrieval and navigable citations. Detailed execution plan:
  `evidence-legal-issue-matching-plan.md` Slice 3A.
- [x] Phase 4: jurisdiction-aware, versioned legal knowledge packs and evidence-to-
  element potential-issue matching. Detailed execution plan:
  `evidence-legal-issue-matching-plan.md` Slices 4A-4C.
- [ ] Phase 5: universal personal-paralegal workflows.
- [ ] Phase 6: editable drafts and genuine DOCX/PDF export.
- [ ] Phase 7: Walmart working-copy acceptance.
- [ ] Phase 8: non-destructive landlord-workspace import and acceptance.
- [ ] Phase 9: backup, restore, packaging, and final physical acceptance.

### Phase 5A - Personal eviction guide in ChatGPT

Objective: make Vibe Justice guide one authenticated user through a residential
tenant/eviction matter with a compact "what next, why, by when, and based on what"
view. This is a private personal-paralegal aid, not autonomous legal representation.

Operating boundary:

- Coding/product track: source, schemas, synthetic fixtures, tests, local MCP transport,
  and widget behavior live only in this repository.
- Personal legal/business track: real notices, court papers, dates, evidence, legal
  research conclusions, strategy, drafting, filing, and communications remain in the
  separate case workspace and its legal-business skills. This build phase does not
  import, summarize, transmit, or act on that material.

Research result: the current backend has case-scoped evidence, exact citations,
versioned authority snapshots, and cautious potential-issue findings, but it does not
have verified eviction-paper type, court/posture, service/receipt event, hearing date,
or controlling counting-rule facts. The current legal pack also lacks a complete
eviction procedure source set. Therefore this slice guides verification and evidence
preservation; it does not calculate a court deadline.

#### 5A0 - Research and contract freeze (complete)

- [x] Review current case, evidence, retrieval, legal-pack, and issue contracts without
  accessing real case evidence.
- [x] Review current official OpenAI MCP server, UI, tool-planning, examples, metadata,
  authentication, security/privacy, and inline-card accessibility guidance.
- [x] Select a private `interactive-decoupled` archetype: two data tools, one render
  tool, one compact React widget, synthetic mode by default.
- [x] Freeze non-goals, privacy gates, exact candidate files, and synthetic acceptance.

#### 5A1 - Pure read-only backend guidance snapshot

- [ ] Add `GET /api/cases/{case_id}/guidance/tenant-eviction` using a new response-only
  API module and guidance service. Reuse explicit case identity, evidence readiness,
  existing issue-run/findings, and legal-pack provenance; never invoke analysis,
  disposition, extraction, indexing, providers, legacy violation detection, or legacy
  global retrieval.
- [ ] Return a deterministic `snapshot_id`, case/matter compatibility, evidence
  readiness, posture verification, bounded existing findings, authority freshness,
  missing procedural facts, warnings, and ordered steps. Every step must expose
  `what`, `why`, `by_when`, and exact `basis` references.
- [ ] Keep deadline status `not_calculable` and date `null` until a later slice can
  prove an integrity-verified trigger event plus a compatible, current, pinpoint
  counting rule and effective-date applicability.
- [ ] Make reads logically pure. Move or isolate any service-constructor bootstrap
  writes before advertising MCP tools as read-only; repeated unchanged GETs must not
  create issue runs/findings/dispositions/extractions/chunks or rewrite originals.
- [ ] Candidate files: new `backend/vibe_justice/services/guidance_service.py`, new
  `backend/vibe_justice/api/guidance.py`, new focused guidance tests, and only the
  authenticated router registration in `backend/main.py`. No database migration or
  evidence/issue/legal model change.

#### 5A2 - Isolated synthetic MCP app

- [ ] Create an app-local `chatgpt-app/` package with its own dependency boundary and
  lockfile. Bind only to `127.0.0.1`; expose Streamable HTTP `/mcp`; do not modify or
  consume the existing desktop frontend bundle.
- [ ] Default to `VIBE_JUSTICE_GUIDE_MODE=synthetic` and accept only the clearly fake
  fixture case `SYNTH-SC-TENANT-001`. In this mode, do not instantiate a real backend
  adapter or read the case-data root. Reject every other case with a bounded
  `REAL_CASE_ACCESS_DISABLED` error.
- [ ] Register exactly three tools: `get_eviction_guidance`, `get_cited_issue`, and
  `render_eviction_guide`. All use strict schemas and truthful annotations
  (`readOnlyHint:true`, `destructiveHint:false`, `openWorldHint:false`,
  `idempotentHint:true`). Only the render tool attaches
  `ui://vibe-justice/eviction-guide-v1.html`.
- [ ] Return concise schema-valid `structuredContent`; keep secrets, API keys, absolute
  paths, and unauthorized data out of `content`, `structuredContent`, and `_meta`.
  Bundle widget assets with exact CSP and `text/html;profile=mcp-app`.
- [ ] Candidate server files: `chatgpt-app/package.json`, app-local lock/config files,
  `server/src/config.ts`, `schemas.ts`, `synthetic-adapter.ts`, a hard-disabled
  `backend-adapter.ts`, `tools.ts`, `widget-resource.ts`, `mcp-server.ts`, and `http.ts`.

#### 5A3 - Compact accessible guidance widget

- [ ] Build one inline React card with a visible Synthetic Demo banner, unambiguous
  posture status, at most three next steps, at most three evidence questions, at most
  two cautious potential issues, exact citations on disclosure, authority freshness,
  and a persistent legal/deadline verification warning.
- [ ] Keep urgency separate from verification: an item may require urgent attention
  while remaining provisional or blocked by missing facts. Never use color alone.
- [ ] Use MCP Apps `ui/notifications/tool-result`, `tools/call`, and `ui/message` as the
  baseline. Treat `window.openai` as optional. The widget may refresh or expand one
  cited issue but cannot upload, mutate, draft, send, file, contact, or calculate.
- [ ] Validate every incoming snapshot, ignore stale/wrong-case results, preserve only
  ephemeral presentation state, render untrusted evidence as inert text, and provide a
  clearly labeled standalone synthetic adapter with no browser-side backend/API-key
  fetch.
- [ ] Candidate widget files: `web/index.html`, `web/src/main.tsx`,
  `EvictionGuide.tsx`, `bridge.ts`, `types.ts`, and `styles.css`; keep the synthetic
  JSON fixture and server/widget tests inside `chatgpt-app/`.

#### 5A4 - Synthetic verification and acceptance

- [ ] Backend tests: authentication; case isolation; missing/archived/jurisdiction
  cases; evidence/authority integrity failure; existing findings only; deterministic
  snapshots; bounded payloads; no writes/provider/network calls; unchanged originals
  and database row counts; no deadline date without all verified prerequisites.
- [ ] MCP tests: exact tool list, schemas, descriptions, annotations, resource URI,
  MIME/CSP, data/render split, stable retries, stale render rejection, synthetic-only
  rejection, and absence of credentials, paths, real names, or unrelated case IDs.
- [ ] Widget tests: all status/citation/warning states, cautious labels, conflicting
  evidence visibility, inert hostile text, bridge refresh/detail, out-of-order result
  rejection, stale fallback, keyboard use, semantic roles, live announcements, visible
  focus, text resize, and no nested scroll.
- [ ] Run focused backend tests, full backend acceptance, app-local typecheck/tests/
  build, local `/mcp` initialize/list/call smoke, then serialized synthetic browser
  acceptance. Report ChatGPT host connection, OAuth, tunnel, real-case data, hosting,
  deployment, and public submission as Untested/out of scope.

#### Later separate slice - verified eviction procedure and dates

- [ ] Build and independently review a versioned primary-source South Carolina
  eviction-procedure pack covering filing, service, response, hearing, judgment,
  appeal/post-judgment, time counting, weekends/holidays, forms, and effective dates.
- [ ] Add structured procedural-event facts linked to exact evidence and require human
  confirmation of ambiguous service/receipt facts.
- [ ] Only after deterministic date tests and independent authority/citation review may
  the product emit a provisional or verified deadline date.

Acceptance:

- The guide never emits `supported`, `violation`, `guilty`, a win probability, or a
  definitive deadline when a trigger/service/counting fact is missing.
- Every issue or legal proposition carries exact stored evidence/authority citations
  and retains `possible`, `conflicting`, `missing_facts`, or `not_supported` status.
- All tools are read-only, retry-safe, case-scoped, and incapable of contacting an
  external party or changing evidence/case state.
- Synthetic tests prove case isolation and no real Wayne/Walmart data access.
- Real-case ChatGPT connection, HTTPS tunnel, OAuth, hosting, deployment, submission,
  and public publishing remain explicitly untested and out of scope.

Non-goals: importing the Wayne workspace, filing an eviction response, drafting or
sending court papers, calculating a court deadline without verified inputs, remote
hosting, public plugin submission, Tauri packaging, and GitHub push/PR work.

Rollback: remove the isolated `chatgpt-app/` package and the additive read-only
guidance route/tests; no evidence schema, original file, or existing issue result is
rewritten by this slice.

## Verification

```powershell
pnpm nx run vibe-justice:lint
pnpm nx run vibe-justice:typecheck
pnpm nx run vibe-justice:test:frontend
pnpm nx run vibe-justice:test:backend
pnpm nx run vibe-justice:build:frontend
pnpm nx run vibe-justice:e2e
pnpm nx run vibe-justice:tauri:build
```

Passing existing targets is baseline evidence only; release acceptance also requires
the 16 physical and functional demonstrations in the user-supplied finish contract.

## Decisions

- 2026-08-16: Use `C:\projects\vibe-tech-monorepo` as the canonical local checkout for this run.
- 2026-08-16: Keep the plan in the app so future sessions can resume from repository state.
- 2026-08-16: Execute Phase 0 before implementing only the bounded Phase 1A slice.
- 2026-08-16: Support private `127.0.0.1` web mode as a development and fallback
  path, while retaining the packaged Windows desktop app as the release target.
- 2026-08-16: Do not install or operate the entire monorepo. Scope dependency setup
  and validation to Vibe Justice and its direct workspace dependency only.
- 2026-08-16: Legal issue discovery must be element-based and source-grounded. Replace
  unsupported keyword `violation` labels in the real case workflow with cautious,
  versioned potential-issue findings that show evidence, authority, missing facts,
  contrary facts, applicability limits, and exact citations.
- 2026-08-20: Research the personal tenant/eviction guide as a private
  `interactive-decoupled` ChatGPT plugin using the current MCP Apps standard. Keep the
  guide read-only and synthetic-first; real-case outbound data requires a later,
  explicit privacy/authentication decision.
- 2026-08-21: Defer the optional ChatGPT/MCP guide until the private Windows app is
  complete. Finish daily workflow, drafting/export, consent, backup/restore, real-case
  acceptance, and packaging first.

## Status

Phase 5A0 research is retained but implementation is deferred. Phase 0 remains partial
because native Rust compilation and Tauri packaging are blocked by missing MSVC
`link.exe`. Fresh app-local verification on 2026-08-21 passed: 234 backend tests with
1 expected xfail and 75.14% coverage; frontend lint/typecheck; 401 frontend tests with
1 todo; production build; and all 3 serialized browser E2E flows. Phase 1A backend
startup, migrations, canonical DB ownership, loopback, authentication, and protected
instance readiness are confirmed. The Rust lifecycle implementation is source-reviewed
but remains unexecuted. Phase 2A durable create/select/reload/
archive/restore is complete with atomic disk state and temporary-data acceptance proof.
Phase 2B is complete. The durable backend contract, immutable case-contained originals,
provenance, extraction history/retry, current-case UI, adversarial backend tests, and
serialized evidence import -> reload -> changed-backend-PID browser acceptance all pass.
Phase 3A is complete: extracted text is hash-bound at creation, indexed into durable
case-scoped chunks, searched locally without providers, and returned with verified
page/paragraph/character citations. Phase 5A may reuse the existing read-only legal
pack and potential-issue contracts but must not claim they establish a violation.
