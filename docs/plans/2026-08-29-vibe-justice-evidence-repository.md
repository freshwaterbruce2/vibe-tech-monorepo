# Vibe Justice Evidence Repository Plan — Superseded Location

This plan was created while canonical ownership was still being audited. The active Vibe Justice source of truth is `C:\projects\vibe-justice`; this monorepo app is an unchanged rollback copy. Continue from `C:\projects\vibe-justice\docs\evidence-repository-plan.md`. Do not implement or synchronize this tree implicitly.

## Objective

Establish one durable, local-first, case-scoped evidence repository in the current Vibe Justice product so evidence is preserved and retrievable from file-backed records rather than conversational memory. Reconcile the live landlord workspace separately and import real evidence only after the product flow passes synthetic acceptance.

## Context

- User refers to the product as Vibe Justice or Vibe Paralegal.
- Candidate code trees are `C:\projects\vibe-tech-monorepo\apps\vibe-justice` and `C:\projects\vibe-justice`; canonical/current ownership must be proved before editing.
- The legal-coding product contract requires authenticated `case_id` isolation, immutable originals, separate derivatives, contained generated paths, streaming size/type enforcement, SHA-256, durable provenance, and fail-closed cross-case access.
- Real landlord evidence remains under `C:\personal\Landlord-Case`; application development and tests must use synthetic fixtures under a unique temporary data root.
- The current skill source map names `docs/finish/*` and several backend files that are not present at the expected paths in either candidate tree. Current source and current headings must control over older completion claims.
- No Git operations. No deployment, external provider, dashboard access change, or raw evidence upload is authorized.

## Checklist

- [ ] Determine the canonical/current Vibe Justice tree and record the disposition of the other tree.
- [ ] Read the current evidence API, storage service, frontend evidence board, tests, and active planning/authority files.
- [ ] Reconcile the local landlord case inventory against `EVIDENCE_INDEX.md` and `SOURCE_MANIFEST.md` without altering originals.
- [ ] Freeze one bounded repository slice with allowed files, preserved contracts, acceptance criteria, non-goals, and rollback.
- [ ] Create a secret-safe source snapshot under `C:\projects\_vibe-snapshots` before application-source edits.
- [ ] Delegate the bounded implementation to one source writer using synthetic evidence only.
- [ ] Run focused backend/frontend tests, then maintained app-level aggregate gates.
- [ ] Independently review case isolation, immutable-original behavior, provenance retention, duplicate-byte handling, and failure cleanup.
- [ ] After product acceptance, define a separately approved real-case intake and reconciliation batch.

## Decisions

- 2026-08-29: Prefer a privacy-minimized review packet over granting Grok access to the owner-only dashboard; the local Grok bridge has no external connector.
- 2026-08-29: Treat the evidence repository as product infrastructure, not a copy of the live landlord folder.
- 2026-08-29: Preserve the existing landlord workspace as the current operational source until a verified import/reconciliation flow proves completeness.

## Verification

- Focused backend tests must prove authentication, case and record scoping, path containment, streaming bounds, provenance and hash durability, duplicate-byte provenance, immutable originals, and exact failure cleanup.
- Focused frontend tests must prove case-scoped listing/import status and honest failure/proof-limit display.
- Synthetic browser acceptance must prove import, reload, backend restart persistence, cross-case denial, and exact-run cleanup.
- Maintained Vibe Justice aggregate backend/frontend gates must pass before the slice is called complete.

## Status

Audit in progress. No application source, real evidence, dashboard access, or external connector has been changed.
