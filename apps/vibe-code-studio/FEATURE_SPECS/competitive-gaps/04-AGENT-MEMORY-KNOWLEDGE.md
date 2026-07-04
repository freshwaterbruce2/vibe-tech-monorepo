# Feature Spec: Agent Memory & Knowledge Items

**Status**: 📋 PLANNED (PARTIAL — `StrategyMemory` persists ReAct action patterns, `MetacognitiveLayer` reflects mid-session, but neither produces durable, human-readable cross-session facts)
**Priority**: MEDIUM-HIGH
**Effort**: M (1-2wk) — builds on existing SQLite persistence path, adds a distillation pass + panel UI
**Competitor parity**: Antigravity Knowledge Items — a Knowledge subagent distills durable facts each session and auto-loads them next session. (Note: Cursor removed its general Memories feature in Nov 2025 — do not target Cursor's model.)
**Dependencies**: existing SQLite (`D:\databases\vibe_studio.db`), monorepo `memory` MCP (`mcp__memory__*`), `D:\memory_bank`

---

## User Story

As a developer running many VCS sessions on the same codebase, I want the agent to remember durable facts — "this repo uses Express 5 on port 5177," "we decided against X approach because Y broke" — across sessions without me re-explaining them, and I want to see and edit exactly what it remembers, so that the agent doesn't repeat mistakes or ask questions I've already answered.

## Why VCS lacks this today

`StrategyMemory` stores _action patterns_ (problem signature → successful ReAct cycle → confidence/usage stats) keyed by a hashed signature — it's optimized for "have I solved this exact shape of problem before," not for durable prose facts a human can read or edit. `MetacognitiveLayer` reflects within a session (self-critique on ReAct cycles) but doesn't persist anything across sessions. Neither produces the kind of curated, markdown-readable "Knowledge Item" a user can review, correct, or delete.

## Acceptance Criteria

1. ⬜ A `KnowledgeItem` type (markdown body + `{ id, title, category, sourceSessionId, createdAt, staleness, confidence }` metadata) is defined and persisted to SQLite
2. ⬜ A manual "Add Knowledge Item" action in a new Knowledge panel lets users hand-write facts (architecture decisions, gotchas, conventions)
3. ⬜ At session start, Knowledge Items are semantically matched against the opened workspace/files and the top-N relevant ones are auto-injected into the system prompt
4. ⬜ A Knowledge subagent runs at session end (or on-demand via command), reviewing the session transcript and distilling durable facts distinct from one-off task details
5. ⬜ Distilled items are staged for user approval before persisting — no silent auto-write of unreviewed "facts" into permanent memory
6. ⬜ The Knowledge panel lists all items, filterable by category, with inline edit/delete
7. ⬜ Staleness detection flags an item when referenced files/symbols no longer exist or have materially changed since the item was created
8. ⬜ Conflicting items (two KIs asserting contradictory facts about the same topic) are surfaced together, not silently both injected
9. ⬜ Knowledge Items optionally sync to the monorepo `memory` MCP (`memory_add_semantic`) and/or `D:\memory_bank`, scoped per-workspace to avoid cross-project bleed
10. ⬜ Auto-loaded KI injection is capped (token budget) and visible in the prompt-debug view so users can see exactly what was injected
11. ⬜ Each KI records `sourceSessionId` so a user can trace "why does the agent believe this" back to the originating conversation, not just an opaque timestamp
12. ⬜ Deleting a KI is immediate and local-only by default — if it was previously synced to the `memory` MCP, deletion prompts whether to also retract it there, never auto-propagates silently

## Example `KnowledgeItem` shape

```typescript
interface KnowledgeItem {
  id: string;
  title: string; // "Backend runs on Express 5, port 5177"
  body: string; // markdown, the durable fact itself
  category: 'architecture' | 'decision' | 'convention' | 'gotcha';
  sourceSessionId?: string; // traceable origin if distilled, absent if manual
  createdAt: string; // ISO timestamp
  staleness: 'fresh' | 'unverified' | 'stale';
  confidence: number; // 0-100, distiller's self-rated confidence
  scopedPaths?: string[]; // optional glob(s) this KI is relevant to, mirrors Rule.globs
}
```

This deliberately mirrors the shape `RulesParser`'s `Rule` interface already uses (`scope`, glob-based applicability) so `KnowledgeMatcher` can lean on the same file-relevance logic pattern instead of inventing a second matching model.

## Architecture / Solution

```
Session end ──► KnowledgeDistillerAgent (new)
                  reads: ConversationManager transcript
                  writes: staged KnowledgeItem[] → user approval → DatabaseService (SQLite)
                                                                          │
Session start ──► KnowledgeMatcher (new)                                 │
                  reads: DatabaseService KIs + open workspace context ◄──┘
                  writes: top-N matched items → SystemPromptBuilder injection
                                                                          │
                  optional sync ──► memory MCP (memory_add_semantic) / D:\memory_bank
```

`StrategyMemory` and `MetacognitiveLayer` are left untouched — this is a new, parallel memory tier for durable prose facts, not a replacement for action-pattern memory. `KnowledgeMatcher` reuses the same relevance-scoring shape `StrategyMemory.calculateRelevance`/`calculateStringSimilarity` already implements (Jaccard-style term overlap, or the existing `SemanticSearchService` embedding path if one exists), so no new similarity infrastructure is needed for Phase 1.

## Implementation (phased)

### Phase 1 — Manual KIs + auto-load by semantic match

- `src/services/ai/KnowledgeStore.ts`: CRUD for `KnowledgeItem` against `DatabaseService` (new `knowledge_items` table)
- `src/services/ai/KnowledgeMatcher.ts`: match KIs against session/workspace context, reusing `StrategyMemory`'s similarity scoring pattern
- `src/components/KnowledgePanel/`: list, add, edit, delete UI
- Wire matched KIs into `SystemPromptBuilder` injection, token-budgeted

### Phase 2 — End-of-session distillation subagent

- `src/services/specialized-agents/KnowledgeDistillerAgent.ts`: reads `ConversationManager` transcript, proposes candidate `KnowledgeItem`s
- Approval UI: staged items shown in Knowledge panel with accept/reject/edit before persist
- Command Palette: "Distill Session Knowledge" for on-demand runs mid-session

### Phase 3 — Conflict/staleness + memory-MCP sync

- Staleness checker: cross-reference KI text against current file/symbol existence (best-effort, not full re-verification)
- Conflict detector: flag KIs with overlapping topic + contradictory assertions for manual resolution
- Optional sync toggle: push approved KIs to `mcp__memory__memory_add_semantic`, scoped by workspace path to avoid mixing facts across unrelated repos

### Distillation prompt shape (Phase 2)

`KnowledgeDistillerAgent` is a single-purpose specialized agent, not a general chat turn — its system prompt constrains it to extraction only:

```
Given this session transcript, extract 0-5 durable facts about the codebase or
project decisions. Exclude: task-specific details, one-off fixes, anything
true only for this single change. Include: architecture facts, explicit
decisions with stated rationale, recurring gotchas mentioned more than once.
For each fact, cite the message index it came from.
```

The "cite the message index" instruction is what populates `sourceSessionId` traceability (Acceptance Criteria #11) and gives the approval UI something concrete to show the user beyond the bare distilled sentence.

## Integration points (existing code to hook into)

- `src/services/ai/StrategyMemory.ts` — sibling memory tier; same SQLite desktop-first / storage-fallback pattern, not reused code but reused _approach_
- `src/services/ai/MetacognitiveLayer.ts` — potential source signal for "this was a hard-won insight" flagging during distillation
- `src/services/ai/ConversationManager.ts` — transcript source for `KnowledgeDistillerAgent`
- `src/services/SemanticSearchService.ts` — reuse embedding/similarity path if present, else fall back to `StrategyMemory`-style term overlap
- `src/services/DatabaseService.ts` — new `knowledge_items` table alongside existing `strategy_memory`
- `src/services/SessionManager.ts` — hook for session-start (load) and session-end (distill) triggers
- Monorepo `memory` MCP (`mcp__memory__memory_add_semantic`, `mcp__memory__memory_search_semantic`) + `D:\memory_bank` — optional cross-tool sync target

## Test Scenarios

- Vitest: `KnowledgeStore.test.ts` — CRUD round-trip, staleness field defaults, SQLite persistence survives reload (mirrors `StrategyMemory`'s existing SQLite test pattern)
- Vitest: `KnowledgeMatcher.test.ts` — top-N relevance ranking against a fixed KI set, token-budget cap enforced
- Vitest: `KnowledgeDistillerAgent.test.ts` — feed a synthetic transcript, assert distilled candidates exclude one-off task noise ("fixed typo on line 12") and include durable facts ("backend runs on port 5177")
- Playwright: open Knowledge panel, add an item, start a new session with a matching file open, assert the item appears in the prompt-debug injected-context view
- Playwright: end a session, assert distillation staging UI appears with accept/reject controls, reject one item, assert it's not persisted
- Vitest: `KnowledgeStore.delete.test.ts` — deleting a synced KI prompts a retraction choice; deleting an unsynced KI removes it locally with no MCP call

## Success Metrics

- Auto-loaded KIs relevant (user-rated) in >70% of sessions where at least one KI exists for the workspace
- Distillation false-positive rate (task noise mistaken for durable fact) < 20% on a dogfood sample of 20 VCS-on-VCS sessions
- Zero silent overwrites — every persisted KI traceable to either manual entry or an explicit approval action

## Why "Antigravity's model," not Cursor's

This is worth calling out explicitly because it's a moving target: Cursor shipped a general Memories feature and then removed it (Nov 2025), reportedly over quality/trust issues with auto-generated memories polluting context. The approval-gate in Acceptance Criteria #5 and the traceability in #11 are direct responses to that failure mode — an unreviewed auto-write pipeline is exactly what soured Cursor's version. Antigravity's Knowledge Items pattern (subagent distills, user reviews, item is then durable) is the one being targeted here specifically because it keeps a human in the loop before anything becomes "the agent's belief" for future sessions.

---

**Risks / Open questions**: Distillation quality depends heavily on prompt design for `KnowledgeDistillerAgent` — expect iteration after Phase 2 ships. Should KI sync to `memory` MCP be opt-in per-workspace or a global setting? Recommend opt-in per-workspace to avoid leaking one project's facts into another's context. How should `scopedPaths` interact with Nx monorepo project boundaries — should a KI distilled while working in one app default to being scoped to that app's directory tree rather than the whole workspace?
**Sequencing**: Wave 2. Independent of spec 03; Phase 1 can ship without Phases 2-3. Not a dependency for specs 15-17.
