# Quick Start

## Prerequisites

- Windows 11
- Node.js 22+
- pnpm 10+
- A valid Anthropic, OpenAI, or Moonshot / Kimi API key
- Optional: a Telegram bot token from `@BotFather`

## Install

```powershell
cd C:\dev
pnpm install
```

## Configure

Create `C:\Users\<user>\.clawdbot\config.json`:

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

## Prepare Browser Automation

```powershell
npx playwright install chromium
```

## Run

```powershell
pnpm nx run @vibetech/clawdbot-desktop:dev
```

The app will:
- start the local HTTP gateway on `18789`
- start the WebSocket bridge on `18790`
- initialize the desktop window
- initialize the AI agent if an API key is present
- initialize Telegram polling if Telegram is enabled and configured

## Validate

Open these endpoints:
- `http://127.0.0.1:18789/health`
- `http://127.0.0.1:18789/`

Run the local validation suite:

```powershell
pnpm nx run @vibetech/clawdbot-desktop:typecheck
pnpm nx run @vibetech/clawdbot-desktop:lint
pnpm nx run @vibetech/clawdbot-desktop:test
```

## Package

```powershell
pnpm nx run @vibetech/clawdbot-desktop:package
```

Installer output:
- `apps/clawdbot-desktop/release/ClawdBot Desktop Setup 1.0.0.exe`

## Common Checks

Health:
```powershell
Invoke-RestMethod http://127.0.0.1:18789/health
```

Chat:
```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:18789/api/chat -ContentType application/json -Body '{"message":"What can you do locally?"}'
```

Task:
```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:18789/api/execute -ContentType application/json -Body '{"task":"Take a desktop screenshot and tell me where it was saved"}'
```

Telegram connectivity test:
- open the desktop app
- enter the Telegram token in the control surface
- click `Test Connectivity`
- then `Save And Apply`

## Unsupported Paths

Do not use these with this app:
- `clawdbot channels add`
- `clawdbot gateway restart`
- `clawdbot.json`
- plugin-based channel installation
