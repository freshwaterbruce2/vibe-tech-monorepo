---
name: ecosystem-sync
description: Keeps skills, agents, MCP servers, and plugins synchronized with the @vibetech/workspace monorepo. Use whenever monorepo changes (dependency bumps, config migrations, new apps, renamed paths, removed packages) could break or stale-out a skill, agent config, MCP server, or plugin. Triggers on phrases like "sync ecosystem", "check skill drift", "are my agents up to date", "update MCP servers", "ecosystem health", "skill audit", "propagate changes", "what broke after the update", or any mention of staleness in agents/skills/MCP/plugins. Also triggers after weekly maintenance or any major dependency update to ensure downstream components stay aligned. Use this skill BEFORE making manual edits to skill files or agent configs — it will tell you exactly what needs changing and why.
---

# Ecosystem Sync

Detects and resolves drift between the monorepo and its downstream AI components (skills, agents, MCP servers, plugins). Runs as a post-maintenance or on-demand audit.

## Why This Exists

The monorepo is the **source of truth**. Skills, agents, MCP servers, and plugins all reference monorepo paths, configs, dependencies, and patterns. When any of these change, downstream components silently break or give stale guidance. This skill closes that gap.

## Sync Targets

| Component | Location | What Drifts |
|-----------|----------|-------------|
| **Skills** (user) | `C:\dev\.claude\skills\user\` | Paths, dependency versions, framework patterns, config baselines |
| **Agent configs** | `C:\dev\.claude\sub-agents\config.yml` | Model versions, tool lists, trigger patterns, delegation rules |
| **Agent delegation** | `C:\dev\.claude\agent-delegation.yaml` | Execution order, parallel groups |
| **Agent registry** | `C:\dev\.claude\agents.json` | Agent count, categories, parent mappings |
| **MCP servers** | `C:\dev\apps\` (desktop-commander-v3, mcp-gateway, mcp-codeberg, mcp-skills-server, memory-mcp) | SDK versions, tool schemas, env vars |
| **MCP config** | `claude_desktop_config.json` / `.mcp.json` | Server entries, paths, args |
| **CLAUDE.md** files | Per-app root in `C:\dev\apps\` | Project status, dependency lists, known issues |

## Workflow

### Phase 1: Inventory Scan

Collect current state of all components. Load `references/component-registry.md` for the master inventory.

```powershell
# Scan user skill files
Get-ChildItem -Path "C:\dev\.claude\skills\user" -Recurse -Filter "SKILL.md"

# Scan agent configs
Get-Content "C:\dev\.claude\sub-agents\config.yml"
Get-Content "C:\dev\.claude\agents.json"

# Scan MCP server package.json files
@('desktop-commander-v3','mcp-gateway','mcp-codeberg','mcp-skills-server','memory-mcp') |
  ForEach-Object { Get-Content "C:\dev\apps\$_\package.json" }

# Scan CLAUDE.md files (top-level apps only, skip node_modules)
Get-ChildItem -Path "C:\dev\apps" -Directory |
  Where-Object { $_.Name -ne 'node_modules' } |
  ForEach-Object { Join-Path $_.FullName 'CLAUDE.md' } |
  Where-Object { Test-Path $_ }
```

### Phase 2: Diff Detection

Compare each component against the monorepo's current state. Check for:

1. **Path drift** — Does a skill/agent reference a path that moved or was deleted?
2. **Dependency drift** — Does a skill mention a package version that's been bumped?
3. **Config drift** — Does an agent config reference a tsconfig/eslint pattern that changed?
4. **Pattern drift** — Does a skill teach a framework pattern that's been superseded?
5. **Model drift** — Do agent configs reference deprecated model IDs?
6. **Schema drift** — Do MCP server tool schemas match their current implementations?
7. **Registry drift** — Is the agent count/category in skills accurate vs. actual configs?

For each item, classify as:

| Severity | Meaning | Action |
|----------|---------|--------|
| 🔴 **Breaking** | Component will fail or give wrong output | Fix immediately |
| 🟡 **Stale** | Component works but references outdated info | Fix this session |
| 🟢 **Cosmetic** | Minor wording/naming inconsistency | Fix when convenient |
| ⚪ **Info** | No drift detected, component is current | No action needed |

### Phase 3: Sync Report

Present findings. Load `references/report-template.md` for format.

```
## Ecosystem Sync Report — [Date]

### Summary
- Components scanned: X
- Breaking issues: X
- Stale issues: X
- All clear: X

### 🔴 Breaking
- [component] → [file:line] — [what changed] → [required fix]

### 🟡 Stale
- [component] → [file:line] — [what changed] → [recommended fix]

