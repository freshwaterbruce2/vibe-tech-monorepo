## Continuation Prompt — Ecosystem Sync Skill (2026-02-25)

I just finished building and debugging the **ecosystem-sync** skill with Claude. Here's where we left off:

### What Was Built

A new skill at `C:\dev\.claude\skills\user\ecosystem-sync\` that audits my monorepo's AI ecosystem (skills, agents, MCP servers, CLAUDE.md files) for drift. It includes:

- **SKILL.md** — workflow docs with corrected paths
- **references/component-registry.md** — real inventory (26 apps, 27 packages, 5 MCP servers, 9 apps with CLAUDE.md)
- **references/drift-rules.md** — 28+ detection rules across PATH, DEP, AGT, MCP, SEC, SKL, CMD categories
- **references/version-map.md** — pinned versions (React 19.2.x, TS 5.9.3, Nx 22.x, MCP SDK 1.27.x) with S1ngularity attack warnings
- **references/report-template.md** — output format
- **references/sync-history.md** — append-only log
- **scripts/audit-ecosystem.ps1** — PowerShell automation (Quick/Full/Fix modes)

### Debugging Done (3 iterations)

1. **Run 1**: 51 breaking, 562 cosmetic — all false positives. Community skills (`skills\skills\`) being scanned, `node_modules` crawled for CLAUDE.md, example paths from pentesting docs flagged.
2. **Run 2**: Fixed path scoping to `skills\user\` only, added `Get-RealPaths` helper to strip code blocks + filter example paths. Dropped to 4 breaking + 532 cosmetic — still crawling `node_modules`.
3. **Run 3**: Rewrote CMD-004 to scan top-level app dirs only (ExcludeDirs list), fixed double-`user` path bug, replaced phantom `McpServersPath` with explicit `McpApps` array, rewrote `component-registry.md` with real paths. Also added `_backups` to MCP-007 exclusion filter.

### Clean Audit Results (Final)

```
🔴 Breaking: 0
🟡 Stale:    14 (6 real after backup exclusion)
🟢 Cosmetic: 14
⚡ Auto-fix: 2
```

### Real Findings To Address

**MCP SDK versions discovered:**

- desktop-commander-v3: 1.26.0
- mcp-gateway: 1.26.0
- mcp-codeberg: 1.26.0
- mcp-skills-server: 1.26.0
- memory-mcp: **1.3.2** (very old, priority upgrade)

**MCP-007 — Legacy API (4 servers):** desktop-commander-v3, mcp-codeberg, mcp-skills-server, memory-mcp all use `setRequestHandler` pattern (migration to `McpServer+registerTool` needed when bumping to SDK 1.27+)

**MCP-008 — Missing zod peer dep (2 servers):** mcp-skills-server, memory-mcp

**CMD-004 — Missing CLAUDE.md (14 apps):** avge-dashboard, clawdbot-desktop, gravity-claw, invoice-automation-saas, mcp-codeberg, mcp-gateway, mcp-skills-server, memory-mcp, monorepo-dashboard, nova-mobile-app, prompt-engineer, symptom-tracker, VibeBlox, vtde

**Agent registry shows 4 entries** in `agents.json` but the vibetech-agents skill documents 19. Needs investigation.

### Next Steps (Pick One)

1. **Upgrade memory-mcp** from SDK 1.3.2 → 1.27.x (highest priority, it's 24 major versions behind)
2. **Bump all 5 MCP servers** to SDK 1.27+ and migrate from legacy `setRequestHandler` → `McpServer+registerTool` with zod schemas
3. **Generate CLAUDE.md files** for the 14 apps missing them
4. **Investigate agents.json** — why only 4 entries vs 19 documented?
5. **Run the audit again** to verify the `_backups` exclusion fix: `C:\dev\.claude\skills\user\ecosystem-sync\scripts\audit-ecosystem.ps1 -Mode Full`

Read `C:\dev\.claude\skills\user\ecosystem-sync\SKILL.md` and `C:\dev\.claude\skills\user\ecosystem-sync\references\component-registry.md` to get full context before starting.
