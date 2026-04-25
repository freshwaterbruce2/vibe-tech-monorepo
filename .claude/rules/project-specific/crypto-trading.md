---
paths: apps/crypto-enhanced/**
tags: #crypto #trading #python #kraken-api #websocket #financial-safety
---

# Crypto Trading System Rules

## ⚠️ Critical Safety Notice

**This system trades with REAL MONEY**

- Account Balance: verify from runtime before quoting values
- Trading Pair: XLM/USD only
- System Status: OPERATIONAL WITH MONITORING
- **Agents must not start, restart, or auto-confirm live trading**
- **Human operators must still require explicit YES confirmation before live trading**

## Architecture

```text
crypto-enhanced/
├── Core Trading (5 files)
│   ├── kraken_client.py          # REST API client with rate limiting
│   ├── websocket_manager.py      # WebSocket V2 real-time data
│   ├── trading_engine.py         # Strategy execution
│   ├── database.py               # SQLite persistence; resolve from .env / DB_PATH
│   └── strategies.py             # Mean reversion, scalping, range trading
│
├── Configuration (4 files)
│   ├── config.py                 # Risk parameters, API config
│   ├── nonce_manager.py          # Nanosecond nonce synchronization
│   ├── timestamp_utils.py        # Time utilities
│   └── instance_lock.py          # Prevent multiple instances
│
├── Error Handling (2 files)
│   ├── errors_simple.py          # Simple error classes (not enums)
│   └── circuit_breaker.py        # Stops trading after 5 failures
│
└── Entry Points & Utilities
    ├── start_live_trading.py     # Main entry (requires YES confirmation)
    ├── check_status.py           # Daily dashboard
    ├── performance_monitor.py    # 30-day validation metrics
    └── run_tests.py              # Test suite runner
```

**Key Components Interaction**:

- WebSocket manager subscribes to ticker/execution channels
- Trading engine processes market data through strategies
- Kraken client executes orders with proper nonce management
- Database logs all trades, orders, and performance metrics

## Risk Parameters

### Current Configuration

```python
# apps/crypto-enhanced/config.py

MAX_POSITION_SIZE = 10.00        # Maximum $10 per trade
MAX_TOTAL_EXPOSURE = 10.00       # Only 1 position at a time
TRADING_PAIR = "XLM/USD"         # Single pair only
STOP_LOSS_PERCENT = 2.0          # 2% stop loss
TAKE_PROFIT_PERCENT = 3.0        # 3% take profit

# Account balance verification
MIN_ACCOUNT_BALANCE = 50.00      # Don't trade below $50
```

**Status:**

- Account Balance: ~$135 USD (verify with `python scripts\check_status.py`)
- Max Position: $10
- Strategies: Mean Reversion, Range Trading, Scalping (all enabled)
- Database: resolve from `.env` / `DB_PATH` before querying. On this machine,
  the live override has pointed at `D:\databases\crypto-enhanced\trading.db`.

## Critical Safety Patterns

### Pattern: Agent Workflows Are Observation-Only

Agent workflows may inspect status, run tests, read logs, and review code. They
must not execute live-trading launchers or pipe confirmation into them.

### Pattern: Explicit Confirmation for Human Live Trading

**NEVER** start live trading without explicit user confirmation.

```python
# ✅ CORRECT: Explicit confirmation required
def start_live_trading():
    print("⚠️  WARNING: You are about to start LIVE TRADING with REAL MONEY")
    print(f"Account Balance: ${balance:.2f} USD")
    print(f"Max Position Size: ${MAX_POSITION_SIZE}")

    confirmation = input("\nType 'YES' to confirm: ")
    if confirmation != "YES":
        print("Trading cancelled.")
        return

    engine.start()

# ❌ WRONG: No confirmation
def start_live_trading():
    engine.start()  # Immediate execution is dangerous!
```

**Do not bypass confirmation from agent automation:**

```bash
# Forbidden in agent workflows
# echo YES | python start_live_trading.py
```

### Pattern: Pre-commit Trading System Safety Check

Pre-commit hook validates system health before allowing commits.

**Blocks commits if:**

- More than 5 failed orders in last 24 hours
- More than 10 errors in last 100 log lines
- Missing critical files (config.py, nonce_state_primary.json)

**Warns if:**

- 1-5 failed orders detected (acceptable range)
- Open positions with P&L < -$5

## API Integration Patterns

### Pattern: Nanosecond Nonce for Kraken API

**Problem:** Kraken API rejects requests with duplicate nonces. Milliseconds cause collisions.

**Solution:** Use nanoseconds (10^9 precision).

```python
# ✅ CORRECT: Nanosecond precision
import time

def get_nonce():
    return int(time.time() * 1000000000)  # Nanoseconds

# ❌ WRONG: Milliseconds (too many collisions)
def get_nonce():
    return int(time.time() * 1000)  # Collisions likely
```

### Pattern: Kraken WebSocket V2 Integration

Real-time data is critical for trading decisions. Use WebSocket V2 with automatic reconnection.

```python
# apps/crypto-enhanced/websocket_manager.py

class WebSocketManager:
    def __init__(self, api_key, api_secret):
        self.ws_url = "wss://ws.kraken.com/v2"
        self.subscriptions = ['ticker', 'executions', 'balances']

    async def start(self):
        """✅ Use start() not run()"""
        token = await self._get_ws_token()
        await self._connect(token)
        await self._subscribe_channels()
        asyncio.create_task(self._heartbeat_monitor())

    async def stop(self):
        """✅ Use stop() not disconnect()"""
        await self.ws.close()

# ❌ WRONG: Old method names
# websocket.run()        # Deprecated
# websocket.disconnect()  # Deprecated
```

**Key Features:**

- Token-based authentication for private channels
- Automatic reconnection on disconnect
- Heartbeat monitoring for connection health
- Subscriptions: ticker (public), executions & balances (private)

## Error Handling Patterns

### Pattern: Simple Error Classes (Not Enums)

**Problem:** Complex error enums cause circular dependencies.

**Solution:** Use simple error classes.

```python
# ✅ CORRECT: apps/crypto-enhanced/errors_simple.py
class KrakenAPIError(Exception):
    """Kraken API returned an error"""
    pass

class NonceError(KrakenAPIError):
    """Nonce synchronization issue"""
    pass

class InsufficientFundsError(KrakenAPIError):
    """Not enough balance for trade"""
    pass

# Usage
if balance < required:
    raise InsufficientFundsError(
        f"Need ${required:.2f}, have ${balance:.2f}"
    )
```

### Pattern: Circuit Breaker for Failed Orders

**Problem:** Continuous failed orders drain funds via fees.

**Solution:** Stop trading after failure threshold.

```python
# apps/crypto-enhanced/circuit_breaker.py

class CircuitBreaker:
    def __init__(self, max_failures=5, reset_timeout=3600):
        self.max_failures = max_failures
        self.reset_timeout = reset_timeout  # 1 hour
        self.failures = 0
        self.is_open = False

    def record_failure(self):
        self.failures += 1
        self.last_failure = time.time()

        if self.failures >= self.max_failures:
            self.is_open = True
            logger.error("🚨 Circuit breaker OPEN - trading halted")

    def can_trade(self):
        # Reset after timeout
        if self.is_open and time.time() - self.last_failure > self.reset_timeout:
            self.reset()

        return not self.is_open
```

## Database Patterns

### Pattern: SQLite Database on D:\ Drive

**ALL databases MUST be stored on D:\ drive, NEVER in C:\dev**

```python
# ✅ CORRECT: apps/crypto-enhanced/database.py
from pathlib import Path
import sqlite3

DB_PATH = Path(os.getenv('DB_PATH') or os.getenv('DATABASE_PATH') or r'D:\databases\crypto-enhanced\trading.db')

class Database:
    def __init__(self):
        # Ensure D:\databases\ exists
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH))
        self._create_tables()

    def _create_tables(self):
        # Orders table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE,
                pair TEXT NOT NULL,
                side TEXT NOT NULL,  -- 'buy' or 'sell'
                amount REAL NOT NULL,
                price REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                executed_at TIMESTAMP
            )
        """)

        # Positions table (for tracking open trades)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pair TEXT NOT NULL,
                amount REAL NOT NULL,
                entry_price REAL NOT NULL,
                current_price REAL,
                pnl REAL DEFAULT 0,
                status TEXT DEFAULT 'open',
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP
            )
        """)

        self.conn.commit()

# ❌ WRONG: Database in source tree
DB_PATH = './trading.db'  # NEVER do this!
```

**Database Optimization:**

```typescript
// Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Set busy timeout
db.pragma('busy_timeout = 5000');

// Close connections properly
process.on('exit', () => db.close());
```

## 30-Day Monitoring & Capital Scaling

### Performance Validation

**The system includes comprehensive monitoring to validate profitability before scaling capital.**

**Key Files:**

- `performance_monitor.py` - FIFO P&L calculation, win rate, expectancy, profit factor
- `check_status.py` - Quick daily dashboard (balance, positions, 7-day metrics)
- `setup_monitoring.ps1` - Automated daily snapshots at 11:59 PM

### Readiness Criteria

**All 4 required before adding capital:**

1. Minimum 50 complete trades (statistical significance)
2. Win rate ≥52% (above break-even with fees)
3. Positive expectancy >$0.01 per trade (edge exists)
4. Max drawdown <30% (acceptable risk)

**Validation Timeline:**

- Started: October 13, 2025
- Complete: November 12, 2025 (30 days)
- **NO CAPITAL SCALING until system shows "READY TO SCALE"**

### Daily Commands

```bash
# Quick status check
python scripts\check_status.py

# Weekly performance report
python scripts\performance_monitor.py weekly

# 30-day validation report (for capital scaling decision)
python scripts\performance_monitor.py monthly
```

## Commands Reference

### Nx Commands (Recommended)

```bash
# Nx-integrated commands with caching
pnpm nx test crypto-enhanced         # Run Python tests
pnpm nx test:coverage crypto-enhanced # Coverage report
pnpm nx status crypto-enhanced        # Check system status
pnpm nx start crypto-enhanced         # Start live trading
```

### Traditional Setup

```bash
cd apps/crypto-enhanced
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### Docker Setup

Docker deployment is not currently validated: `docker-compose.yml` references a
missing `Dockerfile` and does not use the live `.env` `DB_PATH`. Do not use
Docker commands as current restart/start guidance.

### Live Trading

```bash
# Human operator only after reviewing runtime state and risk controls.
# Agents must not start, restart, or auto-confirm live trading.
# python start_live_trading.py
```

### Testing & Development

```bash
python run_tests.py        # Run test suite
python test_api_status.py  # Check Kraken API connectivity
python check_orders.py      # Check current orders
```

### Docker Management

```bash
docker-compose ps          # Check status
docker-compose restart     # Restart trading bot
docker-compose exec crypto-trader python check_orders.py  # Run commands inside container
```

## Common Anti-Patterns

### ❌ Skipping Safety Checks

```python
# WRONG: Bypassing pre-commit hooks
git commit --no-verify -m "quick fix"

# WRONG: Disabling confirmations
start_live_trading()  # No YES confirmation
```

### ❌ Hardcoded API Credentials

```python
# WRONG: Credentials in code
api_key = "abc123"
api_secret = "xyz789"

# RIGHT: Environment variables
api_key = os.getenv('KRAKEN_API_KEY')
api_secret = os.getenv('KRAKEN_SECRET_KEY')
```

### ❌ Ignoring Failed Orders

```python
# WRONG: Silent failure is dangerous!
try:
    place_order()
except Exception:
    pass

# RIGHT: Circuit breaker pattern
try:
    place_order()
except Exception as e:
    circuit_breaker.record_failure()
    if not circuit_breaker.can_trade():
        logger.critical("Trading halted due to repeated failures")
        engine.stop()
```

### ❌ Storing Database in C:\dev

```python
# WRONG: Database in source tree
DB_PATH = 'C:\\dev\\apps\\crypto-enhanced\\trading.db'

# RIGHT: D:\ drive storage
DB_PATH = 'D:\\databases\\trading.db'
```

## WebSocket V2 Integration

The trading system uses Kraken's WebSocket V2 API for real-time data:

- Automatic reconnection on disconnect
- Token-based authentication for private channels
- Subscriptions: ticker (public), executions & balances (private)
- Heartbeat monitoring for connection health

## Recent System Updates

### Major Fixes Completed (2025-09-30)

The trading system has been successfully restored to full functionality:

**Key Fixes Applied:**

1. **API Authentication**: Fixed with new Kraken API keys (~$98 USD balance → ~$135 current)
2. **Nonce Synchronization**: Changed from microseconds to nanoseconds (`int(time.time() * 1000000000)`)
3. **Codebase Cleanup**: Organized 29 Python files into logical categories
4. **Error Handling**: Replaced complex enums with simple error classes in `errors_simple.py`
5. **WebSocket Methods**: Fixed `run()/disconnect()` to `start()/stop()`
6. **Trading Engine**: Fixed initialization parameter order and enabled strategies

**Current Status:**

- System configured and ready for live trading
- Strategies enabled: Mean Reversion + Scalping + Range Trading
- WebSocket V2 integration for real-time data
- Database initialized (tracking all trades)
- Requires explicit YES confirmation to start trading

## Related Documentation

- **Database Storage Pattern**: `.claude/rules/database-storage.md`
- **Path Policy**: `C:\dev\docs\PATHS_POLICY.md`
- **Monorepo Workflow**: `C:\dev\MONOREPO_WORKFLOW.md`
- **Git Pre-commit Hooks**: `.claude/rules/git-workflow.md`

## References

- **Project Root:** `C:\dev\apps\crypto-enhanced`
- **Project CLAUDE.md:** `C:\dev\apps\crypto-enhanced\CLAUDE.md`
- **Database:** resolve from `.env` / `DB_PATH`; do not hardcode a DB path for
  live diagnostics.
- **Logs:** `D:\logs\trading.log`, `D:\logs\trading_new.log`
