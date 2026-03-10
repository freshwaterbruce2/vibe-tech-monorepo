# Crypto Enhanced Trading Bot - Project Guide

**Project Path:** `C:\dev\apps\crypto-enhanced`  
**Database:** `D:\databases\crypto-enhanced\trading.db`  
**Logs:** `D:\logs\crypto-enhanced`  
**Data:** `D:\data\crypto-enhanced`  
**Type:** Python Trading Bot with ML Optimization  
**Status:** Production - Active Trading

---

## 🎯 Project Overview

Cryptocurrency trading bot with machine learning optimization, real-time WebSocket connections, and learning system integration. Supports multiple trading strategies with circuit breakers and risk management.

### Key Features

- Async/await architecture for high performance
- Real-time WebSocket market data
- Machine learning pattern recognition
- Circuit breaker protection
- Fee optimization
- Learning system integration
- Multiple trading strategies
- Risk management with position limits

---

## 📁 Project Structure

```
crypto-enhanced/
├── src/
│   ├── main.py              # Entry point
│   ├── trading_bot.py       # Core bot logic
│   ├── strategies/          # Trading strategies
│   ├── ml/                  # ML models and training
│   ├── risk/                # Risk management
│   └── utils/               # Utility functions
├── data/                    # Local data cache
├── tests/                   # Test suite
├── scripts/                 # Helper scripts
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Template
├── requirements.txt         # Python dependencies
├── trading_config.example.json
└── README.md
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\crypto-enhanced

# Create virtual environment (if not exists)
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment template
Copy-Item .env.example .env

# Edit with your API keys
code .env
```

### Required Environment Variables

```bash
# .env file
KRAKEN_API_KEY=your_api_key_here
KRAKEN_API_SECRET=your_api_secret_here
TRADING_MODE=test  # or 'live' for real trading
DATABASE_PATH=D:\databases\crypto-enhanced\trading.db
LOG_PATH=D:\logs\crypto-enhanced
```

### Running the Bot

```powershell
# Test mode (paper trading)
python src\main.py --mode test

# Live mode (REAL MONEY - BE CAREFUL!)
python src\main.py --mode live

# With specific strategy
python src\main.py --mode test --strategy momentum

# Dry run (no actual trades)
python src\main.py --mode test --dry-run
```

---

## 🛠️ Development Workflow

### Making Changes

```powershell
# 1. Activate environment
.\.venv\Scripts\Activate.ps1

# 2. Make your changes

# 3. Run tests
pytest tests/

# 4. Test specific functionality
python test_connection_simple.py

# 5. Check trading health
.\check_trading_health.ps1
```

### Testing Strategies

```powershell
# Test strategy without trading
python src\strategies\test_strategy.py --strategy momentum

# Backtest strategy
python scripts\backtest.py --strategy momentum --days 30

# Validate strategy logic
python tests\test_strategy_validation.py
```

---

## 📊 Database Schema

**Location:** `D:\databases\crypto-enhanced\trading.db`

### Key Tables

```sql
-- Trades executed
CREATE TABLE trades (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    pair TEXT,
    side TEXT,  -- 'buy' or 'sell'
    price REAL,
    amount REAL,
    fee REAL,
    strategy TEXT,
    profit_loss REAL
);

-- Market data cache
CREATE TABLE market_data (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    pair TEXT,
    price REAL,
    volume REAL
);

-- Performance metrics
CREATE TABLE performance (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    total_profit REAL,
    win_rate REAL,
    sharpe_ratio REAL
);
```

### Database Operations

```powershell
# Backup database
Copy-Item D:\databases\crypto-enhanced\trading.db D:\backups\crypto-enhanced\trading_$(Get-Date -Format 'yyyyMMdd_HHmmss').db

# Query recent trades
sqlite3 D:\databases\crypto-enhanced\trading.db "SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;"

# Check performance
python scripts\analyze_trades.py
```

---

## 📈 Monitoring & Logs

### Log Files

- **Main Log:** `D:\logs\crypto-enhanced\trading.log`
- **Error Log:** `D:\logs\crypto-enhanced\errors.log`
- **Performance:** `D:\logs\crypto-enhanced\performance.log`

### Real-time Monitoring

```powershell
# Watch live logs
Get-Content D:\logs\crypto-enhanced\trading.log -Wait -Tail 50

# Monitor trading script
.\setup_monitoring.ps1

# Check system health
python src\utils\health_check.py
```

### Performance Analysis

```powershell
# Analyze trades
node analyze_trades.js

# Generate performance report
python scripts\performance_report.py

# View profit/loss
python scripts\show_pnl.py
```

---

## 🎛️ Configuration

### Trading Configuration

**File:** `trading_config.json` (copy from `trading_config.example.json`)

```json
{
  "trading": {
    "max_position_size": 1000,
    "max_daily_loss": 100,
    "pairs": ["XBT/USD", "ETH/USD"],
    "risk_per_trade": 0.02
  },
  "strategies": {
    "momentum": {
      "enabled": true,
      "timeframe": "1h",
      "threshold": 0.02
    }
  },
  "circuit_breaker": {
    "max_consecutive_losses": 3,
    "cooldown_minutes": 30
  }
}
```

### Strategy Selection

