---
name: vibetech-brain
description: >
  The orchestration brain for Bruce's @vibetech/workspace monorepo and all connected systems.
  This skill is the routing layer — it knows which skill, MCP, tool, or database to use for any
  task across the entire ecosystem. Use this skill whenever coordinating multi-step work, deciding
  which tool or skill to delegate to, building or shipping apps, running diagnostics, accessing
  the learning system, checking error history, or doing anything that touches more than one part
  of the monorepo. Also use when Bruce asks about system health, past mistakes, what went wrong,
  what's working, or how to improve workflows. If you're unsure which skill to use, start here.
---

# VibeTech Orchestrator

The brain of the @vibetech/workspace. This skill doesn't do everything itself — it routes to the
right tool, skill, or MCP and makes sure the system learns from every interaction.

## Core Loop

Every task follows this cycle. The goal is zero wasted work and fewer mistakes over time.

```
  RECEIVE TASK → CHECK MEMORY → ROUTE → EXECUTE → VERIFY → LEARN → loop
```

## Step 1: Check Memory Before Acting

Before starting any non-trivial task, query the learning system:

```
memory_search_unified({ query: "<task description>", limit: 5 })
memory_get_patterns({ category: "<relevant category>" })
```

**How to act on results:**
- If a past failure matches your current task, apply its PREVENTION step directly — don't
  repeat the approach that failed.
- If a proven pattern exists, follow that pattern instead of inventing a new approach.
- If memory returns a warning about a specific file, package, or config, read that file first
  to verify the warning still applies before proceeding.
- If memory is empty or unavailable, proceed normally — but log the outcome after (Step 5).

## Step 2: Route the Task

Match the task to the right executor. For detailed MCP tool signatures, read
`references/routing-reference.md`.

### Document Creation

| You want to... | Use | Why |
|------|----------|-------|
| Editable report, letter, memo, legal brief | `docx` skill | Native editing, track changes, print-ready |
| Locked/final document, form with fields | `pdf` skill | Uneditable, portable, professional |
| Present to a group with visuals | `pptx` skill | Slides force conciseness |
| Tabular data, budget, financial model | `xlsx` skill | Formulas, pivot tables, charts |
| Interactive demo, tool, or dashboard | `web-artifacts-builder` skill | Self-contained HTML/React |
| Legal meeting prep, court filing | `docx` for drafting, `pdf` for submission | Edit in docx, finalize as pdf |

### Code & Monorepo

| Task | Route to | Notes |
|------|----------|-------|
| Create new app/package | See "Creating Apps" below | Nx generators via Desktop Commander |
| Weekly update, dep check, config align | `monorepo-maintenance` skill | Read SKILL.md first |
| Lint, typecheck, build | Desktop Commander `dc_run_powershell` | `pnpm run quality --filter @vibetech/<app>` |
| Read/write files on C:\dev | Desktop Commander `dc_read_file` / `dc_write_file` | Always absolute Windows paths |
| Search code across monorepo | Desktop Commander `dc_search_content` | Faster than manual grep |
| Run dev server | Desktop Commander `dc_run_powershell` | `pnpm run dev:all --filter @vibetech/<app>` |
| Look up library docs | Context7 `resolve-library-id` → `get-library-docs` | React, Vite, Tailwind, etc. |

### Data & Databases

| Task | Route to | Notes |
|------|----------|-------|
| Query SQLite on D:\databases\ | `sqlite` MCP (`read_query`, `write_query`) | All DBs on D:\ |
| Trading data, crypto patterns | `sqlite-trading` MCP | Separate DB connection |
| Data analysis, statistics | `data` skill suite | Explore → analyze → visualize |
| Build a dashboard | `data:build-dashboard` skill | Interactive HTML with Chart.js |
| SQL query help | `data:write-query` skill | Dialect-aware |
| Initialize new database | `sqlite` `write_query` with CREATE TABLE | Schema in code, file on D:\ |

### Learning & Memory

