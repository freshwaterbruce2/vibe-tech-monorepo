# Feature Flags Integration Guide

This guide shows how to integrate the Feature Flag system into each Vibe application.

## 🚨 Trading Bot (Python) - crypto-enhanced

### 1. Install the Python SDK

```bash
cd packages/feature-flags/sdk-python
pip install -e .
```

### 2. Integration Code

Add this to your main trading bot file:

```python
import asyncio
from feature_flags import (
    FeatureFlagClient,
    ClientConfig,
    Environment,
    KillSwitchHandler,
)

class TradingKillSwitch(KillSwitchHandler):
    """Handles emergency stop kill switch"""

    def __init__(self, bot):
        self.bot = bot

    async def on_kill_switch_triggered(self, flag_key: str, context: dict):
        if flag_key == "trading.emergency_stop":
            await self.bot.emergency_shutdown()
            print("🛑 EMERGENCY STOP ACTIVATED!")

# Initialize feature flags
config = ClientConfig(
    server_url="http://localhost:3100",
    environment=Environment.PROD,
    enable_websocket=True,  # Real-time updates
)

flags = FeatureFlagClient(
    config,
    kill_switch_handler=TradingKillSwitch(bot)
)
await flags.initialize()

# In your trading loop (check before each trade):
async def execute_trade():
    # CRITICAL: Check kill switch FIRST (uses cache, ultra-fast)
    if flags.is_kill_switch_active("trading.emergency_stop"):
        return  # STOP TRADING IMMEDIATELY

    # Check other flags
    if await flags.is_enabled("trading.new_strategy"):
        await execute_new_strategy()
    else:
        await execute_legacy_strategy()
```

---

## 🤖 Nova Agent (Tauri/TypeScript)

### 1. Add Dependency

```bash
cd apps/nova-agent
pnpm add @vibetech/feature-flags-sdk-node
```

### 2. Integration Code

Create `src/services/feature-flags.ts`:

```typescript
import { FeatureFlagClient } from '@vibetech/feature-flags-sdk-node';

export const featureFlags = new FeatureFlagClient({
  serverUrl: 'http://localhost:3100',
  environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  enableWebSocket: true,
  onKillSwitch: (event) => {
    console.warn('⚠️ Kill switch triggered:', event.flagKey);
  },
});

export async function initializeFlags() {
  await featureFlags.initialize();
  console.log('✅ Feature flags initialized');
}

// Export convenience helpers
export const useAdvancedReasoning = () => featureFlags.isEnabled('nova.advanced_reasoning');
```

Use in your main app:

```typescript
import { initializeFlags, useAdvancedReasoning } from './services/feature-flags';

async function main() {
  await initializeFlags();

  // Use throughout your app
  if (useAdvancedReasoning()) {
    // Enable enhanced AI capabilities
    enableEnhancedReasoning();
  }
}
```

---

## 💻 Vibe Code Studio (Electron)

### 1. Add Dependency

```bash
cd apps/vibe-code-studio
pnpm add @vibetech/feature-flags-sdk-node
```

### 2. Integration Code

Create `src/features/featureFlags.ts`:

```typescript
import { FeatureFlagClient } from '@vibetech/feature-flags-sdk-node';

class FeatureFlagService {
  private client: FeatureFlagClient;

  constructor() {
    this.client = new FeatureFlagClient({
      serverUrl: 'http://localhost:3100',
      environment: 'prod',
      enableWebSocket: true,
    });
  }

  async initialize() {
    await this.client.initialize();
  }

  isAIAutocompleteEnabled(): boolean {
    return this.client.isEnabled('vibe-studio.ai_autocomplete');
  }
}

export const featureFlagService = new FeatureFlagService();
```

Use in your editor extension:

```typescript
import { featureFlagService } from './features/featureFlags';

// On editor startup
await featureFlagService.initialize();

// In autocomplete provider
if (featureFlagService.isAIAutocompleteEnabled()) {
  return await getAICompletions(context);
}
```

---

## ⚛️ React Web Apps

### 1. Add Dependency

```bash
pnpm add @vibetech/feature-flags-sdk-react
```

### 2. Integration Code

Wrap your app with the provider:

```tsx
import { FeatureFlagProvider } from '@vibetech/feature-flags-sdk-react';

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
```

Use in components:

```tsx
import { useFlag, FeatureGate } from '@vibetech/feature-flags-sdk-react';

function MyComponent() {
  const showBetaFeature = useFlag('app.beta_ui');

  return (
    <div>
      {showBetaFeature && <BetaFeature />}

      <FeatureGate flag="app.premium_charts">
        <PremiumCharts />
      </FeatureGate>
    </div>
  );
}
```

---

## 📊 Quick Reference

| App              | SDK          | Flag Key Example              |
| ---------------- | ------------ | ----------------------------- |
| Trading Bot      | `sdk-python` | `trading.emergency_stop`      |
| Nova Agent       | `sdk-node`   | `nova.advanced_reasoning`     |
| Vibe Code Studio | `sdk-node`   | `vibe-studio.ai_autocomplete` |
| Web Apps         | `sdk-react`  | `app.beta_ui`                 |

## 🔒 Production Checklist

- [ ] Server running at `http://localhost:3100`
- [ ] Environment set correctly (`dev`, `staging`, `prod`)
- [ ] WebSocket enabled for real-time updates
- [ ] Kill switches have handlers in critical apps
- [ ] Flags checked BEFORE executing critical operations

## 🆘 Emergency Procedures

**If you need to emergency-stop trading:**

1. Open dashboard: http://localhost:5173
2. Find `trading.emergency_stop`
3. Toggle to **ENABLED**
4. Kill switch activates in < 100ms via WebSocket