### 🟢 Cosmetic
- [component] → [what's off]

### 📋 Proposed Fixes
1. [fix] — [scope] — [risk]
2. ...

Approve all? Or specify which items to proceed with.
```

### Phase 4: Apply Fixes

After user approval:

1. **Backup first** (always):
   ```powershell
   $ts = Get-Date -Format "yyyyMMdd_HHmmss"
   Compress-Archive -Path "C:\dev\.claude" -DestinationPath "C:\dev\_backups\claude-config_$ts.zip"
   ```
2. Apply approved changes to skill files, agent configs, MCP configs
3. Validate: re-scan changed files to confirm fixes resolved the drift
4. Update `references/sync-history.md` with what changed and when

## Drift Detection Rules

Load `references/drift-rules.md` for the full rule set. Key rules:

### Path Validation
- Every file path in a skill/agent config must resolve to an existing location
- `C:\dev\apps\*`, `C:\dev\packages\*` — validate against actual directory listing
- Skip paths inside fenced code blocks and known example/template paths

### Dependency Version Sync
- Cross-reference versions mentioned in skills against `pnpm-lock.yaml` or root `package.json`
- Key packages: `@modelcontextprotocol/sdk`, `react`, `typescript`, `nx`, `zod`, `electron`, `@anthropic-ai/sdk`
- MCP server `package.json` versions must align with monorepo-wide standards

### Agent Config Validation
- Agent count in `vibetech-agents` skill must match `agents.json` entries
- Model IDs (e.g., `haiku-4`, `sonnet-4`) must be current, non-deprecated
- Sequential/parallel execution groups must match actual dependency chains
- Every agent must have a `description` field (was flagged as missing in past audits)

### MCP Server Health
- SDK version should match latest stable (search web for `@modelcontextprotocol/sdk` latest)
- Tool schemas must have `inputSchema` with proper `required` fields
- Server entry in `claude_desktop_config.json` must point to valid executable path
- Environment variables referenced must exist in the system or `.env`
- **API pattern check**: Flag servers using legacy `Server` + `setRequestHandler` pattern — recommend migration to `McpServer` + `registerTool` with zod schemas (both work in SDK 1.27, but new pattern is recommended)
- **Zod peer dependency**: MCP SDK 1.27+ requires zod as peer dep (v3.25+ for backward compat)
- **Desktop Extensions**: `.mcpb` format replaces `.dxt` — flag any `.dxt` references for update

### Supply Chain Security
- After any dependency update, verify against known compromised versions
- Nx 21.5.0 and 21.6.0 were compromised (S1ngularity attack) — never use these exact versions
- Run `pnpm audit` as part of every maintenance cycle

### Skill Content Freshness
- Framework patterns (React 19, TS 5.9) should reflect current monorepo versions
- Config baselines in `monorepo-maintenance` must match actual root configs
- Tracked project lists must reflect actual `apps/` and `libs/` directories

### CLAUDE.md Sync
- Each app's CLAUDE.md should reflect its current `package.json` dependencies
- Known issues should be cleared when resolved
- Build commands should match current `project.json` targets

## Reference Files

| File | When to Load |
|------|-------------|
| `references/component-registry.md` | Always — master inventory of all tracked components |
| `references/drift-rules.md` | During Phase 2 — full detection rule definitions |
| `references/report-template.md` | During Phase 3 — report formatting |
| `references/sync-history.md` | During Phase 4 — append completed sync records |
| `references/version-map.md` | When checking dependency versions — maps package → expected version |

## Integration with Other Skills

- **monorepo-maintenance**: Run ecosystem-sync AFTER weekly maintenance completes
- **vibetech-agents**: This skill validates agent configs that skill documents
- **skill-creator**: When creating new skills, ecosystem-sync ensures they reference current monorepo state

## Automation Script

Run `scripts/audit-ecosystem.ps1` for automated scanning:

```powershell
# Quick audit (paths + versions only)
.\scripts\audit-ecosystem.ps1 -Mode Quick

# Full audit (all drift rules)
.\scripts\audit-ecosystem.ps1 -Mode Full

# Fix mode (apply auto-fixable issues)
.\scripts\audit-ecosystem.ps1 -Mode Fix
```

## Emergency: Post-Breaking-Change Sync

When a major dependency update lands (e.g., React 19→20, TS 5.9→6.0, MCP SDK 2.x→3.x):

1. Run full ecosystem sync immediately
2. Search web for the package's migration guide
3. Cross-reference every skill and agent config for affected patterns
4. Prioritize MCP servers (they crash if SDK is incompatible)
5. Update `version-map.md` with new target versions
6. Re-run audit to confirm zero drift
