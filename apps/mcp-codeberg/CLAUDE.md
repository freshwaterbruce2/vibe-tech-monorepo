# mcp-codeberg — AI Context

## What this is
DEPRECATED MCP server that wrapped the Codeberg Git API — the monorepo has since migrated to GitHub; use the GitHub MCP server instead.

## Stack
- **Runtime**: Node.js 22
- **Framework**: MCP stdio server (`@modelcontextprotocol/sdk`)
- **Key deps**: axios, zod

## Dev
```bash
pnpm --filter mcp-codeberg build   # tsc → dist/index.js
pnpm --filter mcp-codeberg dev     # tsc --watch
node apps/mcp-codeberg/dist/index.js  # run as MCP server
```

## Notes
- **DEPRECATED** — description in package.json explicitly states this
- Repo migrated to GitHub (`github.com/freshwaterbruce2/Monorepo`)
- Do not add new features; consider removing or replacing with `mcp-codeberg` → GitHub MCP
- MCP config entry in `.mcp.json` uses `node apps/mcp-codeberg/dist/index.js`
