# Feature Spec: Open Agent Standards (AGENTS.md / SKILL.md / ACP)

**Status**: 📋 PLANNED (PARTIAL — `RulesParser` reads `.cursorrules`/`.deepcoderules` only, a VCS-proprietary format with no cross-tool interop)
**Priority**: MEDIUM-HIGH
**Effort**: M (1-2wk) — three independent parsers/loaders on existing infrastructure, no new runtime
**Competitor parity**: `AGENTS.md` (Cursor, Codex, Copilot, Gemini CLI, Windsurf, Zed all read it), `SKILL.md`/agentskills.io (Cursor & Antigravity Skills, Claude Skills), ACP — Agent Client Protocol (Zed + JetBrains, JSON-RPC "LSP for agents")
**Dependencies**: `js-yaml`, `minimatch` (already used by `RulesParser`), JSON-RPC over stdio for ACP, existing `MCPService` transport patterns

---

## User Story

As a developer who also uses Cursor, Copilot, or Zed on the same repo, I want VCS to read the same `AGENTS.md` and `SKILL.md` files those tools already read, and optionally let an ACP-speaking client (Zed, JetBrains, Copilot CLI) drive a VCS agent, so that I maintain one set of instructions instead of a VCS-only `.deepcoderules` file nobody else's tooling understands.

## Why VCS lacks this today

`RulesParser` only understands two VCS-specific formats: legacy `.cursorrules` (plain text) and modern `.deepcoderules` (YAML frontmatter + content, matched by glob via `minimatch`). It has no concept of `AGENTS.md`'s nested-directory precedence, no `SKILL.md` progressive-disclosure loading, and no JSON-RPC surface at all — VCS agents are only drivable from inside VCS itself.

## Acceptance Criteria

1. ⬜ `AGENTS.md` at workspace root is discovered and parsed on workspace load, injected into the system prompt alongside existing `.deepcoderules` output
2. ⬜ Nested `AGENTS.md` files (e.g. `packages/api/AGENTS.md`) are discovered and merged with root-level content, closest-directory-wins on conflict
3. ⬜ `AGENTS.md` frontmatter activation modes (`always`, `glob`-scoped, `manual`) are respected using the same glob-matching path `RulesParser.matchesFile` already uses
4. ⬜ A `SKILL.md` loader discovers skills from `.vcs/skills/`, `.claude/skills/`, and `.cursor/skills/`, indexing `name` + `description` only at startup (no full-body load)
5. ⬜ Skill bodies load on-demand when the active task's description semantically matches a skill's `description` field (progressive disclosure, not always-loaded)
6. ⬜ An ACP server exposes VCS's agent loop over JSON-RPC 2.0 on stdio, implementing `initialize`, `session/new`, `session/prompt`, `session/update` per the ACP spec
7. ⬜ Zed or another ACP client can connect to the VCS ACP server, start a session, and receive streamed turn updates for a real agent run
8. ⬜ An ACP _client_ mode lets VCS launch and drive an external ACP-compliant agent as an alternative provider, reusing `MCPService`'s subprocess/stdio transport plumbing
9. ⬜ Conflicting instructions between `AGENTS.md`, `.deepcoderules`, and `SKILL.md` are surfaced in the Rules Editor UI, not silently merged
10. ⬜ All three loaders are individually toggleable in settings; disabling one doesn't break the others
11. ⬜ `AGENTS.md` build/test/lint command blocks (a common convention: fenced shell blocks under a "Commands" heading) are optionally parsed and offered as one-click actions, mirroring how `tasks.json` (spec 02) surfaces commands
12. ⬜ The ACP server reports its own capabilities (`initialize` response) honestly — only methods VCS's `ExecutionEngine` can actually back are advertised, no stubbed no-ops that silently no-op for a connected client

## Example `AGENTS.md` shape (for reference, not invented)

````markdown
---
activation: glob
globs: ['src/api/**/*.ts']
---

