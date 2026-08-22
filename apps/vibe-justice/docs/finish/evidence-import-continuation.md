# Continuation Prompt: Phase 2B Evidence Import and Provenance

Copy the prompt below into the next Codex task. It is intentionally self-contained,
bounded to Vibe Justice, and based on maintained working open-source projects instead
of bespoke file-processing code.

---

You are continuing the Vibe Justice finish work in:

`C:\projects\vibe-tech-monorepo`

Branch: `codex/vibe-justice-finish-20260816`

Known completed commits:

- `c2ea3b7b feat(vibe-justice): establish private app-only baseline`
- `3d093834 feat(vibe-justice): persist current case workflow`

Your single bounded objective is **Phase 2B: case-scoped evidence import,
provenance, extraction status, retry, and restart-safe reopening**. Do not start RAG,
legal knowledge packs, drafting/export, Walmart import, landlord import, remote hosting,
or Tauri packaging in this slice.

## Mandatory operating boundaries

1. Read completely before editing:
   - root `AGENTS.md`
   - `.claude/agents/master-agent.md`
   - `apps/vibe-justice/docs/finish/task_plan.md`
   - `apps/vibe-justice/docs/finish/findings.md`
   - `apps/vibe-justice/docs/finish/progress.md`
   - the current case, evidence, storage, extraction, database, frontend API, and
     evidence UI implementations and their tests.
2. Work only in `apps/vibe-justice` except for an unavoidable app registration fix.
3. Do not install the monorepo. Use the existing backend `.venv` and the frontend's
   app-local pnpm installation/lockfile.
4. Use only synthetic fixtures under a unique temporary data root. Do not read, copy,
   alter, index, or upload real Walmart, landlord, or user evidence.
5. Do not call OpenRouter, OpenAI, Ollama, or any other provider. Evidence import and
   local extraction must work with outbound networking disabled.
6. Keep the backend and Vite listeners on `127.0.0.1`; keep every non-health route
   authenticated.
7. Preserve every imported original byte-for-byte. Never OCR, normalize, decrypt,
   rewrite, or annotate the stored original. Derivatives and extracted text belong in
   separate paths and records.
8. Do not silently discard a duplicate. Identical bytes may arrive from different
   people or sources and therefore have distinct evidentiary provenance.
9. Use `apply_patch` for source edits, respect unrelated working-tree changes, and
   assign one writer per file if subagents are used.
10. Report status honestly as Confirmed, Partial, Blocked, or Untested. A passing unit
    test is not physical desktop acceptance.

## Reuse proven components; do not reinvent them

Before adding a dependency, confirm its current release and license in its upstream
repository and record the decision in `findings.md`.

### Adopt directly (permissive and already installed unless noted)

- **SQLModel + SQLite** for durable relational evidence and extraction-attempt
  records. The official `fastapi/sqlmodel` project is MIT-licensed and demonstrates
  typed models, SQLite engines, sessions, transactions, and FastAPI integration:
  https://github.com/fastapi/sqlmodel
- **pypdf** for PDF structural validation, encrypted-file detection, page count, and
  text extraction. It is pure Python and BSD-3-Clause licensed:
  https://github.com/py-pdf/pypdf and
  https://github.com/py-pdf/pypdf/blob/main/LICENSE
- **python-docx** for DOCX validation/extraction after ZIP/OOXML container checks. It
  is MIT-licensed and already used by the app:
  https://github.com/python-openxml/python-docx
- **Pillow** for image decoding and `Image.verify()`-style integrity validation. Its
  MIT-CMU license is permissive and it is already installed:
  https://github.com/python-pillow/Pillow and
  https://github.com/python-pillow/Pillow/blob/main/LICENSE
- **Python standard library** for `hashlib.sha256`, `uuid`, `tempfile`, `zipfile`,
  `os.replace`, `pathlib`, and bounded streaming. Do not add a hashing, UUID, ZIP, or
  atomic-rename package.
- **filetype.py** is the one justified new runtime dependency if inspection confirms
  it meets the supported formats. It is MIT-licensed, cross-platform, dependency-free,
  and detects MIME/type from magic signatures using at most the first 261 bytes:
  https://github.com/h2non/filetype.py. Pin a reviewed version in
  `backend/requirements.txt`; do not copy its magic-number tables into this repo.

