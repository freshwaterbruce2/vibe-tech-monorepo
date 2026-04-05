# Crypto Enhanced Project Guide

## Canonical Location

- App: `C:\dev\apps\crypto-enhanced`
- Legacy path: `C:\dev\projects\crypto-enhanced` is retired

## Runtime Surface

- Live launcher wrapper: `start_live_trading.py`
- Canonical live launcher: `scripts/start_live_trading.py`
- Test runner wrapper: `run_tests.py`
- Health monitor: `check_trading_health.ps1`
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
cd C:\dev\apps\crypto-enhanced
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
Copy-Item trading_config.example.json trading_config.json
```

## Verification

```powershell
cd C:\dev\apps\crypto-enhanced
.\.venv\Scripts\python.exe run_tests.py
.\.venv\Scripts\python.exe -m pylint src scripts start_live_trading.py run_tests.py
.\.venv\Scripts\python.exe -m mypy src scripts start_live_trading.py run_tests.py
```

## Live Trading Safety

- The launcher still requires explicit `YES` confirmation unless you pass
  `--auto-confirm`.
- Use `trading_config.json` to tune strategy behavior.
- The example config is set for a scalping-first setup, with micro scalping enabled
  and the other strategies disabled by default.
- Do not rely on older markdown summaries for current entrypoints or current paths.
