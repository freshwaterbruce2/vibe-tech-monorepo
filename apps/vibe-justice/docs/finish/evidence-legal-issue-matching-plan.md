# Evidence-to-Legal-Issue Matching Plan

## Objective

Make Vibe Justice identify legally significant connections a user may not know to
look for. Given case evidence such as a text message, email, notice, lease, or PDF,
the app should locate the exact evidence passage, retrieve potentially relevant law
for the case's jurisdiction and matter type, compare the facts with the law's required
elements, and present a reviewable **potential issue** with navigable citations.

The system must help the user discover questions and preserve supporting material. It
must not state that a person broke a law merely because keywords matched, invent a
citation, or present itself as a lawyer or court.

## Current starting point

- Phase 2A provides durable case identity, jurisdiction, and current-case selection.
- Phase 2B provides case-scoped immutable originals, extracted text, provenance,
  SHA-256 integrity, extraction history, and authenticated evidence routes.
- The existing `retrieval_service.py`, `legal_cache_service.py`, knowledge API, and
  `violation_detector_service.py` predate the durable evidence contract. They use
  global/domain collections, weak metadata, optional provider embeddings, keyword
  fallbacks, and unsupported legal labels. They are not acceptance-quality legal
  analysis and must not be connected to real cases as-is.
- Phase 2B remains Partial until its dedicated evidence import/reload/backend-restart
  Playwright flow passes.

## Mandatory boundaries

- Work case-by-case. Every evidence chunk, search, finding, and citation lookup must
  constrain the authenticated `case_id` in the server query.
- Preserve Phase 2B originals byte-for-byte. Analysis may create only separate,
  replaceable derivatives and durable records.
- Use synthetic fixtures until the complete flow passes. Do not read Walmart,
  landlord, email, or other real case files during implementation.
- No autonomous sending, filing, contacting, deleting, or deadline calculation with
  legal effect. Later actions remain drafts or user-confirmed operations.
- Local-only retrieval must work with outbound networking disabled. A provider may be
  added later only behind explicit per-case consent, a visible outbound-data preview,
  minimization/redaction controls, and a no-provider test path.
- Never use model memory as legal authority. A legal proposition must cite a stored,
  versioned source passage or be labeled unsupported and excluded from findings.
- Prefer primary sources: enacted statutes/regulations, official court opinions,
  official forms/instructions, and the user's controlling contract or policy. Secondary
  material may explain but may not silently replace primary authority.
- Retain source dates and warnings. The South Carolina General Assembly web code is a
  public research source that says the official version remains the published code;
  the UI must disclose that limitation and the pack's retrieval date.
- Findings use calibrated labels: `possible`, `conflicting`, `missing_facts`, or
  `not_supported`. The bounded lexical candidate screener may never emit `supported`;
  actor, negation, timing, elements, and exceptions require human review. Do not use
  `guilty`, `illegal`, `law_broken`, or a numeric legal-win probability.
- Do not begin email ingestion, reminders, form generation, real-data import, remote
  hosting, or Tauri packaging in this plan's first implementation slice.
- Local Git checkpoints only. Do not push, publish, or create GitHub pull requests.

## Product contract

For each candidate issue, show all of the following together:

1. A neutral issue title, such as `Potential repair-obligation issue`.
2. The exact evidence excerpt with evidence ID, filename, page/paragraph or character
   offsets, evidence date when known, provenance, and a link back to the original.
3. The exact authority excerpt with jurisdiction, source type, title, section/rule,
   canonical URL, retrieval date, effective/version date when known, and content hash.
4. An element-by-element comparison:
   - what the authority requires;
   - evidence that may support each element;
   - contrary or qualifying evidence;
   - facts that are still missing;
   - exceptions, defenses, or scope limits that require review.
5. A plain-language explanation of why the passages may relate.
6. A confidence explanation based on citation coverage and factual completeness, not a
   bare model score.
7. Safe next steps such as preserving a message, adding an event to the timeline,
   locating a missing notice, or preparing a draft question. Never recommend sending,
   filing, withholding money, admitting facts, or contacting a party automatically.
8. A visible `Not legal advice; verify current law and deadlines` notice.

