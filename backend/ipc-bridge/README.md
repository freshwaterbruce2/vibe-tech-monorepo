# IPC Bridge

IPC Bridge is the local WebSocket and health endpoint bridge shared by NOVA Agent and Vibe Code Studio. The production contract is a Windows-managed background process with canonical `/healthz`, `/readyz`, and `/metrics` endpoints plus compatibility aliases for `/health` and `/status`.

## Runtime contract

- WebSocket endpoint: `ws://localhost:5004`
- Health endpoints:
  - `GET /healthz`
  - `GET /health`
  - `GET /readyz`
  - `GET /status`
  - `GET /metrics`
- Auth:
  - Canonical secret: `BRIDGE_SECRET`
  - Compatibility fallback: `IPC_BRIDGE_SECRET`
  - Accepted transport: `Authorization: Bearer <secret>`, `x-bridge-secret`, or `?token=<secret>`

## Development

From the monorepo root:

```bash
pnpm nx run ipc-bridge:typecheck
pnpm nx run ipc-bridge:lint
pnpm nx run ipc-bridge:test
pnpm nx run ipc-bridge:build
pnpm nx run ipc-bridge:start
```

Local package scripts are also available inside `backend/ipc-bridge`:

```bash
pnpm run dev
pnpm run build
pnpm run test
```

## Health checks

```powershell
curl http://localhost:5004/healthz
curl http://localhost:5004/health
curl http://localhost:5004/readyz
curl http://localhost:5004/status
curl http://localhost:5004/metrics
```

## Windows service operation

The supported Windows service host is NSSM. Build the bridge first, then install it as a managed background service:

```powershell
pnpm run build
pnpm run service:install -BridgeSecret 'replace-me'
```

The install script configures:

- Auto-start on boot
- Restart on process exit
- Dedicated stdout/stderr logs under `backend/ipc-bridge/logs/`
- `PORT` and `BRIDGE_SECRET` environment variables for the service process

To remove the service:

```powershell
pnpm run service:remove
```

If `nssm.exe` is not on `PATH`, pass `-NssmPath` to the install/remove scripts.

## Validation

Do not rely on historical notes. Use a fresh run:

```bash
pnpm nx run ipc-bridge:typecheck
pnpm nx run ipc-bridge:lint
pnpm nx run ipc-bridge:test
pnpm nx run ipc-bridge:build
```

Then verify the live process responds on `/healthz`, `/readyz`, `/metrics`, and that authorized WebSocket clients can connect with `BRIDGE_SECRET`.