# API service conventions

Use Express 5 route handlers with async/await; no callback-style middleware.
Validate request bodies with zod before touching the database.

## Commands

​`bash
pnpm nx test vibe-code-studio
​`
````

This is the same two-part shape (`frontmatter` + `content`) `RulesParser.parseModern` already splits on `---` delimiters for `.deepcoderules` — `AgentsMdLoader` reuses that split/parse logic, only the frontmatter _keys_ differ (`activation`/`globs` vs. `alwaysApply`/`priority`/`tags`), so translating into the existing internal `Rule` interface is a field-mapping exercise, not new parsing logic.

## Example `SKILL.md` shape (agentskills.io convention)

```markdown
---
name: db-migration-review
description: Use when reviewing a SQL migration file for destructive operations, missing indexes, or backward-incompatible column changes.
---

# Migration review checklist

1. Flag any DROP COLUMN / DROP TABLE without a prior deprecation window.
2. Confirm new NOT NULL columns have a DEFAULT or a backfill step.
3. Check FK additions specify ON DELETE behavior explicitly.
```

`SkillMdLoader` indexes only `name` + `description` for every discovered skill at startup — the checklist body above is not read into memory until the matcher scores this skill's `description` against the active task and clears a relevance threshold. This is what makes it "progressive disclosure" rather than just another always-on rules file: a workspace with 50 skills costs the same startup time as one with 5, because only metadata is scanned upfront.

## Architecture / Solution

Three independently shippable layers on top of existing prompt-assembly code:

```
Workspace load
  ├─ RulesParser (existing: .cursorrules / .deepcoderules)
  ├─ AgentsMdLoader (new: AGENTS.md, nested precedence)
  └─ SkillMdLoader (new: index at startup, hydrate body on match)
         │
         ▼
   PromptBuilder / SystemPromptBuilder
   (existing: assembles final system prompt from all rule sources)

ACP (separate surface, not prompt assembly):
  External ACP client (Zed) ⇄ JSON-RPC/stdio ⇄ AcpServer ⇄ ExecutionEngine
  VCS ⇄ JSON-RPC/stdio ⇄ AcpClient ⇄ external agent binary (reuses MCPService transport)
```

`AgentsMdLoader` and `SkillMdLoader` produce the same internal `Rule`-shaped output `RulesParser` already produces, so `PromptBuilder`/`SystemPromptBuilder` need only a source-tagging change, not a rewrite. The ACP server/client is new surface area — a thin JSON-RPC shim around `ExecutionEngine`, using the same subprocess/stdio pattern `MCPService` already implements for launching MCP servers, just inverted (VCS is the server being connected to, not the client connecting out).

## Implementation (phased)

### Phase 1 — AGENTS.md

- `src/services/AgentsMdLoader.ts`: discover root + nested `AGENTS.md`, parse frontmatter with `js-yaml` (same lib `RulesParser` uses), merge closest-directory-wins
- Extend `PromptBuilder`/`SystemPromptBuilder` to accept a second rule source, tag origin for the Rules Editor UI
- Settings toggle: "Read AGENTS.md files"

### Phase 2 — SKILL.md

