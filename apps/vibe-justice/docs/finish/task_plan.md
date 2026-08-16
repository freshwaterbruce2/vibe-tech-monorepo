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
- [ ] Run and record lint, typecheck, frontend tests, backend tests, frontend build, E2E, and Tauri build.
- [x] Reconcile stale test/config mismatches, including Electron assumptions in Tauri E2E.

### Phase 1A - Launch, authentication, and canonical storage

- [x] Bind production backend to loopback and reject unsafe binding by default.
- [x] Authenticate every non-health API route.
- [ ] Align launcher probing with `/api/health` and prove one sidecar lifecycle. (Code fixed; lifecycle untested.)
- [x] Fail closed on unsafe or missing production configuration.
- [ ] Define one canonical application-data root and reconcile obsolete/doubled paths. (Backend root fixed; migration remains.)
- [ ] Establish the durable relational matter model and migration direction.
- [ ] Add bounded, signature-validated evidence uploads and safe filename handling.
- [ ] Add explicit provider/model/outbound-data consent with local-only mode.

### Remaining phases

### Phase 2A - Durable case identity and selection

- [x] Create a valid synthetic case without overwriting an existing case ID.
- [x] Open/select a case through an accessible current-case UI.
- [x] Persist current-case selection in app data and restore it after reload/restart.
- [x] Archive the current case safely, then restore it without silently reselecting it.
- [x] Prove the flow with temporary backend data and a serialized localhost E2E.

### Later phases

- [ ] Phase 2B: case-scoped evidence provenance and durable reopening.
- [ ] Phase 3: case-scoped retrieval and navigable citations.
- [ ] Phase 4: jurisdiction-aware, versioned legal knowledge packs.
- [ ] Phase 5: universal personal-paralegal workflows.
- [ ] Phase 6: editable drafts and genuine DOCX/PDF export.
- [ ] Phase 7: Walmart working-copy acceptance.
- [ ] Phase 8: non-destructive landlord-workspace import and acceptance.
- [ ] Phase 9: backup, restore, packaging, and final physical acceptance.

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

## Status

Phase 0 remains partial only because Tauri packaging is untested. Isolated lint,
typecheck, 431 frontend tests, 203 backend tests, production build, and both browser
E2E flows pass. Phase 1A is backend-verified. Phase 2A durable create/select/reload/
archive/restore is complete with atomic disk state and temporary-data acceptance proof.
Next bounded product slice is case-scoped evidence import and provenance.