Available strategies in `src/strategies/`:

- `momentum.py` - Momentum-based trading
- `mean_reversion.py` - Mean reversion strategy
- `ml_prediction.py` - ML-based predictions
- `arbitrage.py` - Cross-exchange arbitrage

---

## 🧪 Testing

### Run All Tests

```powershell
# Full test suite
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html

# Specific test file
pytest tests\test_trading_bot.py
```

### Connection Tests

```powershell
# Test API connection
python test_connection_simple.py

# Test credentials
python test_credentials.py

# Test WebSocket
python test_websocket.py
```

### Integration Tests

```powershell
# Test learning integration
python test_learning_integration.py

# Test database connection
python tests\test_db_connection.py
```

---

## 🔧 Troubleshooting

### Common Issues

#### API Connection Errors

```powershell
# Verify API keys
python test_env_keys.py

# Test new keys
python test_new_keys.py

# Check nonce issues
python test_nonce_fix.py
```

#### WebSocket Disconnections

```powershell
# Check WebSocket status
python src\utils\check_websocket.py

# Restart with fresh connection
.\stop_trading.ps1
.\launch_trading.ps1
```

#### Database Locked

```powershell
# Check for processes using database
$processes = Get-Process | Where-Object { $_.Modules.FileName -like "*trading.db*" }
$processes | Stop-Process -Force

# Or restart with new database
Rename-Item D:\databases\crypto-enhanced\trading.db trading.db.old
python src\utils\init_database.py
```

#### Circuit Breaker Triggered

```powershell
# Check circuit breaker status
python src\risk\check_circuit_breaker.py

# Reset manually (use with caution!)
python src\risk\reset_circuit_breaker.py

# Review what triggered it
python scripts\analyze_losses.py
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview and setup
- `QUICK_REFERENCE.md` - Command reference
- `USAGE.md` - Detailed usage guide
- `MONITORING_GUIDE.md` - Monitoring and alerts
- `LEARNING_INTEGRATION_GUIDE.md` - Learning system integration

### Session Summaries

- `SESSION_SUMMARY_2025_ASYNC.md` - Async improvements
- `OPTIMIZATION_SUMMARY.md` - Performance optimizations
- `VALIDATION_REPORT.md` - Code validation results

### Architecture Docs

- `INTEGRATION_COMPLETE.md` - Integration status
- `ASYNC_IMPROVEMENTS_2025.md` - Async architecture
- `CIRCUIT_BREAKER_COMPLETE.md` - Circuit breaker implementation

---

## ⚠️ Safety & Risk Management

### Before Going Live

1. ✅ Test thoroughly in test mode
2. ✅ Verify API keys and permissions
3. ✅ Set appropriate position limits
4. ✅ Configure circuit breakers
5. ✅ Enable monitoring and alerts
6. ✅ Back up database
7. ✅ Review trading configuration
8. ✅ Start with small amounts

### Risk Limits

```python
# Recommended starting limits
MAX_POSITION_SIZE = 100  # USD
MAX_DAILY_LOSS = 50      # USD
RISK_PER_TRADE = 0.01    # 1% of capital
```

### Emergency Shutdown

```powershell
# Stop bot immediately
.\stop_trading.ps1

# Or kill process
Get-Process python | Where-Object { $_.CommandLine -like "*trading*" } | Stop-Process -Force

# Check positions
python scripts\check_open_positions.py

# Close all positions (if needed)
python scripts\emergency_close_all.py
```

---

## 🎓 Learning System Integration

The bot integrates with the learning system at `D:\learning-system`.

### What Gets Learned

- Successful trade patterns
- Failed strategy indicators
- Optimal entry/exit points
- Risk management effectiveness
- Market condition recognition

### Accessing Learning Data

```powershell
# View learned patterns
python D:\learning-system\extract_learning_insights.py

# Check trading performance improvements
python scripts\learning_performance.py

# See recommendations
python D:\learning-system\recommendation_engine.py
```

---

## 📊 Performance Metrics

### Key Metrics to Track

- Win rate (target: >55%)
- Profit factor (target: >1.5)
- Sharpe ratio (target: >1.0)
- Maximum drawdown (limit: <20%)
- Average trade duration

### Viewing Metrics

```powershell
# Dashboard
python scripts\performance_dashboard.py

# Generate report
python scripts\monthly_report.py

# Export to CSV
python scripts\export_metrics.py
```

---

## 🔄 Maintenance Tasks

### Daily

```powershell
# Check bot status
.\check_trading_health.ps1

# Review logs
Get-Content D:\logs\crypto-enhanced\trading.log -Tail 100

# Verify positions
python scripts\verify_positions.py
```

### Weekly

```powershell
# Backup database
Copy-Item D:\databases\crypto-enhanced\trading.db D:\backups\crypto-enhanced\

# Performance review
python scripts\weekly_review.py

# Update dependencies
pip list --outdated
```

### Monthly

```powershell
# Full performance analysis
python scripts\monthly_analysis.py

# Review and adjust strategies
python scripts\strategy_optimization.py

# Clean old logs
Remove-Item D:\logs\crypto-enhanced\*.log.old
```

---

**Last Updated:** January 2, 2026  
**Status:** Production - Active  
**Mode:** Test/Live configurable

