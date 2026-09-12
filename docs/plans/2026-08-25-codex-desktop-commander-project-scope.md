# Codex Desktop Commander project-scope configuration

Status: blocked — configuration-only scope enforcement is not available

## Objective

Configure the existing `desktop-commander-v3` fork as a project-scoped Codex MCP server for trusted sessions rooted under `C:\projects`, with an effective access boundary that denies paths outside `C:\projects`.

## Authority and frozen scope

- Workspace authority: `C:\projects\AGENTS.md` and `C:\projects\SOL_ORCHESTRATED_WORKFLOW.md`.
- Fork candidate: `C:\projects\vibe-tech-monorepo\apps\desktop-commander-v3`.
- Codex configuration owner: `C:\projects\.codex\config.toml` only; do not edit global `C:\Users\fresh\.codex\config.toml`.
- This is a standalone compatibility/configuration gate. It does not migrate, synchronize, or declare the C: monorepo copy canonical over the separately governed `V:\monorepo` source root.
- No application-source edits, dependency installs/upgrades, builds, Git commands, device/provider/network actions, publishing, cleanup, deletion, or credential access.
- Keep the existing broad `filesystem` MCP disabled. Do not leave two overlapping filesystem/terminal servers enabled.
- Do not treat `cwd = "C:\\projects"` as an access-control boundary. The server or Codex tool allowlist must make outside-root operations fail closed.

## Allowed writes and ownership

- Terra executor: `C:\projects\.codex\config.toml` only, and only after proving a strict configuration-only boundary is available.
- Sol main thread: this task plan and the Vibe Assistant master/derived status documents.
- One writer per file. No application source may be changed.

## Execution checklist

- [x] Read project workflow, planning skill, Codex MCP documentation, Nx workspace skill, descendant workspace instructions, and master-agent routing guidance.
- [x] Locate the local fork and identify stale `V:`-based Claude configuration as non-current evidence.
- [x] Verify the current Codex project config has the old `filesystem` MCP disabled and Nx enabled.
- [x] Create and verify a timestamped secret-safe pre-edit snapshot.
- [x] Inspect project metadata and launch/build targets as far as the current package-manager mismatch permits.
- [x] Inspect the fork's current entry point, registered tools, and supported root/path restrictions without changing source.
- [x] Apply the fail-closed decision: configuration-only scope is impossible, so no Codex MCP entry was added.
- [ ] Cold-initialize the MCP server, enumerate tools, prove an allowed read under `C:\projects`, and prove a harmless outside-root read is rejected.
- [x] Verify `codex mcp list` and `codex mcp get desktop-commander` from `C:\projects` without exposing secrets.
- [x] Reconcile the master and derived status documents and run their consistency check.

## Verification contract

Success requires all of the following:

1. The configured command, args, cwd, and artifact exist on this C:-only laptop.
2. MCP initialize and tool enumeration succeed over stdio without stdout protocol pollution.
3. At least one read-only operation inside `C:\projects` succeeds.
4. The equivalent read-only operation against a harmless path outside `C:\projects` is rejected by the effective boundary.
5. No external/mutating tool is invoked during verification.
6. The old broad `filesystem` server remains disabled and the new server is project-scoped rather than global.

If any requirement cannot be proved without source changes, installation, or a broader permission grant, stop with status `blocked` or `partial`; do not weaken the scope or claim configuration success.

## Evidence and errors

- Official Codex MCP guidance confirms project-scoped `.codex/config.toml`, STDIO `command`/`args`/`cwd`, tool allowlists, and approval controls are supported.
- Current CLI: `codex-cli 0.149.1`.
- Existing project config: `mcp_servers.filesystem` points to `C:\dev\tools\mcp\filesystem.mjs` and is disabled.
- Fork discovered at `C:\projects\vibe-tech-monorepo\apps\desktop-commander-v3`; legacy `.mcp.json` points to unavailable `V:` and an old user-specific Node path, so it is not reusable as current configuration.
- Snapshot: `C:\projects\_vibe-snapshots\desktop-commander-codex-preedit-20260825-093513`, six files, 876,526 bytes.
- Attempt 1: a conservative snapshot scan rejected policy text containing secret-related terms; no files were written.
- Attempt 2: a credential-shape scan falsely matched `sk-` inside task/status identifiers; no files were written.
- Attempt 3: the detector was redesigned to require a token boundary, then the six-file secret-safe snapshot completed.
- Executor result: Blocked with no configuration edit. `C:\projects\.codex\config.toml` remains byte-identical to the snapshot.
- Toolchain: Node `v24.19.0`; installed pnpm `9.15.0`; workspace requires pnpm `>=10.28.2` and declares `pnpm@10.33.0`. No package-manager install or activation was attempted.
- No runnable fork artifact exists at `dist\mcp.js` or `dist\index.js`.
- `src\PathValidator.ts` hard-codes `V:\monorepo`, `D:\`, and a stale user-specific OneDrive path. It has no configuration/environment input that replaces those roots with `C:\projects`; `DC_ALLOW_BLOCKED_PATHS` only relaxes selected blocked-segment behavior.
- `src\mcp.ts` statically registers all system, filesystem, filesystem-mutation, UI, and media/web tool groups. The inventory includes file writes/deletes, application termination, mouse/keyboard control, PowerShell/CMD, screen/camera capture, URL fetch/search/open, and clipboard/system mutations.
- `MCP_CONFIG.json` is a legacy `V:` launcher/auto-approval file and does not define an allowed-root or safe-tool boundary.
- Live Codex state: `desktop-commander` is absent; the existing broad `filesystem` server remains disabled.
- Runtime initialization and inside/outside boundary calls are Untested by design because no runnable, safely scoped configuration exists.
- Independent Luna review confirmed the unchanged config SHA-256 `55EB3B4BDF3D257B4C71146144DE30DEE6514717A40973645AE93CD19EF1F2D7`, missing artifacts, stale hard-coded roots, broad static tool groups, and pnpm mismatch; no discrepancies or writes.
- Master/derived closeout checkpoint: `VA-FINISH-20260825-CODEX-DESKTOP-COMMANDER-BLOCKED-1`. `scripts\check-status-docs.ps1` returned `STATUS_DOCS_OK`.

## Closeout classification

- Fixed: none; the requested configuration was not safely achievable within this gate.
- Confirmed: pre-edit snapshot, unchanged project config, absent Desktop Commander entry, disabled broad filesystem entry, missing fork artifacts, stale hard-coded roots, broad action-capable tool inventory, and package-manager mismatch.
- Partial: static/Nx metadata and launch-path investigation; runtime project resolution did not pass the workspace package-manager gate.
- Blocked: strict `C:\projects` Desktop Commander configuration requires separately approved fork source hardening and a compatible build.
- Untested: cold MCP initialization and the inside-root-success/outside-root-denial runtime proof.

## Decision log

- Use the existing fork artifact only. Do not install the upstream Desktop Commander package or clone another repository under this approval.
- A fresh Codex session may be required to expose a newly configured MCP tool inventory; current-session absence alone will not be reported as configuration failure.
- Configuration is not equivalent to source hardening. The next possible unit requires separate approval to change the fork, add a `C:\projects` root seam, disable unsafe tools by default, build with the declared pnpm toolchain, and then repeat the boundary proof before registration.