### Architecture reference only; do not copy source

- **Paperless-ngx** is a mature document-management implementation. Reuse its proven
  concepts: immutable original versus mutable working copy, task/status records,
  stored checksums, explicit original filename, checksum-based integrity checking,
  and orphan/missing-file audits. The relevant documentation is:
  - https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/advanced_usage.md
  - https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/api.md
  - https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/administration.md
  - https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/configuration.md
  Paperless-ngx is GPL-3.0. Learn from the behavior and write a small implementation
  appropriate to this app; do **not** paste or translate its source into this
  ISC-licensed repository.
- Apply the OWASP File Upload Cheat Sheet's defense-in-depth controls: allowlisted
  extensions, distrust the request Content-Type, signature/type validation,
  application-generated stored names, length/size limits, authorized upload, storage
  outside the webroot, and least privilege:
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **OCRmyPDF** is a later optional derivative adapter, not part of this slice. It uses
  a sound original/working/output separation, but introduces native executables and a
  Ghostscript licensing/packaging review. Do not add it now:
  https://github.com/ocrmypdf/OCRmyPDF

## Required design

### 1. One canonical evidence model

Use the app's existing SQLModel/SQLite direction rather than creating more JSON indexes.
Add migrations or an explicit, tested initialization path consistent with the current
database code. At minimum model:

- `EvidenceRecord`
  - stable application-generated UUID `evidence_id`
  - validated `case_id` relationship/index
  - original display filename, never used as the stored path
  - application-generated relative original path
  - byte length and lowercase SHA-256
  - user-declared MIME and server-detected MIME/type
  - import time in UTC
  - source/provenance fields: source label, received-from or source path description,
    notes, and optional event/evidence date; do not require real-person data in tests
  - lifecycle status and a bounded, user-safe error code/message
  - optional `same_content_as` or content-identity link for duplicate hashes
  - created/updated timestamps
- `ExtractionAttempt`
  - stable attempt UUID, evidence ID, extractor name and version
  - started/completed UTC timestamps
  - status (`pending`, `running`, `succeeded`, `failed`, `unsupported`, `encrypted`)
  - page count where applicable
  - application-generated relative text/derivative paths
  - bounded error code and sanitized error message

Use database constraints/indexes for IDs, case lookup, and SHA-256 lookup. Do not make
SHA-256 globally unique: two evidence records with the same bytes can preserve separate
provenance. Store paths relative to the canonical data root; resolve them through the
existing containment helper.

### 2. Immutable, case-contained storage

Use a deterministic containment layout such as:

```text
<data-root>/cases/<case-id>/evidence/<evidence-uuid>/
  original/<uuid-or-content-id>.<validated-extension>
  extracted/<attempt-uuid>.txt
  derivatives/<attempt-uuid>/...
```

The exact names may change to match existing path helpers, but these invariants may not:

- the original filename is metadata only;
- all disk names are generated by the app;
- every resolved path stays inside the selected case;
- originals, extracted text, and derivatives are physically distinct;
- reopening the app reconstructs the evidence list from durable records;
- the stored original's SHA-256 remains equal to its import hash after every extraction,
  retry, preview, and restart.

### 3. One shared import pipeline

Replace/bypass the current filename-as-ID, global-upload behavior with one shared service
used by the case-scoped API. Do not maintain separate safety logic in evidence,
document-analysis, and batch endpoints.

Pipeline, in order:

1. Validate authenticated case access and reject archived/missing cases.
2. Normalize only the display name; reject empty, overlong, control-character,
   traversal, reserved Windows-device, double-extension ambiguity, and unsupported
   extension cases.
3. Stream the request into a UUID-named staging file inside the canonical data root.
   Enforce the configured maximum **while streaming**, not from the client header.
   Compute SHA-256 and byte count in the same pass. Never read the entire upload into
   memory.
4. Flush and fsync the staged bytes before validation/publish.
5. Detect signature/type with `filetype.py` where supported and compare the result with
   the extension allowlist. Treat request MIME as untrusted metadata. Plain text needs a
   bounded BOM/encoding/text sanity check because it has no strong magic signature.
