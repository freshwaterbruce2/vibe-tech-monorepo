# Capability Status

This file replaces the old speculative roadmap. It records the current product status for `apps/clawdbot-desktop`.

## Shipped Runtime

- Electron desktop shell
- local HTTP gateway
- local WebSocket bridge
- native control-surface renderer
- Anthropic and OpenAI provider selection
- browser automation diagnostics
- desktop automation diagnostics
- native Telegram polling channel
- Windows packaging through `electron-builder`
- deterministic test coverage for config, Telegram, sessions, and renderer helpers

## Supported Workflows

- local chat through `/api/chat`
- autonomous task execution through `/api/execute`
- health and diagnostics inspection through `/health` and `/api/diagnostics`
- runtime config updates without restarting the app
- Telegram inbound chat and `/task` routing

## Unsupported Workflows

- plugin-managed channels
- `clawdbot` CLI-driven channel registration
- Discord, Slack, WhatsApp, or voice channels
- persistent long-term memory restore after restart
- visual canvas or multi-agent orchestration surfaces

## Quality Bar

The project is considered releasable only when these pass:

```powershell
pnpm nx run @vibetech/clawdbot-desktop:typecheck
pnpm nx run @vibetech/clawdbot-desktop:lint
pnpm nx run @vibetech/clawdbot-desktop:test
pnpm nx run @vibetech/clawdbot-desktop:build
pnpm nx run @vibetech/clawdbot-desktop:package:dir
```

## Packaging Outputs

Expected packaging artifacts:
- `apps/clawdbot-desktop/release/win-unpacked/`
- `apps/clawdbot-desktop/release/ClawdBot Desktop Setup 1.0.0.exe`

## Current Operational Notes

- the control surface is the supported configuration path
- secrets remain masked on read and are preserved unless explicitly cleared
- Telegram sessions are isolated per chat ID and reset on app restart
- documentation that mentions `clawdbot.json` or plugin-managed channels is obsolete
