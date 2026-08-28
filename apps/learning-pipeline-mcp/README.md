# learning-pipeline-mcp

MCP server (stdio) that orchestrates the learning system pipeline: insight generation from the SQLite DB, repetitive pattern analysis for skills/agents, and auto-generation of skill or agent files using Gemini.

## Tools

- `trigger_insight_generation` — Regenerate daily learning insights + recommendations (calls `scripts/refresh_insights.py` in LEARNING_SYSTEM_DIR). Supports `days` and `dryRun`.
- `run_skill_analysis` — Run pattern analysis over history (calls monorepo `scripts/auto-generate-skills/Analyze-Patterns.ps1`). Params: `daysBack`, `minOccurrences`, `minSuccessRate`.
- `generate_skill` — Generate a Skill or Agent from a candidate pattern name (calls `Generate-Skill.ps1`).
- `list_skill_candidates` — Read the CSV of analyzed candidates (from `.agent/skills/auto-skill-creator/analysis/skill-candidates.csv` under WORKSPACE_ROOT).

## Environment

- `WORKSPACE_ROOT` (defaults to the process working directory)
- `LEARNING_SYSTEM_DIR` (default `D:/learning-system`)

## Security / Execution

Commands are executed via hardened `execFile` (no shell) with an allowlist for `python*` / `powershell.exe`, explicit arg arrays, and propagation of the two root env vars. See `src/index.ts`.

## Scripts & NX

- `pnpm build | start | dev | typecheck | lint | test | validate`
- NX targets in `project.json` (build cacheable, test/lint/typecheck/validate cached).
- `test` uses `vitest run --passWithNoTests` (add real tests under `__tests__` as coverage grows).

## Integration

Intended to be used by Cursor (via MCP), other agents, or CI to close the loop from observed usage → insights → new skills/agents. VCS / monorepo apps interact indirectly via Nova flows, WorkspaceService, or direct MCP clients. No stray `dotenv`; paths and env are explicit.

## Development

```bash
cd apps/learning-pipeline-mcp
pnpm install
pnpm typecheck
pnpm test
pnpm validate
```

Add to mcp.json clients as a local server pointing at `dist/index.js` (after build) or use `pnpm dev`.

## See also

- Monorepo root pnpm workspace + NX setup
- Learning system under D:/learning-system (or configured)
- Graph (run `graphify query "..." --graph apps/learning-pipeline-mcp/graphify-out/graph.json`)
