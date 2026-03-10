# Channel Setup Guide

This desktop app currently supports one external inbound channel: Telegram.

## Supported Channel Matrix

| Channel | Supported | Notes |
| --- | --- | --- |
| Telegram | Yes | Native polling channel built into the Electron app |
| Discord | No | Not implemented |
| Slack | No | Not implemented |
| WhatsApp | No | Not implemented |
| Voice | No | Not implemented |

## Telegram Setup

### 1. Create a Bot

1. Open Telegram.
2. Message `@BotFather`.
3. Run `/newbot`.
4. Choose a bot name and username.
5. Copy the token.

### 2. Open ClawdBot Desktop

Run:

```powershell
pnpm nx run @vibetech/clawdbot-desktop:dev
```

### 3. Configure Telegram in the Control Surface

In the desktop window:
- enable `Telegram`
- paste the bot token
- choose `open` or `allowlist`
- if using `allowlist`, enter one chat ID per line
- optionally adjust the poll interval
- click `Test Connectivity`
- click `Save And Apply`

### 4. Verify Status

Expected status after a valid save:
- `Telegram connected`
- a bot username in the Telegram diagnostic card
- `/health` shows `channels.telegram.state = connected`

## Telegram Commands

Supported inbound commands:
- `/start`
- `/status`
- `/task <instruction>`
- `/chat <message>`
- plain text chat

## Access Control

`open`
- accepts messages from any Telegram chat that can reach the bot

`allowlist`
- accepts messages only from chat IDs listed in `allowedChatIds`
- all other chats are rejected and logged in the event stream

## Connectivity Test

The control surface `Test Connectivity` action verifies the current token against Telegram `getMe` before saving anything else.

You can also inspect status directly:

```powershell
Invoke-RestMethod http://127.0.0.1:18789/api/telegram/status
```

## Troubleshooting

Invalid token:
- regenerate the token in `@BotFather`
- test again before saving

Channel enabled but not connected:
- verify the token is present
- verify outbound HTTPS access to `api.telegram.org`
- check the desktop event log for `telegram_error`

Allowlist blocking expected chats:
- copy the exact numeric chat ID
- remove whitespace or duplicate entries
- save again

## Legacy Warning

This app does not use:
- `clawdbot channels add`
- `clawdbot gateway restart`
- plugin-installed channels
- `clawdbot.json`
