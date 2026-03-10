---
name: crypto-enhanced-skill
description: Crypto trading system development skill - Python async, exchange APIs, risk management, backtesting
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Crypto Enhanced Trading System Skill

> **CRITICAL SYSTEM** - Production trading with real money. Zero tolerance for bugs.

## Project Context

| Aspect | Details |
|--------|---------|
| **Location** | `C:\dev\apps\crypto-enhanced` |
| **Language** | Python 3.11+ with asyncio |
| **Exchanges** | Binance, Kraken, Coinbase |
| **Database** | SQLite at `D:\databases\crypto_enhanced.db` |
| **Logs** | `D:\logs\crypto\` |
| **Config** | Environment-based, NO hardcoded secrets |

## Tech Stack

- **Async Framework**: asyncio, aiohttp
- **Exchange Libraries**: ccxt, python-binance
- **Data Analysis**: pandas, numpy
- **Risk Management**: Custom position sizing, stop-loss
- **Backtesting**: Custom framework with historical data

## Required Community Skills

When working on this project, automatically invoke:

| Skill | Use Case |
|-------|----------|
| `systematic-debugging` | ANY bug or unexpected behavior |
| `test-driven-development` | ALL new features |
| `verification-before-completion` | Before ANY commit |
| `python-patterns` | Python best practices |
| `clean-code` | Code quality |

## Development Workflow

### Before ANY Code Change

```bash
# 1. Check trading status (ensure no active positions at risk)
python -c "from src.exchange import get_open_positions; print(get_open_positions())"

# 2. Run tests
python -m pytest tests/ -v --tb=short

# 3. Type check
python -m mypy src/ --ignore-missing-imports
```

### After Code Changes

```bash
# 1. Run full test suite
python -m pytest tests/ -v --cov=src --cov-report=term-missing

# 2. Lint check
python -m ruff check src/

# 3. Backtest if strategy changed
python -m backtester --strategy=<name> --period=30d
```

## Critical Rules

### 🔴 NEVER Do

- [ ] Deploy without full test pass
- [ ] Modify position sizing without backtest
- [ ] Change exchange API calls without sandbox test
- [ ] Commit secrets or API keys
- [ ] Ignore error handling in async code

### ✅ ALWAYS Do

- [ ] Use try/except for ALL exchange API calls
- [ ] Log every trade decision with reasoning
- [ ] Test with paper trading before live
- [ ] Validate position sizes against risk limits
- [ ] Use type hints for all functions

## Quality Checklist

Before completing ANY task:

- [ ] Tests pass: `pytest tests/ -v`
- [ ] Types valid: `mypy src/`
- [ ] Lint clean: `ruff check src/`
- [ ] No hardcoded values
- [ ] Error handling complete
- [ ] Logging added for debugging
- [ ] Backtest run if strategy-related

## Common Patterns

### Exchange API Call Pattern

```python
async def safe_exchange_call(self, method: str, *args, **kwargs) -> Optional[dict]:
    """Always wrap exchange calls with retry and error handling."""
    for attempt in range(3):
        try:
            result = await getattr(self.exchange, method)(*args, **kwargs)
            return result
        except ccxt.NetworkError as e:
            logger.warning(f"Network error attempt {attempt + 1}: {e}")
            await asyncio.sleep(2 ** attempt)
        except ccxt.ExchangeError as e:
            logger.error(f"Exchange error: {e}")
            raise
    return None
```

### Risk Management Pattern

```python
def calculate_position_size(
    account_balance: float,
    risk_percent: float,
    entry_price: float,
    stop_loss_price: float
) -> float:
    """Position sizing based on risk percentage."""
    risk_amount = account_balance * (risk_percent / 100)
    price_diff = abs(entry_price - stop_loss_price)
    if price_diff == 0:
        return 0
    return risk_amount / price_diff
```

## Related Commands

- `/crypto:status` - Check trading system status
- `/crypto:restart` - Safely restart trading system
- `/crypto:performance` - Check 30-day performance
- `/crypto:position-check` - Analyze current positions
