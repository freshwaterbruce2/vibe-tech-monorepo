# Crypto Enhanced

Scalping-first Kraken trading app for the monorepo. The canonical project path is
`C:\dev\apps\crypto-enhanced`.

## Current Shape

- Live trading launcher: `start_live_trading.py` (human operator only)
- Canonical implementation: `scripts/start_live_trading.py`
- Test runner: `run_tests.py`
- Core code: `src/`
- Tests: `tests/`
- Example config: `trading_config.example.json`
- Read-only account/status helper: `kraken_status.py`
- Script-level status helpers: `scripts/check_status.py` and `scripts/performance_monitor.py`

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
pnpm nx run crypto-enhanced:build
```

`crypto-enhanced:start` exists as an Nx target, but it launches the live trading
wrapper. Do not run it from an agent workflow.

## Direct Commands

Run from `C:\dev\apps\crypto-enhanced`:

```powershell
.\.venv\Scripts\python.exe run_tests.py
.\.venv\Scripts\python.exe kraken_status.py
.\.venv\Scripts\python.exe scripts\check_status.py
.\.venv\Scripts\python.exe scripts\performance_monitor.py monthly
.\stop_trading.ps1
```

Do not start, restart, or auto-confirm live trading from an agent workflow.

## Strategy Defaults

The example config is now set up for a scalping-first workflow:

- `micro_scalping` enabled
- `mean_reversion` disabled by default
- `range_trading` disabled by default

Tune those in `trading_config.json` rather than hardcoding live settings in the
strategy classes.

## Notes

- The legacy `C:\dev\projects\crypto-enhanced` location is retired.
- The live `.env` can override the DB with `DB_PATH`; on this machine it has
  pointed at `D:\databases\crypto-enhanced\trading.db`. Do not normalize DB
  locations without a backup-first migration plan.
- Several 2025 markdown files remain as historical notes; prefer this README,
  `PROJECT_GUIDE.md`, and the live scripts for the current operational surface.
