# mcp-skills-server — AI Context

## What this is
MCP server that exposes the agent skills system (`.claude/commands/` markdown skill files) as callable tools to any compliant LLM — Claude, Gemini, Copilot, etc.

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
- Reads skill definitions from `.claude/commands/` and `.claude/agents/`
- gray-matter parses YAML frontmatter to extract skill metadata (name, description, triggers)
- Registered in `.mcp.json` as the `skills` server
- Adding a new skill = adding a `.md` file in `.claude/commands/` — no code change needed
