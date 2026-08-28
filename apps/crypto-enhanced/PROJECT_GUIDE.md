# Crypto Enhanced Project Guide

## Canonical Location

- App: `V:\monorepo\apps\crypto-enhanced`
- Legacy path: `V:\monorepo\projects\crypto-enhanced` is retired

## Runtime Surface

- Live launcher wrapper: `start_live_trading.py`
- Canonical live launcher: `scripts/start_live_trading.py`
- Test runner wrapper: `run_tests.py`
- Read-only account/status helper: `kraken_status.py`
- Script-level status helpers: `scripts/check_status.py`, `scripts/performance_monitor.py`
- Health monitor: `check_trading_health.ps1` (read-only unless `-AutoKill` is passed)
- Graceful shutdown: `stop_trading.ps1`

## Code Layout

```text
apps/crypto-enhanced/
├── src/
│   ├── config.py
│   ├── kraken_client.py
│   ├── websocket_manager.py
│   ├── trading_engine.py
│   ├── strategies.py
│   ├── database.py
│   └── risk/
├── scripts/
│   ├── start_live_trading.py
│   ├── launch_auto.py
│   └── final_system_check.py
├── tests/
├── trading_config.example.json
├── start_live_trading.py
└── run_tests.py
```

## Setup

```powershell
cd V:\monorepo\apps\crypto-enhanced
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
Copy-Item trading_config.example.json trading_config.json
```

## Verification

```powershell
cd V:\monorepo\apps\crypto-enhanced
.\.venv\Scripts\python.exe run_tests.py
.\.venv\Scripts\python.exe -m pylint src scripts start_live_trading.py run_tests.py
.\.venv\Scripts\python.exe -m mypy src scripts start_live_trading.py run_tests.py
```

Use `run_tests.py` for the default test path; it disables unrelated host pytest
plugins and skips the live authentication integration test by default.

## Runtime Data

- `src/config.py` honors `DB_PATH` when it is present in `.env`.
- On this machine, `.env` has pointed at `D:\databases\crypto-enhanced\trading.db`.
- `D:\databases\DB_INVENTORY.md` also lists a top-level `D:\databases\trading.db`
  as a live but minimal crypto database.
- Treat any DB-path cleanup as backup-first migration work, not a docs-only edit.

## Live Trading Safety

- The launcher still requires explicit `YES` confirmation unless you pass
  `--auto-confirm`.
- Use `trading_config.json` to tune strategy behavior.
- The example config is set for a scalping-first setup, with micro scalping enabled
  and the other strategies disabled by default.
- Do not rely on older markdown summaries for current entrypoints or current paths.
- Do not pass `--auto-confirm` or pipe `YES` from an agent workflow.