## Durable data design

Extend the app's SQLModel/SQLite database rather than creating new JSON catalogs.

### `EvidenceChunk`

- stable chunk UUID and case/evidence foreign keys;
- extraction-attempt ID and extracted-text SHA-256;
- ordinal, page/paragraph/character locator, and exact chunk text;
- deterministic tokenizer/chunker version and created timestamp;
- local retrieval fields or index identity; no absolute paths.

Chunks become stale when the referenced extraction attempt or extracted-text hash
changes. Reindexing creates a new version or atomically replaces only the derived index;
it never changes the original or prior extraction attempt.

### `LegalSource`

- stable source UUID, jurisdiction, authority type, title, citation, section/rule;
- publisher, canonical URL, retrieval time, effective/version dates when known;
- raw-source and normalized-text SHA-256, license/publication note, and status;
- supersedes/superseded-by links and a current-as-of warning;
- immutable stored snapshot plus separately derived text.

### `LegalRuleElement`

- source and pinpoint citation;
- neutral rule/element text grounded in the source excerpt;
- applicability predicates such as jurisdiction, forum, matter type, date range, and
  actor/relationship;
- exceptions or qualifications with their own pinpoint citations;
- reviewer status (`draft`, `source_checked`, `approved_for_matching`, `retired`).

The application must never auto-promote generated element summaries to
`approved_for_matching`. Initial packs are source-checked synthetic development data;
real-use packs require explicit review.

### `IssueFinding`

- stable finding UUID, case ID, issue type, status, created/updated timestamps;
- rule-element version IDs and evidence-chunk IDs;
- supporting, contrary, missing-fact, and qualification links;
- bounded plain-language rationale, confidence explanation, and warning flags;
- engine/ruleset version and optional model/provider audit metadata;
- user disposition (`unreviewed`, `helpful`, `not_relevant`, `needs_correction`,
  `confirmed_by_professional`) without rewriting the underlying evidence or authority.

## Retrieval and matching architecture

1. **Evidence indexing:** build deterministic chunks only from successful Phase 2B
   extracted-text attempts. Store exact locators and hashes. Images without text remain
   visibly unsupported until a separately approved OCR phase.
2. **Case retrieval:** use lexical full-text retrieval as the offline baseline. Any
   semantic/vector adapter is additive, versioned, case-filtered before ranking, and
   must never use deterministic hash vectors as if they were meaningful embeddings.
3. **Legal-source retrieval:** search only installed, compatible knowledge-pack
   versions for the case jurisdiction, matter type, and relevant date. Never fall back
   silently to `general`, another state, or federal law.
4. **Candidate generation:** retrieve possible evidence/authority pairs using neutral
   concepts, defined terms, actors, dates, duties, refusals, notices, and deadlines.
5. **Element matching:** produce a structured matrix, requiring cited support for every
   positive proposition. Missing or conflicting elements lower the status and remain
   visible.
6. **Citation validation:** reject a finding if its quoted text does not match the
   hashed source snapshot and locator, if the source is outside the selected pack, or
   if the evidence belongs to another case.
7. **Presentation:** render a human-readable issue card and side-by-side evidence/law
   viewer. Citations must navigate to the exact stored excerpt and original source.
8. **Reproducibility:** the same evidence, pack, ruleset, and engine version should
   produce the same local baseline findings after restart.

## Knowledge-pack policy

Build the generic engine once, then add one reviewed jurisdiction/matter pack at a
time. Recommended order:

1. South Carolina residential landlord-tenant statutes and relevant official forms or
   court rules, using synthetic tenant scenarios for acceptance.
2. South Carolina employment/unemployment statutes, regulations, agency instructions,
   and appeal procedures, using synthetic workplace scenarios.
3. Federal employment/disability sources only where a case explicitly selects a
   compatible federal issue and forum.

Each pack needs a manifest, source inventory, hashes, version/as-of dates, applicability
metadata, update procedure, changelog, and regression corpus. A pack update must not
silently rewrite historical findings; it creates a new analysis version and identifies
which prior findings may be stale.

## Case-scoped API contract

Prefer authenticated routes under the current case:

