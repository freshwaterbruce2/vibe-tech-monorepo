# Feature Spec: Remote Development (Remote-SSH + Dev Containers + WSL)

**Status**: 📋 PLANNED (PARTIAL — `src/services/RemoteConnectionManager.ts` only does one-shot `ssh <host> <command>` exec via `Command.create('ssh', …)`; no remote editing, no remote LSP/terminal multiplexing, no Dev Containers, no WSL)
**Priority**: MEDIUM (Wave 3)
**Effort**: L–XL — Remote-SSH FS+terminal is L on its own; full parity (LSP proxy + Dev Containers + WSL) is XL
**Competitor parity**: VS Code Remote-SSH, Dev Containers, WSL extensions
**Dependencies**: `@tauri-apps/plugin-shell` (existing SSH exec path), Rust (`ssh2` or `russh` crate for the Tauri backend tunnel), `@devcontainers/cli` (containers.dev reference implementation), spec 07 (LSP client, proxied over the remote channel)

---

## User Story

As a developer, I want to open a folder on a remote host (over SSH, inside a Dev Container, or in WSL) and have the editor, terminal, and language intelligence behave exactly as if the folder were local, so that I can develop against a remote environment's exact toolchain without SSHing in a separate terminal window and hand-copying files.

## Why VCS lacks this today

`RemoteConnectionManager.executeRemoteCommand()` runs a single command over `ssh` per call — functional for one-shot exec (`ls`, `cat`, echo-write) but each call pays full SSH handshake cost, there is no persistent channel, no PTY allocation for an interactive remote terminal, no filesystem watch/stream, and no way to run a language server on the remote host and speak LSP to it from the local Monaco instance. Dev Containers and WSL have no representation at all — `RemoteConnectionManager`'s `RemoteConnection` type models only bare SSH hosts.

Concretely: today's `listRemoteFiles()`/`readRemoteFile()`/`writeRemoteFile()` each shell out to a fresh `ssh ... "ls -la ..."` / `cat` / `echo > file` invocation — workable for occasional inspection, unusable as the backing store for a live file explorer or an editor that needs to save on every keystroke-pause without a multi-hundred-millisecond SSH handshake tax per operation.

## Acceptance Criteria

1. ⬜ A **remote agent** binary (single small Rust or Node executable) can be uploaded to the SSH host once per connection and launched over the existing SSH session, exposing filesystem, PTY, and process-exec operations over one multiplexed channel
2. ⬜ Opening a remote folder shows it in the file explorer exactly like a local workspace — browse, open, edit, save all route through the remote agent instead of `FileSystemService`'s local fs calls
3. ⬜ A remote terminal tab allocates a real PTY on the host (not per-command exec) with correct resize/signal forwarding, reusing `TerminalService`'s session model
4. ⬜ Connection lifecycle (connect/reconnect/disconnect) is managed by the Tauri Rust backend, not the webview — the SSH tunnel survives webview reloads
5. ⬜ Remote LSP: a language server for the remote workspace's language runs **on the host**, and its stdio is proxied through the same multiplexed channel to VCS's local LSP client (spec 07) — diagnostics/completions/go-to-def all reflect the remote toolchain, not the local one
6. ⬜ Dev Containers: VCS detects a `.devcontainer/devcontainer.json` in the opened folder and offers "Reopen in Container"
7. ⬜ Dev Containers: uses `@devcontainers/cli` to build/start the container per the containers.dev spec, then attaches the same remote-agent proxy (fs/PTY/LSP) to `docker exec` instead of SSH
8. ⬜ WSL: folders under `\\wsl$\<distro>\...` (or opened via a "WSL: Open Folder" command) route fs/terminal operations through `wsl.exe -d <distro> <command>` — treated as a local remote, no SSH involved
9. ⬜ Connection status (connected/connecting/error) is visible in the status bar with the active host/container/distro name, consistent with existing `RemoteConnection.status` states
10. ⬜ Losing the connection mid-session surfaces a clear reconnect prompt and does not silently discard unsaved editor state

## Architecture / Solution

The key architectural shift from today's one-shot `Command.create('ssh', …)` calls is: **the Tauri Rust backend owns the connection and agent lifecycle; the webview never talks SSH directly.**

