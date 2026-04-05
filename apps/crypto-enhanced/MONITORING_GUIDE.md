# 📊 Real-Time Monitoring Quick Reference

**Purpose**: Fast reference for monitoring accumulation limits and optimizations during live trading

---

## 🎯 Key Metrics to Watch

### Current Status Display

```powershell
# Quick status check (add this to a PowerShell script)
$logPath = "C:\dev\apps\crypto-enhanced\logs\trading_new.log"
Write-Host "=== TRADING BOT QUICK STATUS ===" -ForegroundColor Cyan
Write-Host "Last 5 log entries:" -ForegroundColor Yellow
Get-Content $logPath -Tail 5
Write-Host "`nActive processes:" -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime, CPU
```

---

## 📈 Accumulation Tracking

### What to Look For in Logs

#### ✅ GOOD - Normal Operation

```
INFO: RSI oversold signal - RSI=32.45, Price=$0.3567, Accumulated=45.23 XLM
INFO: Updated accumulation: 58.76 XLM (entry #4)
INFO: Reduced accumulation: 42.34 XLM remaining
```

#### ⚠️ WARNING - Approaching Limits

```
INFO: Adjusted position size from $8.00 to $5.50 to respect accumulation limit
WARNING: Remaining capacity too small ($0.75)
```

#### 🛑 CRITICAL - At Limit

```
WARNING: Max accumulation reached (100.00 XLM >= 100 XLM)
WARNING: Max accumulation reached (80.00 XLM) [Range Trading]
```

#### 🔄 INFO - Sync Operations

```
INFO: Syncing accumulation from 95.00 to 97.50 XLM
```

**Note**: Occasional syncs are normal. Frequent syncs (every evaluation) indicate a problem.

---

## 🔍 Log Patterns to Monitor

### Search for Accumulation Updates

```powershell
# Find all accumulation-related messages in last hour
Get-Content trading_new.log | Select-String -Pattern "accumulation|Accumulated" | Select-Object -Last 20

# Find max accumulation warnings
Get-Content trading_new.log | Select-String -Pattern "Max accumulation reached"

# Find position size adjustments
Get-Content trading_new.log | Select-String -Pattern "Adjusted position size"

# Find sync operations
Get-Content trading_new.log | Select-String -Pattern "Syncing accumulation"
```

---

## 📊 Database Queries

### Check Current Accumulation

```powershell
python -c "
import sqlite3
conn = sqlite3.connect('trading.db')
cursor = conn.cursor()

# Get total XLM in open positions
cursor.execute('''
    SELECT SUM(volume) as total_xlm, COUNT(*) as position_count
    FROM positions
    WHERE pair = 'XLM/USD' AND status = 'open'
''')
result = cursor.fetchone()
print(f'Total Open XLM Positions: {result[0]:.2f} XLM across {result[1]} positions')

# Get recent trades
cursor.execute('''
    SELECT timestamp, side, volume, price, strategy
    FROM trades
    ORDER BY timestamp DESC
    LIMIT 10
''')
print('\nRecent Trades:')
for row in cursor.fetchall():
    print(f'{row[0]} | {row[1]:4s} | {row[2]:8.2f} XLM @ ${row[3]:.4f} | {row[4]}')

conn.close()
"
```

### Check Daily Trade Count

```powershell
python -c "
import sqlite3
from datetime import datetime, timedelta
conn = sqlite3.connect('trading.db')
cursor = conn.cursor()

today = datetime.now().strftime('%Y-%m-%d')
cursor.execute('''
    SELECT COUNT(*) as trade_count, SUM(volume) as total_volume
    FROM trades
    WHERE DATE(timestamp) = ?
''', (today,))
result = cursor.fetchone()
print(f'Today ({today}):')
print(f'  Trades: {result[0]}')
print(f'  Total Volume: {result[1]:.2f} XLM' if result[1] else '  Total Volume: 0 XLM')

conn.close()
"
```

---

## 🚦 Health Indicators

### GREEN - Everything Normal

- ✅ Accumulation values increase on buys, decrease on sells
- ✅ Sync operations are rare (< 1 per hour)
- ✅ Position sizes are standard ($7-9)
- ✅ No "Max accumulation" warnings
- ✅ Trades execute successfully
- ✅ WebSocket stays connected

### YELLOW - Minor Issues

- ⚠️ Frequent sync operations (> 5 per hour)
- ⚠️ Position size adjustments occurring
- ⚠️ Accumulation approaching 80-90 XLM
- ⚠️ Some trades rejected due to limits

### RED - Needs Attention

- 🛑 Constant "Max accumulation" warnings
- 🛑 All trades rejected due to accumulation
- 🛑 Accumulation drift (sync doesn't fix it)
- 🛑 Python exceptions in strategies
- 🛑 WebSocket disconnecting repeatedly

---

## 📋 Quick Checks Every Hour

```powershell
# Run this every hour during first day
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n=== HOURLY CHECK: $timestamp ===" -ForegroundColor Green

# 1. Check if bot is running
$botRunning = Get-Process python -ErrorAction SilentlyContinue
if ($botRunning) {
    Write-Host "✅ Bot is running (PID: $($botRunning.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ Bot is NOT running!" -ForegroundColor Red
}

# 2. Check recent log errors
$errors = Get-Content trading_new.log -Tail 100 | Select-String -Pattern "ERROR|Exception" | Select-Object -Last 5
if ($errors) {
    Write-Host "`n⚠️ Recent Errors Found:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host $_.Line -ForegroundColor Yellow }
} else {
    Write-Host "✅ No recent errors" -ForegroundColor Green
}

# 3. Check accumulation warnings
$accumWarnings = Get-Content trading_new.log -Tail 100 | Select-String -Pattern "Max accumulation reached" | Select-Object -Last 3
if ($accumWarnings) {
    Write-Host "`n⚠️ Accumulation Warnings:" -ForegroundColor Yellow
    $accumWarnings | ForEach-Object { Write-Host $_.Line -ForegroundColor Yellow }
}

# 4. Show last trade
$lastTrade = Get-Content trading_new.log -Tail 100 | Select-String -Pattern "RSI.*signal|Range.*signal" | Select-Object -Last 1
if ($lastTrade) {
    Write-Host "`nLast Trade Signal:" -ForegroundColor Cyan
    Write-Host $lastTrade.Line -ForegroundColor Cyan
}
```

---

## 📞 Alert Conditions

### Immediate Action Required If

1. **Bot stops running** (Check `Get-Process python`)
2. **Repeated Python exceptions** (Check log for ERROR/Exception)
3. **WebSocket disconnected for > 5 minutes** (Check log for "disconnected")
4. **Accumulation sync fails repeatedly** (Check log for failed sync messages)

### Investigation Needed If

1. **All trades rejected** for accumulation reasons
2. **Sync operations every evaluation** (indicates tracking drift)
3. **Unexpected accumulation values** (doesn't match positions)
4. **Circuit breaker triggered** (Check circuit_breaker.log)

---

## 🔧 Quick Fixes

### If Accumulation Tracking Seems Off

```python
# Manual recalculation
python -c "
import sqlite3
conn = sqlite3.connect('trading.db')
cursor = conn.cursor()
cursor.execute('SELECT SUM(volume) FROM positions WHERE pair=\"XLM/USD\" AND status=\"open\"')
actual_xlm = cursor.fetchone()[0] or 0
print(f'Actual XLM in positions: {actual_xlm:.2f}')
conn.close()
# Compare this to log messages showing accumulated XLM
"
```

### If Bot Needs Restart

```powershell
# Graceful stop
# Press Ctrl+C in the terminal window

# Force stop if needed
Stop-Process -Name python -Force

# Wait 5 seconds
Start-Sleep -Seconds 5

# Restart
cd C:\dev\projects\crypto-enhanced
.\.venv\Scripts\activate
python start_live_trading.py
```

---

## 📊 End-of-Day Summary

```powershell
# Run at end of trading day
$today = Get-Date -Format "yyyy-MM-dd"
python -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('trading.db')
cursor = conn.cursor()

print(f'=== DAILY SUMMARY: $today ===\n')

# Trade count
cursor.execute('SELECT COUNT(*), SUM(CASE WHEN side=\"buy\" THEN 1 ELSE 0 END) as buys, SUM(CASE WHEN side=\"sell\" THEN 1 ELSE 0 END) as sells FROM trades WHERE DATE(timestamp) = ?', ('$today',))
total, buys, sells = cursor.fetchone()
print(f'Total Trades: {total}')
print(f'  Buys: {buys}')
print(f'  Sells: {sells}')

# Volume
cursor.execute('SELECT SUM(volume) FROM trades WHERE DATE(timestamp) = ?', ('$today',))
volume = cursor.fetchone()[0] or 0
print(f'\nTotal Volume: {volume:.2f} XLM')

# Current open positions
cursor.execute('SELECT COUNT(*), SUM(volume) FROM positions WHERE status=\"open\"')
open_count, open_volume = cursor.fetchone()
print(f'\nOpen Positions: {open_count}')
print(f'Open Volume: {open_volume:.2f} XLM' if open_volume else 'Open Volume: 0 XLM')

# Max accumulation reached
cursor.execute('SELECT timestamp FROM trades WHERE DATE(timestamp) = ? ORDER BY timestamp DESC LIMIT 1', ('$today',))
last_trade = cursor.fetchone()
if last_trade:
    print(f'\nLast Trade: {last_trade[0]}')

conn.close()
"

# Check for warnings in logs
$warnings = Get-Content trading_new.log | Select-String -Pattern "WARNING.*accumulation|Max accumulation" | Measure-Object
Write-Host "`nAccumulation Warnings Today: $($warnings.Count)"

$adjustments = Get-Content trading_new.log | Select-String -Pattern "Adjusted position size" | Measure-Object
Write-Host "Position Size Adjustments: $($adjustments.Count)"
```

---

## 🎯 Performance Targets

### Optimization Goals

- **Accumulation Limit Respected**: 100% compliance
- **Sync Frequency**: < 1 per hour (drift tolerance)
- **Position Size Adjustments**: < 20% of trades
- **Trade Rejections Due to Limits**: < 10% of signals
- **Tracking Accuracy**: Within 0.1 XLM of actual positions

### If Not Meeting Targets

1. Review sync logic in strategies.py
2. Check for manual interventions affecting positions
3. Verify database consistency
4. Check circuit breaker interactions
5. Review accumulation calculation logic

---

**Last Updated**: October 9, 2025  
**Status**: Active Monitoring Guide