6. Perform semantic validation with the established parser:
   - PDF: `PdfReader`; reject/report malformed; if encrypted, preserve the original and
     record visible `encrypted`/unsupported extraction status rather than guessing a
     password.
   - DOCX: verify it is a safe ZIP/OOXML package with required document entries and
     bounded entry count/uncompressed total before opening with python-docx. Reject ZIP
     traversal and decompression-bomb shapes; never `extractall` user archives.
   - images: Pillow open/verify, with pixel/decompression limits and warnings promoted
     to a controlled rejection where appropriate.
   - TXT: bounded decode with explicit encoding result; preserve original bytes.
7. In a transaction, create the evidence row and publish the staged original with an
   atomic same-filesystem rename. Design failure handling so neither an orphaned final
   file nor a committed row pointing at a missing file can survive. If strict filesystem
   plus SQLite atomicity cannot be achieved, use an explicit recoverable `staged` state
   plus a startup reconciliation test; do not claim cross-resource atomicity.
8. Always clean only that request's UUID staging artifacts on rejection/failure. Never
   recursively clean a user-derived or final case path.
9. Queue or execute bounded local extraction after the original is safely published.
   Extraction failure must not roll back or delete accepted evidence.

Default allowlist for this slice: PDF, DOCX, TXT, PNG, JPEG/JPG, and TIFF only. Preserve
the ability to add formats through a registry; do not accept arbitrary Office/archive
formats merely because `filetype.py` can identify them. Pick and document conservative
per-file, page/pixel, ZIP-entry, and uncompressed-size limits.

### 4. Case-scoped authenticated API

Prefer an explicit contract such as:

- `POST /api/cases/{case_id}/evidence` — multipart original plus provenance fields;
  returns 201 with the durable evidence record and extraction state.
- `GET /api/cases/{case_id}/evidence` — current case evidence, newest first.
- `GET /api/cases/{case_id}/evidence/{evidence_id}` — metadata/provenance/status.
- `GET /api/cases/{case_id}/evidence/{evidence_id}/original` — authenticated streamed
  download with safe `Content-Disposition` and detected MIME.
- `GET /api/cases/{case_id}/evidence/{evidence_id}/text` — extracted text when ready;
  clear 409/422-style status response when pending, encrypted, unsupported, or failed.
- `POST /api/cases/{case_id}/evidence/{evidence_id}/extract` — explicit idempotent retry;
  creates a new attempt without replacing history or modifying the original.

Route names may be adapted for compatibility, but case ID must be in the server-validated
path and every lookup must constrain both case ID and evidence ID. Cross-case access must
return 404 without revealing existence. Keep destructive deletion out of this slice unless
the finish plan explicitly requires it; legal-evidence deletion needs a later confirmation,
trash, and audit design.

Return typed Pydantic response models. Do not expose absolute filesystem paths, stack
traces, provider keys, or raw parser exceptions.

### 5. Honest current-case frontend

- Remove every hardcoded case ID, especially `CASE-2024-001` in the evidence board.
- Make Evidence available only with a valid current case from the completed Phase 2A
  state.
- Provide an accessible import dialog/drop zone with ordinary file picker support,
  accepted formats/size displayed before selection, provenance/source fields, progress,
  cancel where technically safe, and `role=alert` errors.
- After import, show filename, type, byte size, abbreviated SHA-256 with copy/details,
  import time, provenance, extraction status, and retry for failed extraction.
- Distinguish `stored`, `extracting`, `ready`, `encrypted`, `unsupported`, and
  `extraction failed` in text, not color alone. Never label evidence indexed, analyzed,
  or cited in this slice.
- On reload/backend restart, list the same durable records and statuses. No localStorage
  evidence catalog.

### 6. Required tests and adversarial fixtures

Generate synthetic fixtures in tests using permissive installed libraries. Fixtures must
contain real format structures, not renamed text files. Add focused backend tests for:

- missing/wrong/valid API key;
- missing, archived, and valid case;
- accepted PDF, DOCX, TXT, PNG/JPEG, and TIFF;
- server-measured oversize rejection and exact boundary behavior;
- empty file, unsupported extension, double extension, path traversal, Windows reserved
  names, misleading request MIME, and extension/signature mismatch;
- malformed PDF/DOCX/image and encrypted PDF with visible durable status;
- DOCX ZIP traversal, excessive entry count, excessive declared uncompressed size, and
  suspicious compression ratio without extracting entries;
- interrupted stream/parser/database/publish/extraction failure with exact staging
  cleanup and no damage to pre-existing evidence;
- SHA-256 correctness and original hash unchanged after extraction/retry/restart;
- same-content imports retain two provenance records while identifying shared bytes;
- cross-case list/get/download/retry isolation;
- restart with a fresh TestClient/engine restores evidence and extraction history;
- corrupt/missing stored file produces an explicit integrity state, not silent omission.

Add frontend unit tests for API contracts, current-case gating, accessible dialog,
progress/error/status/retry, and hardcoded-case removal. Add one serialized Playwright
flow using a unique `%TEMP%\vibe-justice-e2e-<uuid>` root:

1. create/select a synthetic case;
2. import a generated small document with synthetic provenance;
3. observe stored/ready plus hash and provenance;
4. reload and confirm it reopens;
5. restart the backend if the harness safely supports it and confirm again;
6. prove exact-run cleanup and zero remaining listeners.

The E2E must never access real data roots or network providers.

## Implementation sequence

1. Audit the current duplicate evidence/document upload paths and existing DB migration
   machinery. Record exact findings before editing.
2. Lock the data model, state machine, API response schemas, limits, and failure/recovery
   semantics in tests.
3. Implement the shared streaming validator/import service using the upstream libraries
   above.
4. Implement durable records/migration and startup reconciliation/integrity behavior.
5. Replace the evidence API with case-scoped endpoints while preserving unrelated API
   compatibility only where it does not weaken isolation.
6. Connect the current-case frontend and remove demo IDs.
7. Run focused tests, then full app-only gates, then the serialized E2E.
8. Independently review auth coverage, path containment, original immutability, database
   failure recovery, archive behavior, and license/dependency changes.
9. Update `task_plan.md`, `findings.md`, and `progress.md` with commands and honest status.
10. Commit only the bounded slice. Attempt push only if credentials are available; report
    a credential block exactly and do not improvise credential storage.

## App-only verification commands

Run from PowerShell. Adapt only if the existing package scripts show a more current local
contract; do not invoke a root workspace install.

```powershell
Set-Location C:\projects\vibe-tech-monorepo\apps\vibe-justice\backend
.\.venv\Scripts\python.exe -m pytest vibe_justice\tests -v --tb=short

Set-Location C:\projects\vibe-tech-monorepo\apps\vibe-justice\frontend
corepack pnpm run lint
corepack pnpm run typecheck
corepack pnpm run test:run
corepack pnpm run build
corepack pnpm run e2e
```

Also run focused evidence tests without the global coverage gate during iteration, then
the complete backend suite with its configured 55% floor for acceptance. Run
`git diff --check`, inspect `git status --short`, and verify no listeners remain on
ports 8000 or 5175 after E2E.

## Definition of done

Phase 2B is Confirmed only when all of the following are demonstrated:

- a synthetic evidence original is streamed with bounded memory, signature/semantic
  validated, hashed, stored under its selected case, and represented durably;
- the original is byte-identical after extraction, retry, reload, and backend restart;
- provenance, hash, type, size, and truthful extraction state are visible in the UI;
- duplicate bytes preserve distinct provenance without silent loss;
- another case cannot list, fetch, download, or retry the evidence;
- malformed, oversized, encrypted, mismatched, and interrupted inputs fail safely with
  exact staging cleanup and visible status;
- all full backend/frontend/build/E2E gates pass using only app-local dependencies and
  temporary synthetic data;
- no provider call, real-case mutation, monorepo install, or Tauri claim occurred.

If any item is not proven, label Phase 2B Partial and name the precise missing acceptance
evidence. Stop after this slice; Phase 3 retrieval/citations requires a separate prompt
and explicit review of the durable evidence contract.

