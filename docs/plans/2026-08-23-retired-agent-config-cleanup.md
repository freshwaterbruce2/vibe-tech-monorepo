# Retired Development-Tool Configuration Cleanup

## Objective

Remove active Woodpecker, Gemini, Kimi agent, VS Code workspace, and Antigravity
configuration that the user has explicitly retired, while preserving product code,
historical records, and unrelated integrations.

## Scope and constraints

- Workspace: `C:\projects\vibe-tech-monorepo`.
- Treat "Kimi" as the retired development-agent integration, not product features or
  model/provider compatibility in application source.
- Remove exact active configuration targets only after resolving their real paths.
- Snapshot every existing deletion target outside the workspace before removal.
- Do not delete historical audits, snapshots, source merely mentioning a retired tool,
  installed applications, provider credentials, or user data outside confirmed config paths.
- Do not use Git, start MCP servers, run Nx Cloud/CI, or perform build, test, device,
  provider, deployment, signing, publishing, or release actions during cleanup.
- Resume the separately authorized local `nx-mcp` discovery probe only after active
  configuration is clean and the fresh session can be isolated to `nx-mcp`.

## Checklist

- [x] Inventory exact repo-local configuration directories and files.
- [x] Inventory exact user-level retired-tool configuration and Codex skill targets.
- [x] Identify active governance/config references that would recreate or require deleted targets.
- [x] Obtain explicit confirmation for the broad user-profile deletion after reporting its credential/session/profile contents.
- [x] Delete the confirmed repo-local retired configuration targets.
- [ ] Delete the confirmed user-level retired configuration targets recoverably, one item at a time:
  - [x] `C:\Users\fresh\.codex\skills\kimi-webbridge\`
  - [x] `C:\Users\fresh\.agents\skills\kimi-webbridge\`
  - [ ] `C:\Users\fresh\.gemini\`
  - [ ] `C:\Users\fresh\.kimi-code\`
  - [ ] `C:\Users\fresh\.vscode\`
- [x] Update only active governance/config references required to prevent stale instructions or recreation.
- [x] Verify repo-local target absence and scan active configuration for remaining retired-tool dependencies.
- [ ] Run the isolated fresh-session `nx-mcp` initialization/tool-discovery check.
- [ ] Record exact outcomes and remaining untested gates.

## Current findings

Confirmed repo-local targets:

- `.woodpecker\self-healing-config.yml`
- `.gemini\settings.json`
- `.gemini\commands\monitor-ci.toml`
- `.kimi\AGENTS.md`
- `.kimi\skills\memory-lifecycle\SKILL.md`
- `.vscode\extensions.json`
- `.antigravitycli\d8c164e1-4081-4f64-835b-f27fd11d7a88.json`
- `apps\nova-agent\.antigravity\stack.md`
- `apps\vibe-tutor\.gemini\settings.json`

Confirmed user-level candidate:

- `C:\Users\fresh\.gemini\` (62,610 files; 6,203,415,322 bytes; includes Antigravity browser/profile data)
- `C:\Users\fresh\.kimi-code\` (72 files; 140,902,584 bytes; includes credentials, sessions, logs, and telemetry)
- `C:\Users\fresh\.vscode\` (329 files; 276,618,622 bytes; includes CLI and extensions)
- `C:\Users\fresh\.codex\skills\kimi-webbridge\`
- `C:\Users\fresh\.agents\skills\kimi-webbridge\`

The active Codex MCP configuration contains no Woodpecker, Gemini, Kimi, VS Code, or
Antigravity registration. Its enabled MCP servers are currently `nx-mcp`, `filesystem`,
and `node_repl`; the live probe must override the latter two off.

## Progress and errors

- A read-only PowerShell inventory command had a parser error because a pipeline followed
  a `foreach` statement directly. It made no changes and was rerun successfully.
- The corrected user-level inventory completed successfully.
- A combined Recycle Bin request was rejected because the user-level targets include broad
  profile, credential, session, browser, and extension data. It made no changes. Those paths
  require a fresh explicit confirmation after the risk is reported.
- Repo-local `.gemini`, `.kimi`, `.vscode`, `.antigravitycli`, nested app Gemini/Antigravity
  folders, `GEMINI.md`, and `.woodpecker` were removed. No separate pre-delete copy was made;
  the working tree remains uncommitted and Git was not invoked.
- The Woodpecker safety policy was migrated to `.github/self-healing-config.yml`; both local
  consumers use the new path and focused safe/reject validation passed before `.woodpecker`
  was removed.
- The MCP sync registry and renderer no longer emit Gemini, Antigravity, Kimi, or VS Code
  targets. Parser, registry-integrity, and scratch-render validation passed; installed
  Prettier then normalized the three edited files.
- Twelve active governance files now use Codex-only workflow terminology and repo-local
  `docs/plans/` planning. Their focused retired-tool scan returned no matches.
- Consolidated repo-static verification passed: every named repo deletion target is absent,
  the migrated self-healing policy exists, active governance/MCP/self-healing scans are clean,
  and the MCP sync module passes `node --check`.
- A read-only elevated process check confirmed that no `nx mcp` process is running. Static
  `codex mcp get nx-mcp --json` still returns the enabled workspace-pinned registration.
- Prettier verification passes for the three MCP-sync files and all twelve edited governance
  files; `.cursorrules` was explicitly parsed as Markdown. The post-format retired-tool scan
  remains clean.
- 2026-08-24: The user requested one-at-a-time handling. An independent read-only audit found
  `C:\Users\fresh\.codex\skills\kimi-webbridge\` unnecessary for the current Codex/Nx
  workflow. That exact folder was moved to the Windows Recycle Bin and absence verification
  passed. No other user-level path was touched.
- 2026-08-24: The second one-at-a-time audit found
  `C:\Users\fresh\.agents\skills\kimi-webbridge\` contained no files or `SKILL.md`, only an
  empty `references` directory, and active Codex/Nx configuration contained no reference to
  it. That exact folder was moved to the Windows Recycle Bin and absence verification passed.
  No other user-level path was touched.

## Status

Repo-local cleanup is confirmed. Two of five user-level targets have been recycled; three remain
pending under the one-item-at-a-time gate. The live `nx-mcp` probe remains pending, and no MCP
server has been started.
