# Crypto Enhanced

Scalping-first Kraken trading app for the monorepo. The canonical project path is
`C:\dev\apps\crypto-enhanced`.

## Current Shape

- Live trading launcher: `start_live_trading.py`
- Canonical implementation: `scripts/start_live_trading.py`
- Test runner: `run_tests.py`
- Core code: `src/`
- Tests: `tests/`
- Example config: `trading_config.example.json`

## Quick Start

```powershell
cd C:\dev\apps\crypto-enhanced
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
Copy-Item trading_config.example.json trading_config.json
```

## Nx Commands

Run from `C:\dev`:

```powershell
pnpm nx run crypto-enhanced:install
pnpm nx run crypto-enhanced:test
pnpm nx run crypto-enhanced:lint
pnpm nx run crypto-enhanced:typecheck
pnpm nx run crypto-enhanced:start
```

## Direct Commands

Run from `C:\dev\apps\crypto-enhanced`:

```powershell
.\.venv\Scripts\python.exe run_tests.py
.\.venv\Scripts\python.exe start_live_trading.py
.\launch_trading.ps1
.\stop_trading.ps1
```

## Strategy Defaults

The example config is now set up for a scalping-first workflow:

- `micro_scalping` enabled
- `mean_reversion` disabled by default
- `range_trading` disabled by default

Tune those in `trading_config.json` rather than hardcoding live settings in the
strategy classes.

## Notes

- The legacy `C:\dev\projects\crypto-enhanced` location is retired.
- Several 2025 markdown files remain as historical notes; prefer this README,
  `PROJECT_GUIDE.md`, and the live scripts for the current operational surface.
