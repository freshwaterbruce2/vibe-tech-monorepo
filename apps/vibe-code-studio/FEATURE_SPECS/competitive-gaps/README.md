# Vibe Code Studio — Competitive Gap Plan

**Created**: 2026-07-03
**Author**: Claude Opus 4.8 (research + plan only — no code changes)
**Scope**: Every capability VCS is missing (or only partially has) vs **Cursor**, **VS Code**, **Google Antigravity**, and **Windsurf/Cascade** — each with a detailed, implementable integration spec in this folder.
**Mode**: PLAN ONLY. Nothing here is built yet. These are `📋 PLANNED` specs in the same house style as the shipped `../FEATURE_SPECS/*.md`.

---

## The core architectural fact driving this plan

VCS is a **from-scratch Monaco + Tauri 2** AI editor. Cursor, Antigravity, Windsurf, and VSCodium are all **VS Code forks** — they _inherit_ LSP, DAP debugging, the extension host, remote dev, notebooks, task runner, test explorer, settings sync, and theming **for free**. VCS has none of that by inheritance and must build each deliberately.

The upside: VCS already has a **strong AI/agent core** most forks bolt on awkwardly — inline completion (monacopilot), Cmd-K edits, multi-file edit approval, MCP client, specialized agents, semantic search, custom rules engine, screenshot-to-code, background tasks, real-time collab (yjs). So the gap is lopsided: **weak on classic IDE platform, strong-but-incomplete on agentic**.

This plan closes both sides.

---

## What VCS already has (baseline — not re-planned here)

Monaco editor + inline edit widget + diff/multi-file diff · monacopilot tab completion · Cmd-K inline edit · AI chat / Agent Mode / Enhanced Agent Mode · specialized agents (frontend/backend/security/perf/tech-lead) + orchestrator · MCP client (`MCPService`, `MCPToolRegistry`, `MCPPanel`) · Git panel + GitHub service · xterm terminal · global + semantic search · custom rules engine (`RulesParser`, `RulesEditor`) · plugin manager + custom marketplace · SSH command exec (`RemoteConnectionManager`) · screenshot-to-code · AI code review + multi-agent review · background task system · workspace templates · command palette.

---

## Gap roadmap (prioritized by impact-to-effort)

Effort scale: **S** ≤3 days · **M** 1–2 weeks · **L** 3–6 weeks · **XL** 2+ months.
Status: **Missing** = none · **Partial** = has a weaker/related piece.

### Wave 1 — Cheap credibility + agentic quick wins

| #   | Feature                                                        | Status                     | Effort | Parity                             | Spec                                                         |
| --- | -------------------------------------------------------------- | -------------------------- | ------ | ---------------------------------- | ------------------------------------------------------------ |
| 01  | VS Code theme + TextMate grammar import                        | Partial (Monaco defaults)  | S      | VS Code, all forks                 | [01-THEMING-TEXTMATE.md](01-THEMING-TEXTMATE.md)             |
| 02  | Task runner (`tasks.json` + problem matchers + Problems panel) | Missing                    | S–M    | VS Code                            | [02-TASK-RUNNER.md](02-TASK-RUNNER.md)                       |
| 03  | Open agent standards: `AGENTS.md` + `SKILL.md` + ACP           | Partial (custom rules)     | M      | Cursor, Antigravity, Windsurf, Zed | [03-OPEN-AGENT-STANDARDS.md](03-OPEN-AGENT-STANDARDS.md)     |
| 04  | Persistent agent memory / Knowledge Items                      | Partial (`StrategyMemory`) | M      | Antigravity KIs                    | [04-AGENT-MEMORY-KNOWLEDGE.md](04-AGENT-MEMORY-KNOWLEDGE.md) |
| 05  | Plan Mode (research → questions → plan file → dispatch)        | Partial (`TaskPlanner`)    | M      | Cursor Plan Mode                   | [05-PLAN-MODE.md](05-PLAN-MODE.md)                           |
| 06  | Settings Sync + Profiles                                       | Missing                    | M      | VS Code                            | [06-SETTINGS-SYNC-PROFILES.md](06-SETTINGS-SYNC-PROFILES.md) |

### Wave 2 — Core IDE intelligence + agentic depth