- `POST /api/cases/{case_id}/evidence/{evidence_id}/index`
- `GET /api/cases/{case_id}/evidence/{evidence_id}/chunks`
- `POST /api/cases/{case_id}/issues/analyze`
- `GET /api/cases/{case_id}/issues`
- `GET /api/cases/{case_id}/issues/{finding_id}`
- `POST /api/cases/{case_id}/issues/{finding_id}/disposition`
- `GET /api/legal-packs`
- `GET /api/legal-packs/{pack_id}/sources/{source_id}`

Every evidence/finding lookup must constrain both case ID and record ID. Cross-case
access returns 404. Responses expose stable IDs and locators, never absolute paths,
provider keys, prompts containing unrelated evidence, stack traces, or raw parser/model
exceptions.

## Frontend contract

- Replace the current raw JSON `AnalysisPanel` with an accessible `Potential Issues`
  workspace available only when a valid current case and compatible legal pack exist.
- Let the user choose specific evidence or analyze all ready evidence in the case.
- Before analysis, display jurisdiction, installed legal pack, as-of date, evidence
  count, local/provider mode, and exactly what would leave the device if applicable.
- Show progress and cancellation where safe. A cancelled run must not publish partial
  findings as completed.
- Issue cards show status in text, evidence citations, authority citations, element
  matrix, missing facts, contrary evidence, limitations, and safe next steps.
- Citation links open a side-by-side viewer at the exact evidence and legal-source
  locator. The user can copy a citation and mark a finding helpful or incorrect.
- Never label results `violations found`, `case won`, `legal proof`, or `confirmed`.

## Implementation sequence

### Slice 2B-acceptance: close the evidence foundation

- [x] Add a serialized synthetic Playwright flow: create/select case, import evidence,
      verify provenance/hash/status, reload, restart backend, verify again, clean exact-run
      data, and prove zero listeners.
- [x] Mark Phase 2B complete only after the physical browser acceptance passes.

### Slice 3A: local evidence retrieval and navigable citations

- [x] Audit and quarantine legacy global Chroma/knowledge/violation paths from the new
      case workflow; preserve unrelated compatibility only when isolation is not weakened.
- [x] Lock `EvidenceChunk`, locators, staleness, indexing state, and failure semantics in
      tests.
- [x] Implement restart-safe, case-scoped deterministic chunking and lexical retrieval.
- [x] Add exact evidence citation navigation and integrity verification.
- [x] Prove no cross-case retrieval and no provider/network dependency.

### Slice 4A: one versioned South Carolina legal pack

- [x] Lock the pack manifest/source/version/hash schema and update behavior in tests.
- [x] Ingest a bounded, reviewed South Carolina landlord-tenant source set from primary
      sources into immutable snapshots and derived passages.
- [x] Create source-checked rule elements with applicability and exceptions.
- [x] Display pack inventory, as-of warnings, source links, and stale-pack state.
- [x] Test changed/repealed/missing/ambiguous authority behavior without using real case
      facts.

### Slice 4B: evidence-to-element issue matching

- [x] Lock finding states, citation coverage, contrary evidence, missing facts,
      cancellation, and reproducibility in tests.
- [x] Implement local candidate generation and structured element matrices.
- [x] Reject unsupported propositions and mismatched or stale citations.
- [x] Build the Potential Issues UI with colocated, navigable evidence and authority
      citations.
- [x] Add user dispositions and versioned reruns without overwriting history.
- [x] Keep any model-assisted explanation behind a later explicit consent gate; the
      source-grounded local baseline must remain independently usable.

### Slice 4C: acceptance and independent review

- [x] Run a synthetic scenario where a text message potentially conflicts with a cited
      legal duty and verify the complete issue card.
- [x] Run negative scenarios: similar words but no applicable rule, missing element,
      contrary evidence, wrong jurisdiction, authority outside effective dates, stale pack,
      malicious prompt-like evidence, and cross-case citation attempt.
- [x] Restart backend/frontend and reproduce the same finding and locators.
- [x] Independently review auth, isolation, citation accuracy, quote fidelity, legal
      overstatement, pack provenance, data egress, and original immutability.
