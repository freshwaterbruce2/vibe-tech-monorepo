# mcp-skills-server — AI Context

## What this is
MCP server that exposes the agent skills system as callable tools to any compliant LLM — Claude, Gemini, Copilot, etc.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`)
- **Key deps**: glob, gray-matter (parses YAML frontmatter from skill .md files), zod

## Dev
```bash
pnpm --filter mcp-skills-server dev     # tsx watch src/index.ts
pnpm --filter mcp-skills-server build   # tsc → dist/index.js
node apps/mcp-skills-server/dist/index.js  # run as MCP server
```

## Notes
- Reads skill definitions from two sources (see `src/store.ts` `SKILL_SOURCES`):
  - `C:\dev\.agent\skills\` — hand-crafted monorepo skills
  - `C:\dev\.claude\skills\` — Ralph Wiggum auto-generated skills (written here by `skill-skillgenerator` agent)
- gray-matter parses YAML frontmatter to extract skill metadata (name, description, triggers)
- Registered in `.mcp.json` as the `skills` server
- Adding a monorepo skill = add a `<name>/SKILL.md` under `.agent/skills/`
- Ralph Wiggum pipeline auto-writes to `.claude/skills/<name>/SKILL.md` — picked up on next cache refresh (60s TTL)
