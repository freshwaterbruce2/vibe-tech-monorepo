# Symptom Tracker API

Local-first API for the Symptom Tracker UI.

This API uses Node's built-in SQLite (`node:sqlite`) so it doesn't require native add-on installs.

## Run (dev)

```bash
pnpm --filter symptom-tracker-api dev
```

Defaults:

- Port: `5055`
- Database: `D:\data\symptom-tracker\symptom-tracker.db` (must be on `D:\`)

## Run on phones + desktop (same home Wi‑Fi)

1) Build the UI once:

```bash
pnpm --filter symptom-tracker build
```

1) Start the API bound to your LAN:

```bash
# PowerShell
$env:HOST='0.0.0.0'
pnpm --filter symptom-tracker-api dev
```

1) On your phone, open: `http://<YOUR-PC-IP>:5055` and “Install app” from the browser menu.

Windows tip to find your IP:

```powershell
ipconfig
```

## Remote access (recommended: Tailscale)

If you want to use it away from home, the safest/simple route is a private VPN like Tailscale.
This avoids putting your health data on the public internet.

1) Install Tailscale on your PC + both phones, and sign in.
2) Start the API bound to all interfaces:

```powershell
$env:HOST='0.0.0.0'
pnpm --filter symptom-tracker-api dev
```

1) Find your PC’s Tailscale IP (usually `100.x.y.z`) and open:

`http://100.x.y.z:5055`