| #   | Feature                                                 | Status                        | Effort | Parity                                    | Spec                                                               |
| --- | ------------------------------------------------------- | ----------------------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------ |
| 07  | LSP client + language intelligence                      | Partial (Monaco basic)        | M–L    | VS Code (biggest clean win)               | [07-LSP-LANGUAGE-INTELLIGENCE.md](07-LSP-LANGUAGE-INTELLIGENCE.md) |
| 08  | Test Explorer + Testing API                             | Missing                       | M      | VS Code                                   | [08-TEST-EXPLORER.md](08-TEST-EXPLORER.md)                         |
| 09  | Verifiable, commentable Artifacts                       | Partial (task monitor)        | M      | Antigravity Artifacts                     | [09-VERIFIABLE-ARTIFACTS.md](09-VERIFIABLE-ARTIFACTS.md)           |
| 10  | Agent Manager surface + parallel/worktree agents        | Partial (Enhanced Agent Mode) | L      | Antigravity Manager, Cursor Agents Window | [10-AGENT-MANAGER-PARALLEL.md](10-AGENT-MANAGER-PARALLEL.md)       |
| 11  | Browser control + automated verification + walkthroughs | Missing                       | L      | Antigravity `/browser`                    | [11-BROWSER-VERIFICATION.md](11-BROWSER-VERIFICATION.md)           |

### Wave 3 — Heavy / strategic platform bets

| #   | Feature                                                    | Status                       | Effort | Parity                         | Spec                                                         |
| --- | ---------------------------------------------------------- | ---------------------------- | ------ | ------------------------------ | ------------------------------------------------------------ |
| 12  | DAP debugger (breakpoints, call stack, variables, watch)   | Missing                      | L–XL   | VS Code                        | [12-DAP-DEBUGGER.md](12-DAP-DEBUGGER.md)                     |
| 13  | Remote dev: Remote-SSH + Dev Containers + WSL              | Partial (SSH exec only)      | L–XL   | VS Code                        | [13-REMOTE-DEV.md](13-REMOTE-DEV.md)                         |
| 14  | Jupyter notebooks (`.ipynb`)                               | Missing                      | L      | VS Code                        | [14-NOTEBOOKS.md](14-NOTEBOOKS.md)                           |
| 15  | Automated PR review bot (Bugbot-equivalent)                | Partial (local review)       | M–L    | Cursor Bugbot                  | [15-PR-REVIEW-BOT.md](15-PR-REVIEW-BOT.md)                   |
| 16  | Agent task scheduling (`/schedule`)                        | Partial (monorepo scheduler) | M      | Antigravity `/schedule`        | [16-AGENT-SCHEDULING.md](16-AGENT-SCHEDULING.md)             |
| 17  | Cloud / background agents (remote runner + remote trigger) | Partial (local bg agents)    | XL     | Cursor cloud agents            | [17-CLOUD-AGENTS.md](17-CLOUD-AGENTS.md)                     |
| 18  | Extension host + Open VSX marketplace compatibility        | Partial (custom plugins)     | XL     | VS Code / Cursor / Antigravity | [18-EXTENSION-HOST-OPENVSX.md](18-EXTENSION-HOST-OPENVSX.md) |

---

## Strategic notes (read before sequencing)