| Task | Route to | Notes |
|------|----------|-------|
| Store a lesson learned | `memory_add_semantic` | Include what/why/prevention |
| Log a task outcome | `memory_add_episodic` | Success/failure, duration |
| Find past mistakes | `memory_search_unified` | Query by error type or area |
| Track a code pattern | `memory_track_pattern` | Reusable patterns that work |
| Get suggestions | `memory_suggest_task` | Context-aware recommendations |
| Check system health | `memory_learning_health` | Is indexing working? |

### Communication & Productivity

| Task | Route to | Notes |
|------|----------|-------|
| Read/send email | Gmail MCP (`gmail_search_messages`, `gmail_create_draft`) | Never auto-send, always draft |
| Calendar, schedule | GCal MCP (`gcal_list_events`, `gcal_create_event`) | Check free time first |
| Google Drive | Google Drive MCP (`google_drive_search`) | Shared docs |
| Notion | Notion MCP (`notion-search`, `notion-fetch`) | Project docs, wikis |
| Task tracking | `productivity:task-management` skill | TASKS.md based |

### Legal (Walmart Lawsuit & General)

| Task | Route to | Notes |
|------|----------|-------|
| Case research, precedent | `legal:brief` skill + web search | Always cite sources |
| Contract review | `legal:review-contract` skill | Flag deviations |
| Compliance check | `legal:compliance-check` skill | Regulatory assessment |
| Risk assessment | `legal:legal-risk-assessment` skill | Severity × likelihood |
| Meeting prep with legal context | `legal:meeting-briefing` skill | Structured briefing + action items |

### Deployment & Infrastructure

| Task | Route to | Notes |
|------|----------|-------|
| Cloudflare Workers, D1, KV, R2 | Cloudflare MCP tools | Edge compute, SQL, storage |
| Browser automation | Claude in Chrome or Kapture MCP | Testing, scraping |
| Windows system ops | Windows-MCP (`PowerShell`, `FileSystem`, `Process`) | System-level |
| Screenshots, windows | Desktop Commander `dc_take_screenshot` | Visual verification |

### Skill & MCP Development

| Task | Route to | Notes |
|------|----------|-------|
| Create or improve a skill | `skill-creator` skill | Full eval loop available |
| Build a new MCP server | `mcp-builder` skill | Python (FastMCP) or Node |
| Search for existing MCPs | `search_mcp_registry` | Check before building |

## Step 3: Execute with Guard Rails

### Hard Rules (violate = broken build)

1. **pnpm only.** Never npm. Never yarn. Always `--filter @vibetech/<package>`.
2. **D:\ for data.** All .db, .sqlite, .log files on D:\. Never C:\dev.
3. **Windows paths.** Backslashes always: `C:\dev\apps\nova-agent\src\index.ts`
4. **PowerShell 7.** Chain with `;` not `&&`. Use `npx.cmd` not `npx`.
5. **File size limit.** 500 lines max per .ts/.tsx. Target 200-300 for components.
6. **Backup before destructive changes.** Run `Compress-Archive` first.
7. **No git commands.** Bruce uses manual zip backups. Codeberg sync only.

### Quality Gates

Before shipping any app or significant change:
```
pnpm run quality --filter @vibetech/<app>   # lint + typecheck + build
```

If it fails, fix the issue. If the same approach fails twice, stop and try a fundamentally
different strategy (Two-Strikes Rule).

### Diagnosing Recurring Failures

When something fails repeatedly, don't just retry — diagnose. Work through this checklist
in order until you find the root cause:

**Build OOM:**
1. Add `--concurrency 1` and retry once
2. Check if `node --max-old-space-size` is set (should be 4096+ for large builds)
3. Clear Nx cache: `npx.cmd nx reset`
4. Check for circular dependencies: `npx.cmd nx graph`
5. Profile: `node --inspect` to find the memory hog
6. If still failing, the app may need to be split into smaller build targets

**Type errors after dependency update:**
1. Delete `node_modules` and `pnpm-lock.yaml` in affected package
2. Run `pnpm install --filter @vibetech/<app>`
3. Check tsconfig extends chain — broken baselines cause cascading errors
4. Look for `@types/*` version mismatches

