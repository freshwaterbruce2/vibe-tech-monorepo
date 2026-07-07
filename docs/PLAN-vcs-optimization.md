<!-- /autoplan restore point: C:\Users\fresh_zxae3v6\.gstack\projects\vibe-tech-monorepo\refactor-monetization-hasfeature-dedup-autoplan-restore-20260626-101113.md -->
# Vibe Code Studio - Complete Optimization & Modernization Plan

This plan addresses a complete optimization sweep across all three core pillars of Vibe Code Studio.

## Open Questions

> [!NOTE]  
> Are there any specific Monaco language servers (like Rust Analyzer or Python's Pyright) you want integrated in this pass, or should we stick to optimizing the React/TS defaults first?

## Proposed Changes

---

### Tauri Runtime Polish
*Optimizing the native desktop experience.*

#### [MODIFY] `apps/vibe-code-studio/src-tauri/Cargo.toml`
#### [MODIFY] `apps/vibe-code-studio/package.json`
- Add and configure `@tauri-apps/plugin-window-state` to automatically persist and restore the editor's window dimensions and position between launches.
- Sync `Cargo.toml` to include the native backend for `tauri-plugin-os` (which is in `package.json` but missing from the Rust build).

---

### Monaco Editor Modernization
*Bringing the editor UX up to 2026 standards.*

#### [MODIFY] `apps/vibe-code-studio/src/components/editor/useEditorState.ts`
- Enable `stickyScroll` to keep class and function signatures visible when scrolling through large files.
- Enable `bracketPairColorization` and smooth cursor animations (`cursorBlinking: 'smooth'`).
- Configure `minimap: { autohide: true }` to maximize screen real estate when not scrolling.
- Turn on `inlayHints` for TypeScript.

---

### AI Orchestration Enhancements
*Optimizing the AI API usage and streaming performance.*

#### [MODIFY] `apps/vibe-code-studio/src/services/ai/StreamingAIService.ts`
- **Implement AbortController Cancellation**: Currently, if the user navigates away or starts a new generation, the previous AI stream continues in the background, wasting memory and API credits. We will add `AbortSignal` propagation.
- Add a `cancelActiveGeneration()` method to gracefully terminate running open-router streams.

#### [MODIFY] `apps/vibe-code-studio/src/services/ai/UnifiedAIService.ts`
- Expose the cancellation token up to the UI layer so the user can hit a "Cancel Generation" button or trigger it via keyboard shortcut.

## Verification Plan

### Automated Tests
- `pnpm nx run vibe-code-studio:typecheck`
- `pnpm nx run vibe-code-studio:test`
- `pnpm nx run vibe-code-studio:lint`

### Manual Verification
- Launch the Tauri app using `pnpm nx run vibe-code-studio:dev`.
- Resize the window, close the app, and reopen it to ensure it restores the size.
- Scroll through a large TypeScript file to verify `stickyScroll` works.
- Start an AI generation and verify that closing the chat or issuing a new command properly aborts the network request.

## Autoplan Context

- Target plan: `docs/PLAN-vcs-optimization.md`
- Branch: `refactor/monetization-hasfeature-dedup`
- Base branch: `main`
- UI scope: yes
- DX scope: yes
- Phase mode: `SELECTIVE_EXPANSION`
- Codex status: unavailable in this run (token refresh/auth failure); outside voices executed via Claude subagents.

## Autoplan Phase 1 - CEO Review

### Step 0A - Premise Challenge

1. The plan currently optimizes already-shipped work (window-state, tauri OS wiring, Monaco defaults) rather than the highest pain path.
2. The strongest remaining user outcome is deterministic cancellation and recovery of AI generation streams.
3. Doing nothing keeps a hidden reliability/cost leak: in-flight stream lifecycle is not clearly owned at the UI request level.

### Step 0B - Existing Code Leverage Map

| Sub-problem | Existing code | Rebuild needed? | Decision |
|---|---|---|---|
| Window persistence | `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` | No | remove from net-new scope |
| Monaco readability defaults | `src/components/Editor.tsx` | No | rebaseline as already complete |
| Stream cancellation primitives | `src/services/ai/UnifiedAIService.ts`, `src/services/ai/providers/BackendProxyService.ts` | Partial | keep, but wire request-scoped lifecycle to UI |
| Chat streaming UX behavior | `src/hooks/useAIChat.ts` | Yes | add explicit cancellation UX/state contract |

### Step 0C - Dream State Mapping

```text
CURRENT STATE
- strong baseline editor/runtime defaults
- cancellation primitives exist but are not fully user-journey-owned
- plan references stale/duplicate targets

THIS PLAN (REBIASED)
- remove duplicate work
- implement end-to-end request-scoped cancellation with visible UX states
- add reliability/latency/security acceptance metrics

12-MONTH IDEAL
- VCS AI interactions feel deterministic under interruption
- every stream lifecycle is observable, cancellable, and auditable
- plan/docs stay auto-validated against code reality
```

### Step 0C-bis - Implementation Alternatives

**Approach A: Minimal Delta Patch**
- Summary: Retarget only stale file paths and add a basic cancel button hookup.
- Effort: S
- Risk: Medium
- Pros: smallest diff, fast land
- Cons: weak observability, partial lifecycle guarantees
- Reuses: existing `UnifiedAIService` and proxy abort controllers

**Approach B: Outcome-Driven Reframe (selected)**
- Summary: Remove already-complete tasks, then implement request-scoped cancellation plus measurable reliability goals.
- Effort: M
- Risk: Low-Medium
- Pros: directly addresses user-impactful gap; avoids duplicate churn
- Cons: requires stronger test matrix and plan rewrite discipline
- Reuses: existing editor/runtime settings + service abort primitives

**Approach C: Platform Rewrite**
- Summary: unify all editor/AI flows behind a new orchestration layer.
- Effort: XL
- Risk: High
- Pros: maximum long-term coherence
- Cons: over-scope for current objective; high delivery risk
- Reuses: low

**Recommendation:** Choose Approach B because it preserves momentum while fixing the only high-value unresolved reliability path.

### Step 0D - Selective Expansion Decisions

Accepted into scope:
1. Request-scoped cancellation contract (`session id + abort owner`) across chat streaming.
2. Explicit cancellation state machine in UX (`in_progress`, `cancelling`, `cancelled`, `cancel_failed`, `partial_retained`).
3. Reliability metrics in verification (`abort p95`, orphan-stream count, token waste reduction).

Deferred:
1. Full editor options centralization across all editor surfaces.
2. Enterprise-level permission-profile hardening for Tauri capabilities.

Skipped:
1. Any rewrite that introduces new orchestration layers unrelated to cancellation/reliability outcomes.

### Step 0E - Temporal Interrogation

| Window | Human-team focus | CC-compressed equivalent | Decision to lock now |
|---|---|---|---|
| Hour 1 | pick canonical streaming ownership | ~5 min | request-scoped cancellation owner |
| Hour 2-3 | wire hooks and service signal path | ~10-15 min | prevent cross-request abort spillover |
| Hour 4-5 | handle close/unmount/new-send races | ~10 min | deterministic transition rules |
| Hour 6+ | tests, metrics, runbooks | ~10-15 min | add measurable ship criteria |

### Step 0F - Mode Selection

- Selected mode: `SELECTIVE_EXPANSION`
- Premise gate outcome: approved by user (`reframe_outcomes`)
- Scope intent: keep baseline plan shape, but only execute net-new deltas that improve user-facing reliability.

### CEO Dual Voices

**CODEX SAYS (CEO - strategy challenge):** unavailable in this run (`token_expired`, refresh token reused).  
**CLAUDE SUBAGENT (CEO - strategic independence):** plan drift is the core issue; only cancellation + measurable outcomes remain high leverage.

CEO DUAL VOICES - CONSENSUS TABLE:

| Dimension | Claude | Codex | Consensus |
|---|---|---|---|
| Premises valid | No | N/A | stale plan assumptions confirmed |
| Right problem | Partially | N/A | refocus on cancellation reliability |
| Scope calibration | No | N/A | duplicates removed |
| Alternatives explored | Partially | N/A | 3 approaches now explicit |
| Competitive risk covered | No | N/A | trust/reliability moat added |
| 6-month trajectory sound | Not yet | N/A | improved after reframe |

## CEO Review Sections (1-11)

### Section 1 - Architecture Review

```text
User Action (AI Chat)
   |
   v
useAIChat (request lifecycle owner)
   |
   v
UnifiedAIService.sendContextualMessageStream
   |
   +--> AIProviderFactory --> ServiceAdapter --> BackendProxyService --> backend / provider
   |
   +--> AbortController registry (request-scoped, not global-for-UX)
```

- Primary coupling risk: global abort semantics can kill unrelated streams if UI wiring is naive.
- Scaling risk: unbounded concurrent in-flight streams during rapid send/retry behavior.
- Rollback posture: feature-flag cancel UX pathway; disable new path while keeping legacy stream completion path operational.

### Section 2 - Error & Rescue Map

| Method / Codepath | What can go wrong | Exception class | Rescued? | Rescue action | User sees |
|---|---|---|---|---|---|
| `useAIChat` stream loop | component unmount mid-stream | AbortError / state update race | Partial | abort + guard state writes | deterministic cancelled state |
| `UnifiedAIService.sendContextualMessageStream` | provider timeout | TimeoutError | Partial | retry or degrade to non-stream | actionable retry message |
| `BackendProxyService.stream` | malformed SSE chunk | ParseError | Yes | skip bad chunk + continue | no crash, partial answer |
| `BackendProxyService.stream` | 401/429 upstream | HttpError | Yes | fail fast with contextual message | auth/rate-limit guidance |
| cancellation control | wrong request aborted | OwnershipError | No (gap) | enforce request id ownership | prevent unrelated interruption |

### Section 3 - Security & Threat Model

- Threat: cancellation endpoint/handler used as broad abort primitive. Likelihood: Medium. Impact: Medium-High.
- Threat: stale docs can cause local misconfiguration that routes secrets incorrectly. Likelihood: Medium. Impact: Medium.
- Threat: broad Tauri capabilities remain high trust; not changed in this scope but must stay explicitly acknowledged.

### Section 4 - Data Flow & Interaction Edge Cases

```text
INPUT(send/cancel) -> VALIDATE(owner/session) -> STREAM -> UI UPDATE -> COMPLETE/ABORT
   |                     |                       |        |              |
   +--nil query          +--wrong session id     +--timeout +--unmount   +--partial retained
   +--double send        +--already aborted      +--429     +--chat close +--cancel failed
```

Unhandled edge cases flagged:
- start B while A still in-flight (must auto-cancel A deterministically)
- close chat during streaming (must abort and suppress stale updates)
- cancel after completion (must no-op with stable UI state)

### Section 5 - Code Quality Review

- Plan references stale file target (`StreamingAIService.ts`) and wrong editor ownership path (`useEditorState.ts` for Monaco options).
- Naming mismatch (`cancelActiveGeneration` vs `cancelActiveGenerations`) invites implementation drift.
- Reframe enforces explicit ownership names and one canonical editor options source.

### Section 6 - Test Review

- New UX flows: cancel button path, close-chat path, replace-stream path.
- New data flows: request-scoped abort signal propagation through provider adapter/proxy.
- New codepaths: race transitions (`in_progress -> cancelling -> cancelled`).
- Required test artifact generated: `C:\Users\fresh_zxae3v6\.gstack\projects\vibe-tech-monorepo\fresh_zxae3v6-refactor-monetization-hasfeature-dedup-test-plan-20260626-103500.md`.

### Section 7 - Performance Review

- Target slow path: abort propagation latency (user click to stream halt).
- Risk: orphaned streams waste tokens and CPU.
- Acceptance target: abort p95 < 300ms local, zero orphaned streams in standard interruption scenarios.

### Section 8 - Observability & Debuggability

- Implemented structured lifecycle events:
  - `generation_request_started`
  - `stream_started`
  - `stream_cancel_requested`
  - `stream_cancelled`
  - `stream_completed`
  - `stream_error`
  - `orchestrator_code_correction_route_selected` / `orchestrator_strategy_selected`
- Event dimensions intentionally avoid payload content and include rollout-safe metadata (`request_mode`, `route`, `strategy`, `reason`, `result_status`, `chunk_count`, `duration_ms`, `current_file_type`).
- Telemetry service now sanitizes sensitive keys/values before enqueueing events.

### Section 9 - Deployment & Rollout

```text
1) Land request ownership + tests
2) Land UI state transitions + cancel affordance
3) Enable `VITE_ENABLE_CANCEL_LIFECYCLE=true` for internal users
4) Enable `VITE_ENABLE_CODE_CORRECTION_ROUTE=true` for internal users
5) Validate telemetry + UX metrics in canary window
6) Keep kill switches available for rollback during rollout window
```

Rollback flow:

```text
set VITE_ENABLE_CANCEL_LIFECYCLE=false and VITE_ENABLE_CODE_CORRECTION_ROUTE=false
-> keep baseline stream/orchestration path
-> verify no stale errors
```

### Section 10 - Long-Term Trajectory

- Reversibility: 4/5 (feature flag + incremental path).
- Debt avoided: duplicate plan churn, stale target execution, hidden cancellation races.
- Platform potential: request ownership model can be reused by future agent workflows.

### Section 11 - Design & UX Review

User flow diagram:

```text
Prompt typed -> Send -> Streaming response
   |             |
   |             +-> Cancel pressed -> Cancelling -> Cancelled -> Ready for next prompt
   |
   +-> Error state -> Recover CTA -> Retry
```

- State coverage needed explicitly in plan (loading/empty/error/partial/success).
- Recommendation: run dedicated `/plan-design-review` after engineering scope lock.

## What Already Exists

- `@tauri-apps/plugin-window-state` already configured and registered.
- `tauri-plugin-os` already configured and registered.
- Monaco features listed as "new" are already active in `src/components/Editor.tsx`.
- cancellation primitives already exist in service/proxy; missing piece is request-scoped UX ownership.

## NOT in Scope

- Full architecture rewrite of AI orchestration.
- New Monaco language-server integrations in this pass.
- Broad Tauri capability refactor beyond explicit mention in risk notes.
- Enterprise policy profile redesign.

## Dream State Delta

- Before: mixed stale and duplicate scope, low-confidence execution map.
- After reframe: high-signal scope tied to user-facing reliability and measurable outcomes.
- Remaining gap to 12-month ideal: automated plan-vs-code drift checks and stronger operational dashboards.

## Error & Rescue Registry

| Codepath | Failure mode | Rescue action | User impact |
|---|---|---|---|
| chat send while prior stream active | concurrency race | cancel previous session by owner id | deterministic single active response |
| provider stream timeout | timeout | abort + retry guidance | no hung spinner |
| malformed SSE chunk | parse | skip chunk, keep stream alive | partial output without crash |
| chat close during stream | lifecycle | abort and suppress stale updates | clean close, no ghost updates |
| cancel on completed stream | stale action | no-op + telemetry | stable UX |

## Failure Modes Registry

| Codepath | Failure Mode | Rescued? | Test? | User Sees? | Logged? |
|---|---|---|---|---|---|
| `useAIChat` loop | stale update after unmount | No (current gap) | No (current gap) | potential ghost text | Partial |
| `UnifiedAIService` stream | timeout | Yes | Partial | retry guidance | Yes |
| `BackendProxyService` stream | malformed SSE | Yes | Yes | partial response | Yes |
| cancellation owner check | wrong request aborted | No (current gap) | No (current gap) | unrelated response interruption | No |

## Autoplan Phase 2 - Design Review

- Overall design readiness: **3/10** (subagent).
- Codex design voice: unavailable this run.

Design litmus scorecard:

| Dimension | Claude | Codex | Consensus |
|---|---|---|---|
| Information hierarchy | weak | N/A | needs user-flow-first rewrite |
| State completeness | weak | N/A | must add explicit state matrix |
| Journey coherence | partial | N/A | cancellation journey undefined |
| Specificity | weak | N/A | stale targets create ambiguity |
| Accessibility/responsiveness intent | partial | N/A | baseline present, plan vague |
| Implementation haunt risks | high | N/A | wrong file ownership today |
| Design readiness | 3/10 | N/A | rebaseline required |

## Autoplan Phase 3 - Engineering Review

- Engineering readiness score: **3/10** (subagent).
- Codex eng voice: unavailable this run.

ENG DUAL VOICES - CONSENSUS TABLE:

| Dimension | Claude | Codex | Consensus |
|---|---|---|---|
| Architecture sound | partial | N/A | stale targets fixed by reframe |
| Test coverage sufficient | no | N/A | expanded matrix required |
| Performance risks covered | partial | N/A | add abort latency + orphan metrics |
| Security threats covered | partial | N/A | cancellation ownership enforcement needed |
| Error paths handled | partial | N/A | lifecycle races still gaps |
| Deployment risk manageable | yes with flags | N/A | staged rollout recommended |

Architecture ASCII (implementation target):

```text
AIChat UI
  -> useAIChat (session owner)
     -> UnifiedAIService (request signal wiring)
        -> AIProviderFactory
           -> ServiceAdapter
              -> BackendProxyService
                 -> /api/ai/* provider routes
```

Test diagram (codepaths to coverage):

```text
NEW UX FLOWS:
- cancel while streaming
- send B while A streaming
- close chat mid-stream

NEW DATA FLOWS:
- request id + abort signal propagation

NEW CODEPATHS:
- ownership guard, abort transitions, stale-update guard

NEW ERROR/RESCUE PATHS:
- timeout, malformed SSE, auth/rate-limit, no-op cancel
```

Test plan artifact:
- `C:\Users\fresh_zxae3v6\.gstack\projects\vibe-tech-monorepo\fresh_zxae3v6-refactor-monetization-hasfeature-dedup-test-plan-20260626-103500.md`

## Autoplan Phase 3.5 - DX Review

- DX score: **4.7/10** (subagent).
- Codex DX voice: unavailable this run.

Developer journey map (9 stages):
1. find canonical entry docs
2. install prerequisites
3. install workspace dependencies
4. configure AI credentials
5. run first dev command
6. open first file/edit flow
7. run baseline quality checks
8. validate first behavior change
9. update safely with migration guidance

TTHW assessment:
- current: ~90 min median
- target: ~25 min median

DX implementation checklist:
- canonical `START_HERE` doc
- docs lint for legacy terms/commands
- command naming cleanup
- contributor migration section
- actionable error contract for AI failures

## Cross-Phase Themes

1. **Plan drift from code reality** appeared independently in CEO, Design, Eng, and DX voices.
2. **Cancellation ownership is the highest-value unresolved path** across strategy, UX, and architecture.
3. **Verification must be outcome-based, not only command-pass based** (latency/cancel/orphan metrics).

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|---|---|---|---|---|---|
| 1 | CEO | Rebaseline stale plan assumptions | Mechanical | Completeness | avoids duplicate implementation churn | keep stale targets |
| 2 | CEO | Select outcome-driven approach B | Taste | Pragmatic + explicit | best ROI with low rewrite risk | rewrite platform |
| 3 | CEO | Select mode `SELECTIVE_EXPANSION` | Mechanical | Bias to action | preserves scope while exposing targeted upgrades | scope reduction |
| 4 | CEO | Accept cancellation ownership expansion | Mechanical | Boil lakes | direct blast-radius fix under 1 day CC | defer core reliability gap |
| 5 | CEO | Accept explicit UX state matrix | Mechanical | Completeness | prevents undefined interruption behavior | implicit states |
| 6 | CEO | Accept reliability metrics gate | Mechanical | Completeness | prevents false-positive "done" | command-only verification |
| 7 | CEO | Defer full editor options centralization | Taste | Pragmatic | useful but non-blocking for this objective | force into this pass |
| 8 | CEO | Defer enterprise Tauri policy redesign | Mechanical | Scope discipline | outside immediate blast radius | scope creep |
| 9 | Design | Remove already-implemented UI tasks from net-new scope | Mechanical | DRY | avoids redoing shipped behavior | duplicate UI edits |
| 10 | Eng | Retarget AI changes to real streaming path files | Mechanical | Explicit over clever | stale targets would miss production path | pseudo-file edits |
| 11 | Eng | Require request-scoped ownership tests | Mechanical | Completeness | catches race/cross-abort failures | rely on smoke tests only |
| 12 | DX | Add doc migration + canonical onboarding follow-up | Taste | Boil lakes | reduces TTHW and contributor errors | leave docs drift |

## Deferred to TODOS.md

- Centralize Monaco options ownership across every editor surface.
- Harden Tauri capability profile for stricter least-privilege presets.
- Add docs CI lint for legacy setup terms and stale command paths.

## Implementation Tasks

Synthesized from all phases:

- [ ] **T1 (P1, human: ~3h / CC: ~20min)** — `useAIChat` — add request-scoped generation session ownership and abort contract.
  - Surfaced by: Phase 3 / Section 4
  - Files: `apps/vibe-code-studio/src/hooks/useAIChat.ts`, `apps/vibe-code-studio/src/services/ai/UnifiedAIService.ts`
- [ ] **T2 (P1, human: ~2h / CC: ~15min)** — AI streaming UX — implement explicit cancellation state machine and visible transitions.
  - Surfaced by: Phase 2 / Section 11
  - Files: `apps/vibe-code-studio/src/components/AIChat*`, `apps/vibe-code-studio/src/hooks/useAIChat.ts`
- [ ] **T3 (P1, human: ~2h / CC: ~15min)** — stream safety — prevent cross-request abort spillover and stale UI updates after unmount.
  - Surfaced by: Phase 3 / Section 2
  - Files: `apps/vibe-code-studio/src/hooks/useAIChat.ts`, `apps/vibe-code-studio/src/services/ai/ProviderAdapter.ts`
- [ ] **T4 (P1, human: ~2h / CC: ~15min)** — test coverage — add cancellation race and lifecycle tests from test artifact.
  - Surfaced by: Phase 3 / Section 6
  - Files: `apps/vibe-code-studio/src/__tests__/...`
- [x] **T5 (P2, human: ~1h / CC: ~10min)** — observability — emit structured generation cancel metrics/events.
  - Surfaced by: Phase 3 / Section 8
  - Files: `apps/vibe-code-studio/src/services/*telemetry*`, `apps/vibe-code-studio/src/hooks/useAIChat.ts`
- [x] **T6 (P2, human: ~1h / CC: ~10min)** — plan cleanup — remove already-complete runtime/editor tasks from this plan and replace with verified baseline section.
  - Surfaced by: CEO + Design
  - Files: `docs/PLAN-vcs-optimization.md`
- [x] **T7 (P2, human: ~1.5h / CC: ~10min)** — rollout guard — stage cancel UX behind a flag with rollback notes.
  - Surfaced by: Phase 3 / Section 9
  - Files: `apps/vibe-code-studio/src/config/*`, `docs/PLAN-vcs-optimization.md`
- [ ] **T8 (P3, human: ~2h / CC: ~15min)** — docs DX — publish canonical VCS onboarding and migration map.
  - Surfaced by: Phase 3.5
  - Files: `apps/vibe-code-studio/docs/*`, `apps/vibe-code-studio/AGENTS.md`

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---|---|---|
| CEO Review | `/autoplan` (Phase 1) | Scope & strategy alignment | 1 | issues_open | stale assumptions removed; 3 scope additions accepted; 2 deferred |
| Codex Review | `/autoplan` outside voice | Independent second opinion | 0 | unavailable | auth/token failure in this run |
| Eng Review | `/autoplan` (Phase 3) | Architecture + tests | 1 | issues_open | cancellation ownership/test gaps remain |
| Design Review | `/autoplan` (Phase 2) | UI/UX intentionality | 1 | issues_open | readiness 3/10; state matrix and journey gaps |
| DX Review | `/autoplan` (Phase 3.5) | Developer experience | 1 | issues_open | score 4.7/10; docs/command drift and migration gaps |

- **VERDICT:** CEO + Design + Eng + DX reviewed; implementation-ready task list created; final approval gate passed (`approve_as_is`).
NO UNRESOLVED DECISIONS
