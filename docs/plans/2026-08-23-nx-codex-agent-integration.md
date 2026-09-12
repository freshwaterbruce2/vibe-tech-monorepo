# Nx OpenAI Codex Agent Integration Plan

## Objective

Configure only OpenAI Codex with the installed Nx 22.7.1 AI-agent integration while preserving all Vibe governance and keeping Git, Nx Cloud, CI, devices, providers, deployment, and release actions outside this task.

## Constraints

- Workspace: `C:\projects\vibe-tech-monorepo`.
- Use installed `nx@22.7.1` and file-pinned `pnpm@10.33.0`; do not install or upgrade software.
- Do not use Git or change repository history.
- Do not authenticate, connect to Nx Cloud, enable remote caching/self-healing CI, or start an MCP server.
- Snapshot every existing file that would be modified before configuration.
- Configure Codex only; preserve Claude, Cursor, Copilot, Gemini, and OpenCode configuration.
- Keep the Sol/Terra/Luna workflow and human approval boundaries authoritative.

## Checklist

- [x] Read the applicable workspace governance, root manifests, handoff/continuation documents, and existing Codex/agent/MCP configuration.
- [x] Confirm the Nx workspace root and file-backed Nx/pnpm versions.
- [x] Inspect the installed `configure-ai-agents` command and run its network-blocked Codex check.
- [x] Enumerate the official Codex files and governance conflicts before editing.
- [x] Obtain explicit approval for Nx's outbound read of `https://github.com/nrwl/nx-ai-agents-config`.
- [x] Create a secret-safe timestamped pre-edit snapshot and absence/hash manifest.
- [x] Run the installed local Nx command for Codex only with no prompts.
- [x] Review every changed file without Git and replace the shared `haiku` wording with Codex-neutral wording.
- [x] Validate generated skills, governance preservation, and low-risk local Nx queries.
- [x] Obtain explicit approval and add a fixed-workspace local Nx MCP entry to the user-global Codex configuration.
- [x] Replace the generated repository `npx` launcher with the same fixed-workspace local launcher so it cannot download a fallback package.
- [x] Record exact closeout evidence and remaining untested gates here.

## Findings and Decisions

- 2026-08-23: `C:\projects\vibe-tech-monorepo` is a working Nx root with 109 projects and a printable graph of 109 nodes and 304 dependency edges.
- 2026-08-23: `package.json` and the installed package both identify Nx 22.7.1; `packageManager` pins pnpm 10.33.0.
- 2026-08-23: The monorepo already has the current Nx-managed block in `AGENTS.md`, but no workspace-local `.codex\config.toml`; the Codex-only check reports `OpenAI Codex (update available)`.
- 2026-08-23: Installed Nx always probes GitHub for `nrwl/nx-ai-agents-config` and may clone it. This external-service action requires separate approval, so configuration is blocked before snapshot or generator writes.
- 2026-08-23: The expected Codex generation is 19 new files plus one `.gitignore` entry. `AGENTS.md` is expected to remain byte-identical. The shared `monitor-ci` skill contains one Claude-model term, `haiku`, which must be changed to Codex-neutral wording after generation.
- 2026-08-23: Approved configuration succeeded with `NX_USE_LOCAL=true`; snapshot `C:\projects\_vibe-snapshots\nx-codex-agent-integration-preedit-20260823-150000` preserves the exact pre-edit files and target absence state.
- 2026-08-23: All seven generated `SKILL.md` files validate, `AGENTS.md` is byte-identical, `.gitignore` gained only `.nx/polygraph`, and the Codex-language scan is clean.
- 2026-08-23: `codex mcp list --json` on installed `codex-cli 0.149.0` loads only `C:\Users\fresh\.codex\config.toml` and does not list the repo-local `nx-mcp`; Codex MCP discovery is therefore blocked even though Nx generation succeeded.
- 2026-08-23: `codex doctor --json` was unsuitable for the task's static-only boundary because it also performed built-in read-only Git inspection and provider/network reachability probes. It made no workspace, Git-history, provider, authentication, or configuration mutation. Do not rerun it for this gate.
- 2026-08-23: Bruce explicitly approved the user-global discovery fix. Snapshot `C:\projects\_vibe-snapshots\nx-codex-global-mcp-preedit-20260823-221848` preserves the exact 8,441-byte pre-edit `C:\Users\fresh\.codex\config.toml` with SHA-256 `65C9A638A587B42BFA695FE78369E496BEDAE1A509CA22696D45D170FCD60B77`.
- 2026-08-23: `codex mcp add nx-mcp -- cmd.exe /d /s /c "cd /d C:\projects\vibe-tech-monorepo && corepack pnpm exec nx mcp"` added the real user-global entry after an initial sandbox-overlay-only attempt. The official CLI also normalized equivalent TOML values (`120` to `120.0`, `310` to `310.0`, and omitted an empty `args` array); static MCP output confirms the pre-existing server behavior is preserved.
- 2026-08-23: Snapshot `C:\projects\_vibe-snapshots\nx-codex-repo-mcp-preedit-20260823-222647` preserves the generated repository `.codex\config.toml` with SHA-256 `44EBBD76D41499BECB4F5C437FAFF195E26B2A725CCB424F1635258816368571`.
- 2026-08-23: The repository `.codex\config.toml` now uses the same fixed local `cmd.exe` plus `corepack pnpm exec nx mcp` launcher; the generated `npx nx mcp` fallback is removed. This is scoped to `C:\projects\vibe-tech-monorepo` and does not install or start anything.

## Verification

- `corepack pnpm exec nx configure-ai-agents --agents=codex --check=all` with installed-local execution and a closed loopback Git proxy: exit 1, `OpenAI Codex (update available)`.
- `corepack pnpm exec nx show projects --json` with Nx Cloud and daemon disabled: 109 projects.
- `corepack pnpm exec nx show project @vibetech/workspace --json`: root `.`, 130 resolved targets.
- `corepack pnpm exec nx graph --print`: 109 nodes, 304 dependency edges.
- `codex mcp get nx-mcp --json`: exit 0; enabled stdio registration discovered with `cmd.exe` and the exact fixed-workspace `corepack pnpm exec nx mcp` command.
- Repository `.codex\config.toml`: SHA-256 `2493FE0B6AE1C150F74AEEF1B1FEA37DCE92B4B62D46A020CA7D8DC3021831FB`; no `command = "npx"`; fixed local launcher present.
- `AGENTS.md`: SHA-256 remains `7AF5B2406E4F235EB07BA1BB5B804545C99D5F1B3FD45245A9E4BF7EFB2A2AB4`.

## Status

Confirmed for authorized local discovery and static configuration. Official Nx Codex files are generated, all seven skills validate, governance is preserved, local Nx project/details/graph checks pass, and installed Codex discovers the fixed-workspace `nx-mcp` registration. MCP runtime/tool invocation remains Untested by design. No MCP server start, build, test, CI, Nx Cloud, device, provider, deployment, publication, or release action was run.