- `src/services/SkillMdLoader.ts`: startup scan of `.vcs/skills/`, `.claude/skills/`, `.cursor/skills/` for `SKILL.md` frontmatter (`name`, `description` only)
- Semantic match against active task description (reuse `SemanticSearchService` embedding path if present; else keyword/Jaccard fallback matching `StrategyMemory.calculateStringSimilarity`'s approach)
- Lazy body hydration on match, injected as a scoped rule for that turn only

### Phase 3 — ACP server + client

- `src/services/acp/AcpServer.ts`: JSON-RPC 2.0 over stdio, `initialize`/`session/new`/`session/prompt`/`session/update` methods wrapping `ExecutionEngine`
- `src/services/acp/AcpClient.ts`: spawn + speak ACP to an external agent binary, reusing `MCPService`'s subprocess spawn/stdio-framing code
- Tauri sidecar registration for the ACP server binary/mode so external clients (Zed) can launch VCS headless

## Integration points (existing code to hook into)

- `src/services/RulesParser.ts` — `matchesFile`/`sortByPriority`/glob logic reused verbatim by `AgentsMdLoader`
- `src/services/CustomRulesEngine.ts` — existing rule-merge orchestration gets a third source
- `src/services/ai/PromptBuilder.ts`, `src/services/ai/SystemPromptBuilder.ts` — final assembly point for all rule sources
- `src/components/RulesEditor/` — UI surfaces AGENTS.md/SKILL.md sources and conflict warnings
- `src/services/MCPService.ts` — subprocess/stdio transport reused for ACP client mode

## Test Scenarios

- Vitest: `AgentsMdLoader.test.ts` — nested `AGENTS.md` precedence (child overrides parent on same key), malformed frontmatter doesn't crash the loader
- Vitest: `SkillMdLoader.test.ts` — index-only scan doesn't read skill bodies; body hydrates only after a matching task description
- Vitest: `AcpServer.test.ts` — mock JSON-RPC client, assert `initialize` → `session/new` → `session/prompt` returns streamed `session/update` notifications
- Integration: spawn `AcpServer` as a child process, drive it with a minimal hand-rolled JSON-RPC client over stdio, assert a real `ExecutionEngine` run completes
- Playwright: open Rules Editor with conflicting `AGENTS.md` + `.deepcoderules` content, assert conflict banner renders
- Vitest: `AgentsMdLoader.commands.test.ts` — fenced `bash` block under a "Commands" heading parses into a one-click action list, malformed/missing heading degrades gracefully to "no commands found" rather than throwing
- Playwright: settings toggle "Read AGENTS.md files" off, assert an `AGENTS.md`-only rule no longer appears in the prompt-debug injected-context view while `.deepcoderules` content still does

## Success Metrics

- A repo with only `AGENTS.md` (no `.deepcoderules`) produces equivalent prompt injection to today's `.deepcoderules` for an equivalent ruleset
- Skill index scan on a workspace with 20 skills completes in < 100ms (metadata-only, no body reads)
- Zed (or a hand-rolled ACP test client) completes a full `session/prompt` → `session/update` round trip against the VCS ACP server
- Zero regressions in existing `.cursorrules`/`.deepcoderules` behavior — `RulesParser.test.ts`'s existing suite passes unmodified after `AgentsMdLoader`/`SkillMdLoader` land alongside it

## Why this is cheap credibility, not just interop

None of the three standards require VCS to change its own agent architecture — `AGENTS.md` and `SKILL.md` are just additional _input_ formats feeding the same `PromptBuilder`/`SystemPromptBuilder` pipeline that already exists, and ACP is an additional _transport_ wrapping the same `ExecutionEngine` that already runs local agent turns. The cost is almost entirely in format-translation code, not new capability — which is why this is scoped M effort despite touching three separate standards. The payoff is disproportionate: a user evaluating VCS against Cursor/Zed/Copilot sees it "just work" with files already in their repo, without VCS having to win on any single differentiated feature.

---

**Risks / Open questions**: ACP is a young spec (Zed + JetBrains only as of research) — Phase 3 risks chasing a moving target; scope it narrowly to the methods VCS's own `ExecutionEngine` can honestly support rather than the full spec surface. Should `SKILL.md` discovery also respect a `.gitignore`-style exclude list to avoid loading skills from `node_modules`-adjacent vendored dirs? Does `AGENTS.md`'s nested-precedence rule need to special-case monorepo package boundaries (Nx project roots) so a skill scoped to one app doesn't leak into a sibling app's context?
**Sequencing**: Wave 2. Independent of specs 04/15/16/17; Phase 1 (AGENTS.md) is low-risk and can ship standalone even if Phases 2-3 slip.