```
Webview (React)                  Tauri Rust backend                  Remote host
─────────────────                ──────────────────                  ───────────
FileSystemService  ──invoke()──▶  RemoteSession manager   ──ssh2/russh──▶  remote-agent process
TerminalService                    (one persistent SSH                     ├─ fs read/write/watch
LSP client (spec 07)                connection per remote,                 ├─ PTY spawn/write/resize
                                     multiplexed channels)                  └─ exec (LSP server, etc.)
      ▲                                    │
      └──────── tauri events (fs-change, pty-data, lsp-stdio) ◀────────────┘
```

Concretely: the Rust backend uses an SSH crate (`russh` preferred — pure Rust, async, avoids libssh2 native linking headaches on Windows) to open **one** authenticated connection per remote, then multiplexes several logical streams over it (SFTP-like fs ops, a PTY channel per open terminal, a raw stdio channel per remote LSP process) instead of spawning a new `ssh` process per operation. This mirrors how VS Code's Remote-SSH extension works (upload a small server, keep one connection, multiplex).

For Dev Containers, the same remote-agent binary and multiplexed-channel abstraction is reused, just tunneled through `docker exec -i <container> <remote-agent>` instead of SSH — `@devcontainers/cli` handles the `devcontainer.json` parsing, image build/pull, and container lifecycle (up/exec/down); VCS shells out to the CLI via `@tauri-apps/plugin-shell` rather than reimplementing the spec.

For WSL, no remote agent is needed at all — `wsl.exe` with `-d <distro>` gives direct process exec, and `\\wsl$\<distro>\...` UNC paths are directly readable/writable by `FileSystemService` on Windows, so WSL is the cheapest of the three by far.

