# mcp-sync — one MCP registry for every agent tool

A single canonical MCP server list (`mcp/registry.json`) rendered into every
tool's native config, so Claude Code, Gemini CLI, Antigravity, Codex, Cursor,
and Hermes stay in sync instead of drifting.

## Why

MCP the *protocol* is universal; the *config* is not. Each tool uses a different
file, format, and field names:

| Tool | File | Format |
|------|------|--------|
| Claude Code | `V:\monorepo\.mcp.json` | JSON (`mcpServers`, `type`) |
| Gemini CLI | `~/.gemini/settings.json` | JSON (`mcpServers`, `httpUrl`) |
| Antigravity | `~/.gemini/antigravity-cli/settings.json` | JSON |
| Codex | `~/.codex/config.toml` | TOML (`[mcp_servers.*]`) |
| Cursor | `~/.cursor/mcp.json` | JSON (`url`) |
| Hermes | `~/.hermes/config.yaml` | YAML (`mcp_servers:`) |

## Workflow

```bash
# 1. Edit the ONE source of truth:
#    mcp/registry.json   (add/remove/toggle servers; secrets by env-var NAME)

pnpm mcp:sync          # DRY-RUN — print what would change in each tool (no writes)
pnpm mcp:sync:apply    # write all tool configs (backs up each to D:\backups\mcp-sync first)
pnpm mcp:check         # exit 1 if any tool is out of sync (use in CI / pre-commit)

# Scope to specific tools:
node tools/mcp-sync/sync.mjs --apply --tool gemini,codex
# Render to a scratch dir for inspection (no target writes):
node tools/mcp-sync/sync.mjs --out-dir D:/temp/mcp-render
```

## How it stays safe

- **Surgical merge** — for tools with rich configs (Gemini/Antigravity settings,
  Hermes' 600-line `config.yaml`, Codex TOML) only the MCP block is replaced;
  every other setting is preserved.
- **Backups** — every target is copied to `D:\backups\mcp-sync\` before writing.
- **Dry-run by default** — nothing is written without `--apply`.
- **Secrets never written literally** — the registry stores env-var *names*
  (`secretEnv`); each tool gets its native env-ref (`${VAR}` for Claude/Gemini,
  `bearer_token_env_var` for Codex).
- **Windows command resolution** — logical `node`/`npx`/`uvx` are rendered to the
  working invocations (`node.exe`, `cmd /c npx.cmd`, `uvx.exe`). Override with
  `MCP_NODE_BIN` / `MCP_UVX_BIN`.

## registry.json schema

```jsonc
{
  "servers": {
    "my-server": {
      "transport": "stdio",            // or "http"
      "command": "node",               // logical; resolved per-platform
      "args": ["V:/monorepo/.../index.js"],
      "env": { "FOO": "bar" },
      "enabledFor": ["claude","gemini","codex"], // optional; defaults to all
      "claude": { "alwaysLoad": true } // optional Claude-only passthrough
    },
    "remote": {
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "secretEnv": "EXAMPLE_API_KEY"   // -> Bearer ${EXAMPLE_API_KEY}
    }
  }
}
```

## Not covered (by design)

Tool-native **plugins/skills/extensions** are not portable (Claude plugins ≠
Codex skills ≠ Gemini extensions). Where a plugin exposes an MCP server (e.g.
`greptile`, `serena`), put that server in `registry.json` so every tool gets it
as a plain MCP server. The plugin runtimes themselves remain per-tool.
