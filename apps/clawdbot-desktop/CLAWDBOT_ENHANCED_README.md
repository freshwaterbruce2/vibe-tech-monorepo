# ClawdBot Desktop

ClawdBot Desktop is a native Electron application that owns its own local gateway, WebSocket bridge, AI runtime, and Telegram channel integration.

## What Ships

- Local HTTP gateway at `http://127.0.0.1:18789`
- Local WebSocket bridge at `ws://127.0.0.1:18790`
- Native control surface renderer inside the desktop app
- Anthropic, OpenAI, or Moonshot / Kimi provider support
- Browser automation via Playwright
- Desktop automation via nut.js capabilities
- Native Telegram inbound polling channel
- In-memory per-session conversation isolation for Telegram and local chat/task flows
- Windows packaging through `electron-builder`

## What Does Not Ship

- External `clawdbot` CLI orchestration
- `clawdbot.json`
- Plugin-managed channels
- Discord, Slack, WhatsApp, voice, or canvas support
- Persistent long-term conversation storage across restarts

## Runtime Model

The desktop app is the control plane. Configuration lives in `~/.clawdbot/config.json` and is applied directly by the Electron main process.

```text
Renderer -> HTTP/WebSocket -> Electron main process -> ManusAgent / Telegram channel
```

## Configuration

Config file: `C:\Users\<user>\.clawdbot\config.json`

Example:

```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-sonnet-4-20250514",
    "baseUrl": ""
  },
  "gateway": {
    "port": 18789,
    "wsPort": 18790
  },
  "features": {
    "browserAutomation": true,
    "desktopAutomation": true,
    "aiChat": true
  },
  "channels": {
    "telegram": {
      "enabled": false,
      "botToken": "",
      "pollIntervalMs": 3000,
      "accessMode": "open",
      "allowedChatIds": []
    }
  }
}
```

Rules:
- Blank secret fields in the UI preserve the existing stored secret.
- `Clear API Key` removes the AI key and disables agent initialization.
- `Clear Telegram Token` removes the Telegram token and disables the Telegram channel.
- `allowlist` mode accepts only chat IDs listed in `allowedChatIds`.

## Supported APIs

HTTP:
- `GET /health`
- `GET /api/config`
- `POST /api/config`
- `GET /api/diagnostics`
- `POST /api/chat`
- `POST /api/execute`
- `GET /api/telegram/status`
- `POST /api/telegram/test`

WebSocket:
- `ping` -> `pong`
- activity event stream
- `chat`
- `execute`

## Telegram Behavior

Telegram v1 uses Bot API polling.

Supported commands:
- `/start`
- `/status`
- `/task <instruction>`
- plain text chat
- `/chat <message>`

Session model:
- one in-memory conversation per Telegram chat ID
- no cross-channel session merge
- sessions are reset when the app restarts or the agent is reinitialized

## Control Surface

The fallback renderer now includes:
- runtime health and capability diagnostics
- WebSocket probe based on real `ping`/`pong`
- provider, model, base URL, and API key management
- Telegram config and connectivity testing
- local chat and task forms
- live event log streamed from the backend

## Development

From `C:\dev`:

```powershell
pnpm nx run @vibetech/clawdbot-desktop:dev
pnpm nx run @vibetech/clawdbot-desktop:typecheck
pnpm nx run @vibetech/clawdbot-desktop:lint
pnpm nx run @vibetech/clawdbot-desktop:test
pnpm nx run @vibetech/clawdbot-desktop:build
pnpm nx run @vibetech/clawdbot-desktop:package:dir
pnpm nx run @vibetech/clawdbot-desktop:package
```

## Validation Baseline

The shipped project now includes app-owned tests for:
- config merge and redaction behavior
- Telegram channel connectivity and allowlist handling
- session memory isolation
- renderer control-surface payload collection and status rendering

## Packaging Output

Successful Windows packaging produces artifacts under `apps/clawdbot-desktop/release/`.

## Current Architecture Notes

- The desktop app is the only supported runtime.
- The old external CLI/plugin workflow is legacy and not part of the product surface.
- If documentation elsewhere mentions `clawdbot channels add`, `clawdbot gateway restart`, or `clawdbot.json`, treat it as obsolete.
