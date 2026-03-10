# Safe Migration

This note is for users moving from the old external `clawdbot` CLI or plugin-driven workflow to the native desktop application in `apps/clawdbot-desktop`.

## Product Boundary

The supported product is now the Electron desktop app.

Source of truth:
- runtime: `apps/clawdbot-desktop/electron/main.ts`
- config: `C:\Users\<user>\.clawdbot\config.json`
- renderer: `apps/clawdbot-desktop/renderer/`

Not supported as the primary runtime:
- external `clawdbot` daemon control
- plugin-managed channels
- `clawdbot.json`

## Mapping From Old Model To Current Model

| Legacy concept | Current model |
| --- | --- |
| `clawdbot.json` | `config.json` under `~/.clawdbot/` |
| external gateway process | built into the Electron main process |
| channel plugins | native modules inside the desktop app |
| CLI restart commands | save config through the app; runtime reinitializes in-process |

## Minimal Migration Steps

1. Keep using `~/.clawdbot/` as the user data directory.
2. Move AI provider settings into `config.json`.
3. Remove assumptions about plugin folders and CLI channel registration.
4. Re-enter Telegram configuration in the desktop control surface if needed.
5. Validate with:

```powershell
Invoke-RestMethod http://127.0.0.1:18789/health
pnpm nx run @vibetech/clawdbot-desktop:test
```

## Example Current Config

```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-..."
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

## Expected Behavior Changes

- Saving config in the UI applies changes immediately.
- Blank secret fields preserve the stored secret.
- `Clear API Key` and `Clear Telegram Token` perform explicit secret removal.
- Telegram sessions are isolated per chat and kept in memory only.

## Remove Old Assumptions

If you still have notes or scripts that mention these, retire them:
- `clawdbot channels add`
- `clawdbot gateway restart`
- plugin enable/disable flows
- `clawdbot.json`