- [x] Run all app-local backend/frontend/build/E2E gates and verify listener cleanup.

## Required test matrix

- Authentication: missing, wrong, and valid key for every new non-health route.
- Isolation: case A cannot retrieve, analyze, cite, or disposition case B records.
- Integrity: modified/missing extracted text or legal snapshot invalidates dependent
  citations rather than silently returning a finding.
- Retrieval: exact phrase, paraphrase/concept, dates, negation, conflicting statements,
  tables, repeated text, short messages, and no-result behavior.
- Applicability: wrong state, wrong forum, wrong matter type, effective-date mismatch,
  exception, defense, and ambiguous actor/relationship.
- Grounding: every quoted span round-trips to the stored hash and locator; every legal
  proposition has a compatible source passage.
- Safety: prompt injection inside evidence is treated as untrusted evidence text;
  unsupported legal assertions and invented citations are rejected.
- History: rerun with a new pack/ruleset creates a new version and preserves the old
  finding and user disposition.
- Restart: chunks, packs, findings, citations, and statuses reopen from durable records.
- UI: keyboard navigation, screen-reader names, text-not-color status, missing-facts
  visibility, official-source/as-of warning, and no raw JSON-only result.

## Verification commands

Use only the existing app-local environments. Focused tests may disable the global
coverage addopts during iteration; final backend acceptance must meet the configured
coverage floor.

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

Also run `git diff --check`, inspect `git status --short`, and prove no listeners remain
on ports 8000 or 5175 after Playwright.

## Definition of done

The evidence-to-legal-issue capability is **Confirmed** only when a synthetic user can:

1. import a message or document into a selected synthetic case;
2. retrieve the exact relevant evidence passage after restart;
3. match it to a compatible, versioned legal rule and its required elements;
4. open both the evidence and authority at exact, hash-verified locators;
5. see supporting, contrary, missing, exception, effective-date, and jurisdiction facts;
6. receive a cautious potential-issue explanation without an unsupported legal
   conclusion;
7. reproduce the finding using the same evidence/pack/engine versions;
8. prove another case cannot access any part of the evidence, finding, or citation;
9. complete the flow locally with networking/providers disabled; and
10. pass complete app-local backend/frontend/build/serialized E2E gates with exact-run
    cleanup and zero leftover listeners.

If any condition is missing, report **Partial** and name the precise absent evidence.
Do not proceed to real-case ingestion, email monitoring, reminders, or document filing
until this capability is independently reviewed and the user explicitly approves the
next bounded slice.

## Status

Slices 2B-acceptance, 3A, 4A, 4B, and 4C are complete. The serialized synthetic browser flow
proves evidence import, exact-hash provenance, durable indexing, exact-passage search,
potential-issue screening, exact evidence and authority excerpts, reproducible input
hashes, reload, and a real backend PID change with zero listeners. The installed offline South
Carolina residential landlord-tenant pack preserves exact General Assembly excerpts,
the online-Code disclaimer, immutable per-version manifests and hashes, applicability
and exclusion sources, and explicit `source_checked` / `not_approved_for_matching`
status. Canonical verification fails closed for snapshot or database tampering, and
retained versions remain independently readable after an update. The Knowledge Base
shows the verified inventory, source detail, official links, as-of metadata, and legal
research warnings. Potential Issues performs only deterministic, local candidate
screening under a separately hashed `approved_for_candidate_screening` ruleset; it
never emits `supported`, and every statutory condition remains explicitly missing until
human review. Stored findings fail closed if evidence or authority citations no longer
match their verified sources. Independent review findings on negation, actor confusion,
pack selection, case-switch isolation, audit manifests, and disposition concurrency are
closed by focused regressions. Final gates on 2026-08-18: backend 222 passed and one
expected xfail at 74.39% coverage; frontend 453 passed and one todo in serialized mode;
lint/typecheck/build passed; Playwright 3/3 passed with exact-run cleanup. This bounded
South Carolina candidate-screening capability is Confirmed. Email ingestion, reminders,
form workflows, other jurisdictions, and any provider-assisted analysis remain separate
future slices requiring explicit scope and verification. No GitHub action is permitted.
