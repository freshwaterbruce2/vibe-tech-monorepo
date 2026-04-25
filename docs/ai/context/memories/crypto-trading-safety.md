# Crypto Trading System Safety (CRITICAL)

Last Updated: 2026-01-06

## CRITICAL WARNING

This system trades with REAL MONEY

## Current Status

- Account Balance: ~$135 USD
- Trading Pair: XLM/USD ONLY
- System: OPERATIONAL WITH MONITORING
- Location: apps/crypto-enhanced/

## Safety Rules (MANDATORY)

1. **Agents are observation-only**
   - Do not start live trading, place orders, or bypass confirmations.
   - Use read-only status, logs, and database checks for diagnostics.
   - A human operator must handle any live buy, sell, or trade action outside agent automation.

2. **Risk Parameters (DO NOT MODIFY WITHOUT APPROVAL)**
   - MAX_POSITION_SIZE: $10.00 (max per trade)
   - MAX_TOTAL_EXPOSURE: $10.00 (only 1 position at a time)
   - STOP_LOSS_PERCENT: 2.0% (2% stop loss)
   - TAKE_PROFIT_PERCENT: 3.0% (3% take profit)
   - MIN_ACCOUNT_BALANCE: $50.00 (don't trade below)

3. **Pre-commit Safety Check**
   Blocks commits if:
   - More than 5 failed orders in last 24 hours
   - More than 10 errors in last 100 log lines
   - Missing critical files (config.py, nonce_state_primary.json)

4. **Circuit Breaker**
   - Stops trading after 5 consecutive failures
   - Resets after 1 hour timeout
   - Prevents continuous fee drain

## Critical Files

- apps/crypto-enhanced/config.py - Risk parameters
- Resolve the runtime database from `apps/crypto-enhanced\.env` / `DB_PATH`
  before querying. On this machine it has pointed at
  `D:\databases\crypto-enhanced\trading.db`.
- D:\logs\trading.log - System logs
- apps/crypto-enhanced/nonce_state_primary.json - API sync

## Database Location

Resolve the runtime database from `apps/crypto-enhanced\.env` / `DB_PATH`
before querying. On this machine it has pointed at
`D:\databases\crypto-enhanced\trading.db`. Never store trading databases under
`C:\dev`.

Example:

```python
DB_PATH = Path(os.getenv('DB_PATH') or os.getenv('DATABASE_PATH') or r'D:\databases\crypto-enhanced\trading.db')
```

## Common Commands

```bash
python kraken_status.py             # Read-only Kraken account status
python scripts/check_status.py      # Daily dashboard
python scripts/performance_monitor.py monthly  # 30-day validation
docker-compose logs -f              # Follow logs (Docker)
```

## 30-Day Monitoring

Before scaling capital, MUST meet ALL 4:

1. Minimum 50 complete trades
2. Win rate ≥52%
3. Positive expectancy >$0.01 per trade
4. Max drawdown <30%

Timeline: Started Oct 13, 2025 → Complete Nov 12, 2025
NO CAPITAL SCALING until "READY TO SCALE"

## Error Handling

- Use simple error classes (NOT enums)
- Log all errors to D:\logs\trading.log
- Circuit breaker stops trading on repeated failures
- Never bypass safety checks

## API Integration

- Nanosecond nonce: `int(time.time() * 1000000000)`
- WebSocket V2 for real-time data
- Token-based authentication
- Automatic reconnection

## NEVER DO THIS

- ❌ Skip YES confirmation
- ❌ Bypass pre-commit hooks
- ❌ Modify risk parameters without approval
- ❌ Ignore failed orders
- ❌ Store database in C:\dev
- ❌ Hardcode API credentials

## Reference

See: .claude/rules/project-specific/crypto-trading.md (complete guide)