- **#18 Extension host is a multi-quarter platform bet, not a sprint.** Building a VS Code-compatible extension host + API surface is XL and legally constrained — Microsoft's marketplace ToS bars non-Microsoft editors, so **Open VSX is the only lawful registry** (and it now has paid tiers above 75 req/s). A pragmatic middle path (curated Open VSX subset + your existing plugin model) is specced inside. Do not attempt a full extension host as a v1.
- **#12 DAP and #13 Remote-SSH are the two capabilities forks get _least_ for free anymore** — Microsoft blocked Remote-SSH/Dev Containers from forks in 2025, so even Cursor had to rebuild them. Tauri's Rust backend is actually _better_ suited to hosting adapter/agent processes than Electron. Sequence these late but know the playing field is level.
- **Agentic differentiation is the more defensible moat** than chasing full extension breadth. Waves 1–2 agentic items (#03, #04, #05, #09, #10, #11) are where VCS can _lead_ Cursor/Windsurf rather than trail VS Code.
- **Reuse what the monorepo already has**: the `scheduled-tasks` MCP (#16), the `memory` MCP + `StrategyMemory` (#04), `MultiAgentReview`/`AICodeReviewer` (#15), and `GitService` worktrees (#10). Several specs are integration work, not greenfield.

## Market-timing caveats (verify before citing publicly)

- **Cursor**: SpaceX $60B acquisition announced 2026-06-16, targeted to close Q3 2026 (not closed as of this writing). Current models: Composer 2.5, Cursor 3.x, Bugbot on usage billing.
- **Windsurf/Cascade**: Cognition (Devin) acquired Windsurf mid-2025; reporting says Cascade reached EOL ~2026-07-01 and is rebranding to **Devin Desktop / Devin Local**. Benchmark the _feature set_ (accurate) but verify the _name_ in-app before publishing.
- **Antigravity**: launched 2025-11 with Gemini 3; free tier tightened materially since. "Artifacts" + Manager + `/browser` are its signature.

---

## How these specs are meant to be used

Each spec follows the shipped house format: **Status / Priority / Effort / Dependencies → User Story → Acceptance Criteria → Solution/Architecture → Implementation (phased, real file references) → Test Scenarios → Success Metrics**. They name the **actual existing VCS services/components** each feature should hook into, and assume the current stack: **Tauri 2 (Rust sidecar for external processes), React 19 + TS 5.9 strict, pnpm, Windows-first**. Pick a wave, not the whole list.

---

## Baseline verification (2026-07-03, against live source)

Every integration point named across the 18 specs was checked against `src/`. Result: **all claimed services/components exist as named** (TerminalService with all 6 methods, monacoConfig, LazyMonaco, useEditorStore w/ persist, Settings, CommandPalette, TerminalPanel, MCPService/MCPToolRegistry/MCPPanel, RulesParser/RulesEditor/CustomRulesEngine, TaskPlanner + `ai/planning/`, StrategyMemory, EnhancedAgentMode + agentTaskRunner, all 5 specialized agents + AgentOrchestrator, GitService + GitHubService, RemoteConnectionManager, AICodeReviewer + MultiAgentReview, `services/testing/*`). The **Missing** claims also hold: zero traces of LSP/languageclient, DAP, Test Explorer UI, notebooks, tasks.json handling, a Problems panel, or shiki/vscode-textmate.

Corrections applied to the specs:

- **Spec 01**: baseline was understated — `EditorSettings.theme` is already `string`, `customThemeJson` exists, and `themeLoader.ts#loadCustomTheme` already maps VS Code theme-JSON → Monaco. Spec 01 is a tokenizer swap + UX, cheaper than first written. (Spec updated.)
- **Spec 10**: only git **worktree** support is missing; GitService/GitHubService are real. The spec's "Partial" framing is correct — don't read it as "build Git."
- **Spec 08**: correct as written — `services/testing/` building blocks are real; the UI layer is the gap.

### Cross-cutting constraint no spec's effort label includes

**vibe-code-studio is NOT grandfathered in the diff-coverage gate** (`scripts/check-diff-coverage.js`; only nova-agent is). Every new/changed executable line in `src/` needs test coverage or the commit hard-fails. Treat each spec's effort as its label **plus the test burden**; structure new code as coverable pure-logic `.ts` modules (parsers, engines, registries, stores) with thin Tauri/webview glue. Also live: root-config lint caps (1000-line file / 100-col / 50-line fn for `.ts`, `.tsx` exempt — no new `eslint-suppressions.json` entries), strict `tsc`, type-only imports, no raw localStorage.

### Keystone + recommended sequence

**Spec 02's shared Problems panel is the keystone of the platform-IDE track** — specs 07 (LSP) and 12 (DAP) both write diagnostics into it and have nowhere to render until it exists. Two independent tracks:

- **Track A (IDE credibility)**: **02** → 01 (parallel, cheap) → 07 → 08 → 06 → then 12/13/14 as separately-scoped campaigns. 18 Tier A can be pulled forward any time after 01.
- **Track B (agentic moat)**: **05** → 03 → 04 → 09 → 10. (15/16/17 defer to Wave 3; 18 Tier B stays unscheduled pending its own scoping spec.)

**Recommended starter: 02 Task Runner + Problems panel** (highest structural leverage, no new Rust, coverage-friendly pure-logic modules). Alternative if differentiation outranks parity: **05 Plan Mode**.

New-work wiring conventions (verified): new panel = lazy entry in `src/app/lazyPanels.ts` + open-flag in `useAppState`/`UIPanelContext` (`src/app/contexts.tsx`) + conditional render in `src/app/AppLayout.tsx`; new command = `Command` object in `src/hooks/useAICommandPalette.tsx` (shortcuts in `src/app/hooks/useAppEffects.ts`); new store = `devtools(persist(subscribeWithSelector(immer(...))))` per `useEditorStore.ts`, with action slices extracted to stay under the 50-line fn cap.
