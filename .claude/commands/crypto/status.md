---
description: Check crypto trading system status including orders, positions, and logs
model: sonnet
---

You are automating the status check for the cryptocurrency trading system. This is a safety-critical system, so provide comprehensive diagnostics.

## Step 1: Navigate to Trading Directory

Execute this bash command:

```bash
cd apps/crypto-enhanced && pwd
```

Report to the user:
"📍 Working directory: [show the pwd output]"

## Step 2: Check Python Script - Order Status

Execute this bash command to run the order checking script:

```bash
cd apps/crypto-enhanced && python check_orders.py 2>&1
```

Present the output with this header:

```
════════════════════════════════════════
  ORDER CHECK SCRIPT OUTPUT
════════════════════════════════════════
```

If the command produces output, show it to the user.
If the command produces no output or returns an error, report:
"⚠ No output from check_orders.py or script encountered an error"

## Step 3: Query Recent Orders from Database

Execute this bash command to query the database:

```bash
cd apps/crypto-enhanced && if [ -f trading.db ]; then sqlite3 trading.db "SELECT order_id, pair, side, type, price, volume, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5;" 2>&1; else echo "Database file 'trading.db' not found"; fi
```

Present the output with this header:

```
════════════════════════════════════════
  RECENT DATABASE ORDERS (Last 5)
════════════════════════════════════════
```

Show the query results to the user. If no orders exist, report:
"📭 No orders found in database"

## Step 4: Check Current Positions

Execute this bash command to check open positions:

```bash
cd apps/crypto-enhanced && if [ -f trading.db ]; then sqlite3 trading.db "SELECT pair, size, entry_price, current_price, pnl, status, opened_at FROM positions WHERE status='open' ORDER BY opened_at DESC;" 2>&1; else echo "Database file 'trading.db' not found"; fi
```

Present the output with this header:

```
════════════════════════════════════════
  CURRENT OPEN POSITIONS
════════════════════════════════════════
```

Show the results. If no open positions, report:
"✓ No open positions (safe state)"

## Step 5: Check Account Balance

Execute this bash command to get current balance:

```bash
cd apps/crypto-enhanced && if [ -f trading.db ]; then sqlite3 trading.db "SELECT balance, available_balance, timestamp FROM account_balance ORDER BY timestamp DESC LIMIT 1;" 2>&1; else echo "Database file 'trading.db' not found"; fi
```

Present the output with this header:

```
════════════════════════════════════════
  ACCOUNT BALANCE
════════════════════════════════════════
```

Show the balance information.

## Step 6: Check Trading Logs

Execute this bash command to check recent logs:

```bash
cd apps/crypto-enhanced && if [ -f logs/trading.log ]; then tail -20 logs/trading.log; elif [ -f trading_new.log ]; then tail -20 trading_new.log; else echo "Log file not found. Checked: logs/trading.log and trading_new.log"; fi
```

Present the output with this header:

```
════════════════════════════════════════
  RECENT TRADING LOGS (Last 20 lines)
════════════════════════════════════════
```

Show the log output to the user.

## Step 7: Check System Health

Execute this bash command to verify critical files:

```bash
cd apps/crypto-enhanced && echo "Checking system files..." && \
ls -lh trading.db config.py nonce_state_primary.json 2>&1 | grep -v "cannot access" || echo "⚠ Some critical files missing"
```

Present the output with this header:

```
════════════════════════════════════════
  SYSTEM FILE STATUS
════════════════════════════════════════
```

## Step 8: Check if Trading Process is Running

Execute this bash command to check for running Python processes:

```bash
ps aux 2>/dev/null | grep -i "python.*trading" | grep -v grep || echo "No active trading processes detected"
```

On Windows, if the above fails, try:

```bash
tasklist 2>/dev/null | findstr /i "python" || echo "Process check not available on this system"
```

Present the output with this header:

```
════════════════════════════════════════
  ACTIVE TRADING PROCESSES
════════════════════════════════════════
```

## Step 9: Summary & Risk Assessment

After all checks complete, provide a summary:

```
════════════════════════════════════════
  STATUS CHECK COMPLETE
════════════════════════════════════════

SAFETY REMINDERS:
- Max position size: $10 per trade
- Max total exposure: $10
- Trading pair: XLM/USD only
- Current balance shown above

QUICK ACTIONS:
- View full logs: cd apps/crypto-enhanced && cat trading_new.log
- Stop trading: cd apps/crypto-enhanced && [stop command]
- Check API health: cd apps/crypto-enhanced && python test_api_status.py

RISK STATUS:
✓ Review open positions above
✓ Verify balance is within acceptable range
✓ Check for any error messages in logs
════════════════════════════════════════
```

**IMPORTANT EXECUTION NOTES:**

- Execute each bash command using the Bash tool
- All commands should be run from the C:\dev directory as base
- If a command fails, note the error but continue to next step
- This is a financial trading system - accuracy is critical
- If you see concerning activity (many failed orders, unusual positions), alert the user immediately
