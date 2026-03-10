# Crypto-Enhanced - Project Context

**Type**: Python Trading System (AsyncIO + Kraken API)
**Agent**: crypto-expert
**Status**: Production (30-day monitoring active)
**Token Count**: ~700 tokens

---

## Overview

Live cryptocurrency trading system with WebSocket V2 integration and financial safety checks.

**Key Features**:

- Real-time trading (XLM/USD on Kraken)
- WebSocket V2 data feed (ticker, executions, balances)
- Multiple strategies (mean reversion, range trading, scalping)
- Circuit breaker pattern for fault tolerance
- 30-day monitoring before capital scaling
- Financial safety pre-commit hooks

---

## Tech Stack

**Language**: Python 3.11+
**API**: Kraken REST API + WebSocket V2
**Framework**: AsyncIO (asynchronous trading loop)
**Database**: SQLite (`D:\databases\trading.db`)
**Logs**: `D:\logs\trading.log`, `D:\logs\trading_new.log`
**Monitoring**: performance_monitor.py, check_status.py
**Testing**: pytest, pytest-asyncio, pytest-cov

---

## Directory Structure

```
apps/crypto-enhanced/
├── kraken_client.py       # REST API client with rate limiting
├── websocket_manager.py   # WebSocket V2 real-time data
├── trading_engine.py      # Strategy execution
├── strategies.py          # Trading strategies (mean reversion, scalping)
├── database.py            # SQLite persistence
├── config.py              # Trading configuration
├── nonce_manager.py       # Nanosecond nonce synchronization
├── circuit_breaker.py     # Fault tolerance
├── errors_simple.py       # Error handling
├── start_live_trading.py  # Main entry point (requires YES confirmation)
├── performance_monitor.py # 30-day P&L tracking
├── check_status.py        # Daily health dashboard
└── tests/                 # pytest test suite
```

---

## Critical Financial Safety Rules

### 1. NEVER start trading without explicit YES confirmation

```python
# start_live_trading.py
confirmation = input("Start live trading? (type YES): ")
if confirmation != "YES":
    sys.exit(1)
```

### 2. ALWAYS use nanosecond nonces (NOT milliseconds)

```python
# CORRECT - Nanoseconds
nonce = int(time.time() * 1000000000)

# WRONG - Milliseconds (causes "Invalid nonce" errors)
nonce = int(time.time() * 1000)
```

### 3. ALWAYS stop after 5 consecutive failures

```python
if consecutive_failures >= 5:
    logger.critical("5 consecutive failures, stopping trading")
    await trading_engine.shutdown()
```

### 4. NEVER commit when system unhealthy

```powershell
# Pre-commit hook checks:
# - Failed orders in last 24 hours (blocks if >5)
# - Errors in last 100 log lines (blocks if >10)
# - Open positions with P&L < -$5 (warns)
```

### 5. ALWAYS store data on D:\ drive

```python
# CORRECT
DB_PATH = r"D:\databases\trading.db"
LOG_PATH = r"D:\logs\trading.log"

# WRONG (relative paths in C:\dev)
DB_PATH = "trading.db"
```

---

## Common Workflows

### 1. Start Live Trading

```bash
# RECOMMENDED: Docker deployment
cd apps/crypto-enhanced
docker-compose up -d

# OR: Direct Python (requires manual YES)
python start_live_trading.py

# OR: Auto-confirm for automation
echo YES | python start_live_trading.py
```

### 2. Check System Status

```bash
# Quick dashboard
python check_status.py

# Detailed 30-day report
python performance_monitor.py monthly

# Check orders and positions
python check_orders.py
```

### 3. Run Tests

```bash
# Full test suite
python run_tests.py

# With coverage
pytest --cov=. --cov-report=html

# Via Nx (with caching)
pnpm nx test crypto-enhanced
```

---

## Database Schema

**Path**: `D:\databases\trading.db`

**Tables**:

- `orders` - All order history (buy/sell)
- `positions` - Current open positions
- `executions` - Trade executions
- `balances` - Account balance snapshots
- `performance` - Daily P&L metrics

---

## WebSocket V2 Integration

```python
# websocket_manager.py
import asyncio
import websockets

class WebSocketManager:
    async def start(self):
        async with websockets.connect(self.ws_url) as ws:
            # Subscribe to ticker (public)
            await ws.send(json.dumps({
                "method": "subscribe",
                "params": {"channel": "ticker", "symbol": ["XLM/USD"]}
            }))

            # Subscribe to executions (private, requires token)
            await ws.send(json.dumps({
                "method": "subscribe",
                "params": {"channel": "executions", "token": self.token}
            }))

            async for message in ws:
                await self.handle_message(message)
```

---

## 30-Day Monitoring & Capital Scaling

**Readiness Criteria** (ALL 4 required before scaling capital):

1. ✅ Minimum 50 complete trades (statistical significance)
2. ✅ Win rate ≥52% (above break-even with fees)
3. ✅ Positive expectancy >$0.01 per trade (edge exists)
4. ✅ Max drawdown <30% (acceptable risk)

**Current Status**: Monitoring started Oct 13, 2025 (ends Nov 12, 2025)

```bash
# Check readiness daily
python performance_monitor.py weekly

# Final decision after 30 days
python performance_monitor.py monthly
```

**DO NOT add capital until system shows "READY TO SCALE"**

---

## Common Issues

### Issue: "Invalid nonce" errors

**Solution**: Use nanoseconds, ensure NTP time sync

```python
nonce = int(time.time() * 1000000000)  # Nanoseconds
```

### Issue: WebSocket disconnects

**Solution**: Automatic reconnection with exponential backoff

```python
# websocket_manager.py handles this automatically
await self.reconnect(delay=min(60, 2 ** attempt))
```

### Issue: Database locked

**Solution**: Enable WAL mode

```python
self.conn.execute("PRAGMA journal_mode = WAL")
self.conn.execute("PRAGMA busy_timeout = 5000")
```

---

## Risk Parameters (CURRENT)

```python
# config.py
MAX_POSITION_SIZE_USD = 10       # $10 per trade
MAX_TOTAL_EXPOSURE_USD = 10      # $10 total (1 position max)
TRADING_PAIR = "XLM/USD"         # Only XLM trading
STRATEGIES = ["mean_reversion", "range_trading", "scalping"]
```

**Account Balance**: ~$135 USD (verify daily)

---

## Anti-Duplication Checklist

Before implementing features:

1. Check `strategies.py` for existing trading logic
2. Check `database.py` for schema patterns
3. Check `tests/` for test patterns
4. Query learning DB (29,420 verified executions!):

   ```sql
   SELECT * FROM success_patterns WHERE task_type = 'auto_fix_cycle';
   ```

---

## Integration Points

**Learning System**: 29,420 auto_fix_cycle executions (99.96% success)
**Docker**: Containerized deployment with health checks
**Pre-commit Hooks**: Financial safety validation

---

## Performance Targets

- **Order Latency**: <500ms (REST API)
- **WebSocket Latency**: <100ms (real-time data)
- **Database Query**: <50ms (with WAL mode)
- **Memory Usage**: <100 MB (steady state)
- **Win Rate**: ≥52% (target after 30 days)

---

## Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop trading
docker-compose down
```
