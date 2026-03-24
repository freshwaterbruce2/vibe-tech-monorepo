# AI Workspace Rules (Canonical)

Single source of truth for workspace behavior, paths, rules, workflow, and agents.

Last Updated: 2026-02-06
System: Windows (Win32)
Repository Root: C:\dev

---

## 1) Paths and data storage (non-negotiable)

**Code lives in C:\dev.** **Data lives in D:\.** Never mix.

Approved paths:

- Code: C:\dev\
- Databases: D:\databases\<project>
- Logs: D:\logs\<project>
- Datasets: D:\data\
- Learning system: D:\learning-system\

Deprecated paths:

- D:\learning\ (use D:\learning-system\)
- C:\dev\data, C:\dev\logs, C:\dev\databases

Enforcement:

- Any code that writes files must default to D:\ locations.
- Path changes follow [docs/reference/PATH_CHANGE_RULES.md](docs/reference/PATH_CHANGE_RULES.md).
- Workspace/database ownership and review entrypoints are summarized in [docs/reference/SYSTEM_SURFACES.md](docs/reference/SYSTEM_SURFACES.md).

---

## 2) Core rules (coding + behavior)

Package manager and tooling:

- Use pnpm only. Never use npm or yarn. Exception: isolated npm installs are permitted for native compiled modules that fail under pnpm strict linking (e.g., better-sqlite3, @nut-tree-fork/nut-js).
- Prefer Nx targets for build/test/lint: pnpm nx ...

Code quality:

- Max 500 lines per file. Split large files.
- Keep functions under 50 lines when possible.
- No emojis in code comments or commit messages.
- Comments explain why, not what.
- Prefer explicit error handling over silent failures.
- Avoid overcomplicated abstractions.
- TypeScript strict mode. No explicit any without a justification comment.
- Use @/ alias for src imports; avoid deep relative paths.
- Async-first with async/await; avoid blocking callbacks.

Domain rules:

- Web apps: functional components, small components, use pnpm nx dev/build.
- Desktop: keep bundles small; follow project AI.md for app-specific rules.
- Mobile: test device constraints; use Nx targets for mobile builds.
- Crypto: never place live trades without explicit confirmation; never run multiple bots; never commit API keys; store trading state on D:\databases\.
- Backend/data: SQLite on D:\databases with WAL; parameterized queries only; explicit migrations required.

---

## 3) Workflow (agent + dev)

Process:

1. Analyze the request and read relevant files first.
2. Plan changes in small, targeted diffs.
3. Implement using apply_patch.
4. Verify with pnpm run quality or the relevant pnpm nx target.

AI tooling:

- Primary tools: Gemini CLI + Gemini Code Assist.
- Claude Code is deprecated for this workspace.
- Prefer Gemini CLI commands in package.json scripts when available (gemini:\*).

Git rules:

- If the user says they are not using git, do not run git commands or rely on git history.

---

## 3.5) Planning with Files (Manus Pattern)

For complex tasks (>5 tool calls, multi-step, research), use file-based planning:

**Planning Directory:** `~/.gemini/antigravity/scratch/planning/`

**Core Files:**

- `task_plan.md` — Phases, progress, decisions (update after each phase)
- `findings.md` — Research and discoveries (update after ANY discovery)
- `progress.md` — Session log and test results (update throughout)

**Critical Rules:**

1. **Create Plan First** — Never start complex work without `task_plan.md`
2. **2-Action Rule** — After every 2 view/search operations, save findings to disk
3. **Read Before Decide** — Re-read plan before major decisions
4. **Log ALL Errors** — Every error goes in the plan file with attempt number
5. **Never Repeat Failures** — Track attempts, mutate approach on failure

**3-Strike Protocol:**

- Attempt 1: Diagnose & fix
- Attempt 2: Try different approach
- Attempt 3: Broader rethink
- After 3 failures: Escalate to user

**Templates:** Copy from `TEMPLATE_*.md` in planning directory.

---

## 4) Learning system (summary)

Purpose: automatic capture of tool usage and pattern recognition.

Key locations:

- Database: D:\databases\agent_learning.db
- Logs: D:\learning-system\logs\tool-usage-YYYY-MM-DD.log
- Hooks: C:\dev\.claude\hooks\pre-tool-use.ps1 and post-tool-use.ps1

Quick checks:

- Tail today’s log: D:\learning-system\logs\tool-usage-YYYY-MM-DD.log
- Validate tables: sqlite3 D:\databases\agent_learning.db ".tables"
- Run path policy review: `pnpm run paths:check`
- Run workspace safe-stabilization review: `pnpm run workspace:health`

---

## 5) Agent rules (Nx and tooling)

- Prefer Nx tasks over direct tool invocation.
- Use Nx workspace/project details and docs tools for Nx questions.
- When unsure about configuration, retrieve the latest Nx docs.

**Agent Evaluation:**

For testing AI agent behavior (web search grounding, behavioral contracts):

- Framework: `tests/agent-evaluation/`
- Run tests: `.\run-web-search-grounding-tests.ps1 -TestCategory "all"`
- Documentation: `.claude/rules/web-search-grounding-*.md`
- Memory: `.claude/memories/web-search-grounding-evaluation.md`
- Target compliance: ≥95% standard tests, ≥90% adversarial resistance
- Zero tolerance for hallucinated sources

See: `.claude/rules/web-search-grounding-evaluation-summary.md` for complete details.

---

## 6) Documentation policy

Canonical rules live here: C:\dev\AI.md

Allowed lightweight pointers:

- C:\dev\CLAUDE.md
- C:\dev\GEMINI.md
- docs/ai/WORKSPACE.md

Project-specific overrides only when necessary:

- apps/<name>/AI.md
- packages/<name>/AI.md
