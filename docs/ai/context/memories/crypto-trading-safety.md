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

1. **ALWAYS require explicit YES confirmation**
   - Never start live trading without user typing "YES"
   - Use: `python start_live_trading.py` (prompts for YES)
   - Emergency bypass: `echo YES | python start_live_trading.py`

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
- D:\databases\trading.db - Trade history and positions
- D:\logs\trading.log - System logs
- apps/crypto-enhanced/nonce_state_primary.json - API sync

## Database Location

MUST use D:\databases\trading.db (NEVER in C:\dev)

Example:

```python
DB_PATH = Path(os.getenv('DATABASE_PATH', r'D:\databases\trading.db'))
```

## Common Commands

```bash
python check_status.py              # Daily dashboard
python performance_monitor.py       # 30-day validation
python start_live_trading.py        # Start trading (requires YES)
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
