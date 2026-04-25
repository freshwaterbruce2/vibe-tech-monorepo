# Quick Reference Guide - Crypto Trading Bot

**Location:** `C:\dev\apps\crypto-enhanced`

Agent workflows are observation-only for live trading. Use status and
validation commands; a human operator must handle live start or restart.

---

## 📋 Daily Startup Checklist

### 1. Pre-Flight Validation (MANDATORY)

```powershell
# Navigate to project
cd C:\dev\apps\crypto-enhanced

# Activate virtual environment
.\.venv\Scripts\activate

# Run validation (takes ~30 seconds)
python scripts\startup_validator.py

# Quick validation (takes ~5 seconds, skips network tests)
python scripts\startup_validator.py --quick
```

**Expected Result:** `✓ ALL CHECKS PASSED` or `⚠ PASSED WITH WARNINGS`

---

### 2. Runtime Status

```powershell
# Read-only status checks
python kraken_status.py
python scripts\check_status.py
python scripts\performance_monitor.py monthly
```

---

## 🔍 Troubleshooting Common Issues

### Issue: Port 8001 Already in Use

```powershell
# Find what's using the port
Get-NetTCPConnection -LocalPort 8001 | Select-Object LocalAddress, LocalPort, State, OwningProcess

# Kill the process (replace <PID> with actual Process ID)
taskkill /PID <PID> /F
```

---

### Issue: Multiple Instances Running

```powershell
# Check for running Python processes
Get-Process python | Select-Object Id, ProcessName, StartTime

# Kill specific process
taskkill /PID <PID> /F

# Kill all Python processes (CAREFUL!)
Get-Process python | Stop-Process -Force
```

---

### Issue: WebSocket Connection Failed

1. **Check internet connection:**

```powershell
Test-Connection -ComputerName api.kraken.com -Count 4
```

1. **Check API credentials:**

```powershell
Test-Path .\.env
```

1. **Rate limits:** Wait 60 seconds and try again

---

## 🛠️ Maintenance Commands

### View Logs

```powershell
# View recent logs (last 50 lines)
Get-Content .\trading_new.log -Tail 50

# Follow logs in real-time
Get-Content .\trading_new.log -Wait
```

---

## 📊 Performance Monitoring (New: 2025-10-13)

### Quick Daily Dashboard

```powershell
python kraken_status.py
python scripts\check_status.py
```

Shows:

- Live balance (USD + XLM)
- Open positions and orders
- Trades today and errors (24h)
- 7-day performance summary
- 30-day scaling readiness

### Detailed Performance Reports

```powershell
# Last 24 hours
python scripts\performance_monitor.py daily

# Last 7 days
python scripts\performance_monitor.py weekly

# Last 30 days (validation report)
python scripts\performance_monitor.py monthly

# Save daily snapshot (JSON)
python scripts\performance_monitor.py snapshot
```

### Setup Automated Monitoring (One-Time)

```powershell
.\setup_monitoring.ps1
```

Creates Windows Task Scheduler job for daily snapshots at 11:59 PM.

### Capital Scaling Readiness Criteria

System must meet all 4 criteria before adding capital:

- ✅ Minimum 50 complete trades
- ✅ Win rate ≥52%
- ✅ Positive expectancy >$0.01 per trade
- ✅ Max drawdown <30%

**Validation Period**: 30 days (Started: 2025-10-13, Complete: 2025-11-12)

---

## 🚨 Emergency Procedures

### Emergency Stop (Immediate)

```powershell
# Kill all Python processes
Get-Process python | Stop-Process -Force
```

---

## 📞 Quick Commands Reference

```powershell
# Navigate to project
cd C:\dev\apps\crypto-enhanced

# Activate environment
.\.venv\Scripts\activate

# Run pre-flight checks
python scripts\startup_validator.py --quick

# Human operator only: live start command intentionally omitted

# View logs in real-time
Get-Content trading_new.log -Wait

# Check performance (daily dashboard)
python scripts\check_status.py

# Weekly performance review
python scripts\performance_monitor.py weekly

# Emergency stop
Get-Process python | Stop-Process -Force
```

---

**Last Updated:** October 13, 2025
**System Version:** Live Trading (XLM/USD) with 30-Day Monitoring
**Current Balance:** $135.34 ($126.74 USD + 24.57 XLM)
**Monitoring Status:** Day 1 of 30 (Validation Period)
