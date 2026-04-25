---
allowed-tools: Bash(ps:*), Bash(python:*), Bash(sqlite3:*), Bash(grep:*), Bash(tail:*), Bash(wc:*)
description: Review crypto trading restart readiness without starting live trading
model: sonnet
---

# Crypto Trading Restart Readiness

This command is observation-only. Do not stop, start, restart, or auto-confirm
live trading from an agent workflow. Use these checks to prepare a human
operator decision.

## Step 1: Resolve Runtime Database

Run from `C:\dev`:

```bash
cd apps/crypto-enhanced && python - <<'PY'
from pathlib import Path
env = Path('.env')
db_path = None
if env.exists():
    for line in env.read_text().splitlines():
        if line.strip().startswith('DB_PATH='):
            db_path = line.split('=', 1)[1].strip()
            break
print(db_path or 'D:\\databases\\trading.db')
PY
```

Use that path for all SQLite checks below. If the resolved database is missing,
stop and report that restart readiness cannot be assessed from local state.

## Step 2: Check Open Positions

```bash
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS open_positions FROM positions WHERE status='open';"
```

Report the count and warn the user if any open positions exist.

## Step 3: Check Pending Orders

```bash
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS pending_orders FROM orders WHERE status IN ('pending', 'open');"
```

Report the count and warn the user if any pending/open orders exist.

## Step 4: Inspect Running Processes

```bash
ps aux 2>/dev/null | grep -E "python.*(launch_auto|start_live)" | grep -v grep
```

On Windows, also inspect Python processes from PowerShell if available.

## Step 5: Read Recent Logs

```bash
cd apps/crypto-enhanced && if [ -f trading_new.log ]; then tail -30 trading_new.log; elif [ -f logs/trading.log ]; then tail -30 logs/trading.log; else echo "No log file found"; fi
```

## Step 6: Report

Summarize:

- resolved database path
- open position count
- pending order count
- running process count
- recent errors or warnings
- whether a human operator should review before restarting

Do not execute restart commands. If a restart is required, tell the human
operator which conditions to verify first.
