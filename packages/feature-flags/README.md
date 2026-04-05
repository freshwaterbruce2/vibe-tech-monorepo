# Feature Flags System

Self-hosted feature flag system for the monorepo, supporting:

- **Trading Bot** (Python) - with instant kill switches
- **NOVA Agent** (Tauri/React) - desktop app flags
- **DeepCode Editor** (Electron/React) - editor feature toggles
- **Web Apps** (React) - frontend feature gates

## Quick Start

### 1. Install Dependencies

```bash
cd packages/feature-flags
pnpm install
```

### 2. Build All Packages

```bash
pnpm build
```

### 3. Python SDK (Trading Bot)

```bash
cd sdk-python
pip install -e .
```

## Usage

### Trading Bot (Python)

```python
from feature_flags import (
    FeatureFlagClient, 
    ClientConfig, 
    Environment,
    KillSwitchHandler,
)

# Implement your kill switch handler
class TradingKillSwitch(KillSwitchHandler):
    def __init__(self, order_manager):
        self.order_manager = order_manager
    
    async def on_kill_switch_triggered(self, flag_key: str, context: dict):
        if flag_key == "trading.emergency_stop":
            await self.order_manager.cancel_all()
            logger.critical("EMERGENCY STOP!")

# Initialize
config = ClientConfig(
    server_url="http://localhost:3100",
    environment=Environment.PROD,
    enable_websocket=True,
)

client = FeatureFlagClient(config, kill_switch_handler=TradingKillSwitch(om))
await client.initialize()

# In your trading loop - SYNC check (fastest, uses cache)
if client.is_kill_switch_active("trading.emergency_stop"):
    return  # Don't trade!

# Async check with context
if await client.is_enabled("trading.new_strategy", user_id="account123"):
    await execute_new_strategy()
```

### NOVA Agent / DeepCode Editor (TypeScript)

```typescript
import { FeatureFlagClient } from '@vibetech/feature-flags-sdk-node';

const flags = new FeatureFlagClient({
  serverUrl: 'http://localhost:3100',
  environment: 'prod',
  enableWebSocket: true,
  onKillSwitch: (event) => {
    if (event.flagKey === 'app.maintenance_mode') {
      showMaintenanceScreen();
    }
  },
});

await flags.initialize();

// Simple check
if (flags.isEnabled('editor.new_syntax_highlighting')) {
  enableNewSyntaxHighlighting();
}

// Kill switch (sync, from cache)
if (flags.isKillSwitchActive('app.disable_ai_features')) {
  disableAI();
}
```

### React Frontend

```tsx
import { 
  FeatureFlagProvider, 
  useFlag, 
  useVariant,
  FeatureGate 
} from '@vibetech/feature-flags-sdk-react';

// In your app root
function App() {
  return (
    <FeatureFlagProvider
      serverUrl="http://localhost:3100"
      environment="prod"
      context={{ userId: user.id }}
    >
      <Dashboard />
    </FeatureFlagProvider>
  );
}

// In components
function Dashboard() {
  const showNewUI = useFlag('dashboard.new_layout');
  const { variant, payload } = useVariant('dashboard.theme_test');
  
  return (
    <div className={variant === 'dark' ? 'dark-theme' : 'light-theme'}>
      {showNewUI && <NewDashboard />}
      
      <FeatureGate flag="dashboard.beta_panel">
        <BetaPanel />
      </FeatureGate>
    </div>
  );
}
```

## Kill Switch Priority Levels

| Priority | Propagation | Use Case |
|----------|-------------|----------|
| Critical | < 100ms | Stop all trading immediately |
| High | < 1s | Disable specific features |
| Normal | < 5s | General feature toggles |

## Package Structure

```
packages/feature-flags/
├── core/           # Shared types and hashing utilities
├── sdk-node/       # Node.js SDK (Electron, Tauri backend, services)
├── sdk-react/      # React SDK with hooks and components
├── sdk-python/     # Python SDK (trading bot)
├── server/         # Feature flag service (TODO)
└── dashboard/      # Admin UI (TODO)
```

## Initial Flags

The system comes with suggested starter flags:

- `trading.emergency_stop` - Kill switch for all trading
- `trading.halt_xlm` - Halt XLM trading specifically
- `trading.new_strategy_v2` - Gradual rollout of new strategy
- `dashboard.new_charts` - New chart components
- `editor.ai_autocomplete` - AI autocomplete feature

## Next Steps

1. **Server**: Implement the feature flag server with SQLite storage
2. **Dashboard**: Build admin UI for flag management
3. **Integration**: Wire up to existing apps
