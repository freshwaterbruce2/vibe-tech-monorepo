# GEMINI.md - Crypto Enhanced Trading

## Project Type
Python automated cryptocurrency trading system

## Location
`C:\dev\apps\crypto-enhanced\`

## Tech Stack
- **Language**: Python 3.11+
- **Framework**: asyncio + ccxt
- **Database**: SQLite at `D:\databases\crypto_enhanced.db`
- **APIs**: Binance, Kraken via ccxt

## Key Commands
```bash
# In project directory
python -m pytest tests/           # Run tests
python src/main.py               # Start trading
python src/backtest.py           # Run backtests
```

## Architecture
```
src/
├── strategies/      # Trading strategies
├── exchanges/       # Exchange adapters (ccxt)
├── risk/           # Risk management
├── signals/        # Signal generation
└── utils/          # Helpers
```

## Critical Patterns

### Async Exchange Operations
```python
async def execute_trade(symbol: str, side: str, amount: float):
    async with exchange_lock:
        order = await exchange.create_order(symbol, 'limit', side, amount, price)
        return order
```

### Risk Management
- Position sizing: Kelly criterion
- Max drawdown: 15%
- Stop-loss: Always required

## Database Schema
- `trades` - Trade history
- `positions` - Current positions
- `signals` - Signal log
- `performance` - Daily metrics

## Quality Checklist
- [ ] pytest passes
- [ ] Type hints complete
- [ ] Risk limits enforced
- [ ] Async patterns correct
- [ ] No hardcoded credentials

## Related Skills
- Python async patterns
- Database operations (SQLite)
- Testing patterns (pytest)
- Performance profiling