Extended `RemoteConnection` type (superset of today's SSH-only shape):

```ts
interface RemoteConnection {
  id: string;
  name: string;
  kind: 'ssh' | 'devcontainer' | 'wsl'; // new discriminant
  host?: string;
  port?: number;
  username?: string; // ssh-only
  authMethod?: 'key' | 'password';
  privateKeyPath?: string; // ssh-only
  containerConfig?: { workspaceFolder: string; devcontainerPath: string }; // devcontainer-only
  distro?: string; // wsl-only
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  lastConnected?: number;
}
```

## Implementation (phased)

### Phase 1 — Remote-SSH FS + terminal

- `src-tauri/src/remote/` (new Rust module): `russh`-based `RemoteSession`, agent upload-over-SFTP, agent process launch
- Remote-agent binary (Rust, small — fs ops + PTY spawn + generic exec over a length-prefixed JSON or msgpack protocol)
- Extend `src/services/RemoteConnectionManager.ts`: replace per-call `Command.create('ssh', …)` exec with `invoke('remote_connect'/'remote_fs_read'/'remote_pty_spawn'/...)` calls into the new Rust commands
- `FileSystemService.ts` gains a remote-aware code path (delegates to `RemoteConnectionManager` when `isRemote()` is true) instead of local `fs`/Tauri fs-plugin calls
- `TerminalService.ts` gains a remote PTY path parallel to its existing `startShellTauri` — same `pty_spawn`/`pty_write`/`pty_resize` command names, routed to the remote agent when a `RemoteConnection` is active

### Phase 2 — Remote LSP

- Extend the remote-agent protocol with an "exec + pipe stdio" mode for launching a language server binary on the host
- Spec 07's LSP client gains a transport abstraction (local stdio vs. remote-proxied stdio over the multiplexed channel) — the LSP message layer (JSON-RPC) is unchanged, only the transport differs
- Server binary resolution on the remote host (assume host has the toolchain installed; VCS does not provision language servers remotely in v1)

### Phase 3 — Dev Containers via CLI

- Detect `.devcontainer/devcontainer.json` on folder open; "Reopen in Container" command
- Shell out to `@devcontainers/cli` (`devcontainer up --workspace-folder <path>`, `devcontainer exec`) via `@tauri-apps/plugin-shell`
- Attach the same remote-agent binary inside the container (copied in via `docker cp` or built into a CLI-generated image layer), reusing the Phase 1/2 fs/PTY/LSP proxy unchanged

### Phase 4 — WSL

- `RemoteConnectionManager` gains a `wsl` connection kind alongside `ssh`
- fs ops for WSL folders resolve through `\\wsl$\<distro>\` UNC paths directly (no agent)
- terminal/exec ops shell to `wsl.exe -d <distro> -- <command>` via existing `TerminalService`/`@tauri-apps/plugin-shell` patterns, no new Rust code required

## Integration points (existing code to hook into)

- `src/services/RemoteConnectionManager.ts` — extended, not replaced: `RemoteConnection` type gains a `kind: 'ssh' | 'devcontainer' | 'wsl'` discriminant; existing Gist-free localStorage persistence pattern stays
- `src/components/RemoteConnectionPanel.tsx` — add container/WSL connection types to the existing connection-picker UI
- `src/services/FileSystemService.ts` — gains remote-delegating branch, mirroring how `TerminalService` already branches on `_isTauri`
- `src/services/TerminalService.ts` — remote PTY path added parallel to `startShellTauri`
- Spec 07 LSP client — transport abstraction consumed here, not re-implemented
- `src-tauri/` — new `remote` module for the Rust-side SSH/agent lifecycle; this is the first spec in this plan that requires meaningful new Rust code beyond thin command wrappers

## Test Scenarios

- Vitest: `RemoteConnectionManager.test.ts` (extended) — mock Tauri `invoke`, assert `kind: 'ssh'` connections call `remote_connect` not raw `Command.create('ssh', …)`
- Rust unit tests (`src-tauri/src/remote/`): agent protocol round-trip (fs read/write, PTY spawn) against a local test SSH server (e.g. `russh`'s own test harness or a Docker `sshd` fixture)
- Playwright (E2E, requires a reachable test SSH host or container fixture): connect → browse remote fs in explorer → open a remote file → edit → save → assert content changed on host
- Playwright (E2E): "Reopen in Container" on a fixture repo with a minimal `devcontainer.json` → assert terminal commands execute inside the container (`hostname` returns the container ID, not the host machine)
- Manual/CI-gated: WSL path — `wsl.exe -l` fixture check, open `\\wsl$\Ubuntu\home\...` folder, verify fs ops succeed on a Windows CI runner with WSL2 enabled

## Success Metrics

- Remote file open-to-editable latency < 500ms after initial connection (excludes first-connect agent upload time)
- Single persistent SSH connection handles ≥10 concurrent logical channels (fs + multiple terminals + LSP) without new TCP/SSH handshakes per operation — measurable via connection count in Rust backend logs
- Dev Container cold start (via `@devcontainers/cli`) within the CLI's own reported build/pull time, no VCS-added overhead beyond agent attach (< 2s)
- Zero unsaved-edit data loss across 20 simulated mid-session disconnects (reconnect prompt path exercised, not just the happy path)
- WSL fs operations (Phase 4) perform within 10% of native local `FileSystemService` latency, since `\\wsl$` is a direct UNC path with no agent hop

## Windows-specific notes

- The Windows OpenSSH client (`ssh.exe`, bundled since Windows 10) remains available as a fallback exec path for diagnostics even after the `russh`-based persistent connection lands, since `RemoteConnectionManager` already depends on `@tauri-apps/plugin-shell`'s `Command.create('ssh', …)` today
- `wsl.exe` output encoding on Windows PowerShell hosts can default to UTF-16LE depending on locale; `TerminalService`'s remote WSL path must force UTF-8 output (`wsl.exe --exec` with explicit encoding handling) to avoid mangled non-ASCII file content
- `\\wsl$\<distro>\` paths are not visible until the target distro has been started at least once in that boot session — the WSL connection flow should proactively run a no-op `wsl.exe -d <distro> true` before first fs access to guarantee the UNC path is mounted

---

**Risks / Open questions**: `russh` vs `ssh2` (libssh2 bindings) tradeoff needs a spike — `russh` avoids native library linking pain on Windows cross-compilation but is less battle-tested; this should be validated in Phase 1 before committing. Remote language server provisioning (auto-installing an LSP server on a host that doesn't have one) is explicitly out of scope for v1 — matches VS Code Remote-SSH's own early behavior. Microsoft blocked Remote-SSH and Dev Containers extensions from running in VS Code forks in 2025 (marketplace + telemetry restrictions), so even Cursor had to rebuild this capability from scratch — VCS is not behind forks here, it's on a level field, and Tauri's Rust backend is arguably better positioned for it than Electron's Node-in-main-process model.
**Sequencing**: Wave 3. Phase 2 (remote LSP) is hard-blocked on spec 07 (LSP client) landing first. Phases 1, 3, 4 can proceed independently of spec 07, but Phase 3 (Dev Containers) benefits from Phase 1's agent/proxy already existing.
