---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-01-22
project:
  name: crypto-enhanced
  path: apps/crypto-enhanced
category: python
---

# crypto-enhanced AI Notes

## What this project is

- Live cryptocurrency trading system (Kraken WebSocket V2 + REST), safety-first.

## Absolute safety rules

- Never place live trades without explicit human confirmation.
- Never run multiple instances at the same time.
- Never commit API keys; use env vars.

## Commands (Nx preferred)

- Install venv deps: `pnpm nx install crypto-enhanced`
- Tests: `pnpm nx test crypto-enhanced`
- Start (live trading entry): `pnpm nx start crypto-enhanced`

## Storage

- Code: `C:\dev\apps\crypto-enhanced`
- Database/state/logs: must live on `D:\` (see workspace rules)

## References

- Workspace rules: [../../docs/ai/WORKSPACE.md](../../docs/ai/WORKSPACE.md)
- Crypto safety: [../../docs/ai/areas/CRYPTO.md](../../docs/ai/areas/CRYPTO.md)
