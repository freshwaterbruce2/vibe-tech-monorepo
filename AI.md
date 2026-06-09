# AI Workspace Rules (Canonical)

Single source of truth for workspace behavior, paths, rules, workflow, and agents.

Last Updated: 2026-04-29
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

Build and Install Failures:
- When a build or install command fails with OOM, NEVER retry the same command. First reduce parallelism (`--concurrency 1`, disable LTO, reduce parallel jobs), then retry.
- When pnpm install OOMs, try `pnpm install --filter <specific-project>` instead of full workspace install.

Windows Environment:
- Use `npx.cmd` (not `npx`) when constructing MCP server commands on Windows.
- Do NOT use `sed` for file manipulation. Use PowerShell or Python instead.
- For git operations, use `git rm` instead of `rm` to avoid lock file race conditions.
- For bulk operations (e.g., `Remove-Item`, `Copy-Item`), NEVER use `-Verbose` and suppress/limit stdout (e.g., redirect to `$null` or pipe to `Out-Null`) to prevent massive token inflation.

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
- File Immutability: Do NOT rename or move existing files (e.g., via `rename()`, `mv`, or `git mv`). You may only modify existing files, delete obsolete ones with approval, or create new ones.
- After EACH file edit that fixes lint/TS errors, re-read the file before making the next edit (line numbers shift).
- Fix ONE file first and verify it passes before applying the same fix pattern across multiple files.
- For eslint-disable comments, always verify the exact line number by reading the file immediately before placing the comment.

Domain rules:

- Web apps: functional components, small components, use pnpm nx dev/build.
- Desktop: keep bundles small; follow project AI.md for app-specific rules.
- Mobile: test device constraints; use Nx targets for mobile builds.
- Crypto: never place live trades without explicit confirmation; never run multiple bots; never commit API keys; store trading state on D:\databases\.
- Backend/data: SQLite on D:\databases with WAL; parameterized queries only; explicit migrations required.

---

## 3) Workflow (agent + dev)

Process:

1. Assessment: Before touching any code, analyze the request, read relevant files, count affected files, check line counts, verify D:\ vs C:\ dev storage rules, and check if similar functionality already exists (no duplicates rule).
2. Plan changes in small, targeted diffs. If the task is complex (>5 tool calls, multi-step, research), use the file-based planning in Section 3.5.
3. Implement the changes.
4. Verify with the narrowest relevant `pnpm nx <target> <project>` command.
5. For repo-level confidence, run `pnpm run quality:affected` before full-workspace checks.

Approach Strategy:
- When a fix attempt fails twice with the same approach, STOP and try a fundamentally different strategy.
- For unfamiliar errors, search the codebase for prior solutions before attempting fixes.
- When debugging, write a minimal reproduction first, then fix against that — don't scatter-shot across components.
- For any non-trivial task, run `/explore <problem>` first. It does a read-only diagnosis and produces a plan. Implementation only starts after the plan is approved. This prevents the wrong-approach-first failure mode.

AI tooling:

- Primary interactive workflow: Codex CLI/local agent sessions in this repository.
- Gemini Code Assist, Claude Code, OpenCode, and Copilot configs are maintained as optional client integrations.
- Do not assume Cursor or Copilot are installed; prefer repo-local config and terminal validation first.

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
- Hooks: C:\dev\.claude\hooks\pre-tool-use-stdin.ps1 and post-tool-use-stdin.ps1

Quick checks:

- Tail today’s log: D:\learning-system\logs\tool-usage-YYYY-MM-DD.log
- Validate tables: sqlite3 D:\databases\agent_learning.db ".tables"
- Run path policy review: `pnpm run paths:check`
- Run workspace safe-stabilization review: `pnpm run workspace:health`

---

## 5) Agent rules (Nx and tooling)

Default Agent:
- This workspace defines a default **master agent** in `.claude/agents/master-agent.md` (and `.agent/agents/master-agent.md` for the Antigravity framework). Load it first when starting work in this repository for workspace orientation, path policy enforcement, and intelligent routing to specialist agents.

Canonical Rules:
- Active project lock: `.claude/rules/active-project-lock.md` — finish before starting another (state in `D:\active-project\active-project.json`)
- Paths policy: `.claude/rules/paths-policy.md`
- No duplicates: `.claude/rules/no-duplicates.md`
- No mock/placeholder code: `.claude/rules/no-mock-or-placeholder-code.md`
- TypeScript patterns: `.claude/rules/typescript-patterns.md`
- Testing strategy: `.claude/rules/testing-strategy.md`
- Craft edit-review widget: `.claude/rules/craft-edit-review.md`

Nx Guidelines:
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
- docs/ai/WORKSPACE.md

Project-specific overrides only when necessary:

- apps/<name>/AI.md
- packages/<name>/AI.md