**Lint/format conflicts:**
1. Check if ESLint and Prettier configs conflict (single quotes vs double, etc.)
2. Run `pnpm run format --filter @vibetech/<app>` then re-lint
3. Check for stale `.eslintcache` files

**Runtime crashes:**
1. Check the error stack trace — is it in app code or a dependency?
2. Search memory for the error message: `memory_search_unified({ query: "<error>" })`
3. Check if the database on D:\ is locked (SQLite WAL mode issue)
4. Verify env vars and port assignments (3000-3099 backend, 5173-5199 Vite)

## Step 4: Verify the Work

Don't assume success. Check it.

- **Code changes**: Run the quality pipeline
- **File creation**: Verify the file exists and has expected content
- **Database operations**: Query back to confirm the write
- **API changes**: Hit the endpoint and check the response
- **UI changes**: Take a screenshot if possible (`dc_take_screenshot`)

## Step 5: Learn from the Outcome

This closes the loop. For detailed logging formats, read `references/learning-patterns.md`.

### On Success

```
memory_track_pattern({
  pattern: "<what worked>",
  context: "<what task, what approach>",
  category: "<area: web, desktop, backend, mobile, data>"
})
```

### On Failure

```
memory_add_semantic({
  content: "FAILURE: <what happened>\nCAUSE: <root cause>\nFIX: <what resolved it>\nPREVENTION: <how to avoid next time>",
  metadata: { category: "error", area: "<affected area>", severity: "<low|medium|high>" }
})
```

If this is the 3rd+ failure of the same type, it's time to create a skill or automated fix
via `skill-creator` so it never happens again.

## Creating Apps in the Monorepo

When Bruce says "create an app" or "build a website" or "new project":

1. **Check memory** for similar past apps — reuse proven scaffolding
2. **Frontend**: Use Nx generators via Desktop Commander:
   ```powershell
   npx.cmd nx generate @nx/react:application --name=<app-name> --directory=apps/<app-name> --bundler=vite
   ```
3. **Backend** (if needed): Create Express app manually under `apps/<app-name>/server/` or as
   a separate package. Standard structure: `src/index.ts` (entry), `src/routes/`, `src/middleware/`.
   Express 5 on port 3000-3099.
4. **Database** (if needed): Create schema via `sqlite` `write_query` with CREATE TABLE.
   Database file goes on `D:\databases\<app-name>.db`. Track schema in `src/db/schema.sql`.
5. **Apply conventions** from `monorepo-maintenance` skill (tsconfig, ESLint, Tailwind 4)
6. **Register** in `pnpm-workspace.yaml` if not auto-detected
7. **Log** the new app in memory for future reference

Port ranges: 3000-3099 backend, 5173-5199 Vite, 8000-8999 specialized.

## AI Model Reference

| Role | Model | When |
|------|-------|------|
| Orchestrator / Lead | Claude Opus 4.6 | Complex multi-step tasks, architecture, this skill |
| Reasoning Worker | Claude Sonnet 4.6 | Code gen, analysis, security, tests |
| Fast Worker | Claude Haiku 4.5 | Lint, cleanup, builds, lookups |
| Code Generation | DeepSeek V2 | Via OpenRouter proxy at localhost:3001 |
| Extended Reasoning | Kimi 2.5 | Via Moonshot, Nova Agent and Vite Code Studio |

## Self-Improvement Triggers

- **Repeated workflow** (2+ times) → create a skill via `skill-creator`
- **Repeated failure** (3+ same error) → create a diagnostic skill or automated fix
- **Skill produced bad output** → improve via `skill-creator` eval loop
- **No MCP for recurring need** → `search_mcp_registry`, then `mcp-builder`
- **Config drift** → trigger `monorepo-maintenance` skill
- **Stale memories** → `memory_conflict_check()` then `memory_consolidate()`

## When This Skill Should NOT Trigger

- Simple conversational questions — just answer directly
- Single-file edits where you already know what to do — just do it
- Tasks that clearly map to exactly one skill — go straight there

If the task is obvious and atomic, skip the ceremony and ship it.
