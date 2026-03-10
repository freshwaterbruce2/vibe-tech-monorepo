# Gemini Anti-Gravity IDE - Workspace Rules

# VibeTech Monorepo - Workspace-Specific Configurations

# Last Updated: 2026-01-18

---

## 📂 WORKSPACE: Directory Boundaries

**Primary Workspace**: `C:\dev` (Source Code) and `D:\` (Data/Logs/Media).
**Prohibited**: `C:\Users\fresh_zxae3v6` MUST NOT be used for project storage, logs, or accumulation of development artifacts.

- **Action**: Keep the user profile clean.
- **Exceptions**: Standard dotfiles (`.ssh`, `.gitconfig`) are permitted but should be minimized.

---

## 📦 WORKSPACE: Trading Bot (crypto-enhanced)

**Location**: `C:\dev\projects\crypto-enhanced\`
**Database**: `D:\databases\crypto-enhanced\`
**Stack**: Python 3.11+, asyncio, ccxt, pytest

### Critical Safety Rules

```python
# ⚠️ TRADING BOT SPECIFIC - ABSOLUTE REQUIREMENTS

❌ NEVER execute trades in production without user confirmation
❌ NEVER bypass nonce validation or instance locks
❌ NEVER ignore balance checks before placing orders
❌ NEVER skip rate limiting (Kraken: 15 calls/sec max)
❌ NEVER run multiple bot instances simultaneously
❌ NEVER commit API keys or credentials

✅ ALWAYS validate order parameters (amount, price, type)
✅ ALWAYS check account balance before orders
✅ ALWAYS implement timeouts (default 10s for API calls)
✅ ALWAYS log all trades and API interactions
✅ ALWAYS use nonce manager for API calls
✅ ALWAYS test with small amounts first ($1-5)
✅ ALWAYS implement circuit breakers for losses
```

### Trading Bot Architecture

```python
# Standard structure for all trading operations
import asyncio
import logging
from typing import Optional
from decimal import Decimal

logger = logging.getLogger(__name__)

class TradingOperation:
    """Base class for all trading operations"""

    MAX_RETRIES = 3
    TIMEOUT = 10.0
    MIN_BALANCE_BUFFER = Decimal("5.0")  # Keep $5 buffer

    async def execute_with_safety(
        self,
        symbol: str,
        amount: Decimal,
        price: Optional[Decimal] = None
    ) -> dict:
        """
        Execute trading operation with all safety checks.

        Safety checks performed:
        1. Instance lock verification
        2. Balance validation
        3. Nonce management
        4. Rate limiting
        5. Parameter validation
        6. Timeout handling
        """
        # 1. Check instance lock
        if not await self.verify_instance_lock():
            raise RuntimeError("Another bot instance is running")

        # 2. Validate balance
        balance = await self.get_balance()
        if balance < amount + self.MIN_BALANCE_BUFFER:
            raise InsufficientFundsError(
                f"Balance {balance} insufficient for {amount}"
            )

        # 3. Get nonce from manager
        nonce = await self.nonce_manager.get_nonce()

        # 4. Rate limit check
        await self.rate_limiter.acquire()

        try:
            async with asyncio.timeout(self.TIMEOUT):
                result = await self._execute_trade(
                    symbol=symbol,
                    amount=amount,
                    price=price,
                    nonce=nonce
                )
                logger.info(f"Trade executed: {result}")
                return result
        except asyncio.TimeoutError:
            logger.error(f"Timeout executing trade for {symbol}")
            raise
```

### Testing Requirements

```python
# All trading operations MUST have these tests

import pytest

class TestTradingOperation:
    """Test suite structure for trading operations"""

    @pytest.mark.asyncio
    async def test_successful_trade(self):
        """Test successful trade execution"""
        pass

    @pytest.mark.asyncio
    async def test_insufficient_balance(self):
        """Test trade rejection with insufficient balance"""
        pass

    @pytest.mark.asyncio
    async def test_duplicate_instance_prevention(self):
        """Test instance lock prevents duplicate instances"""
        pass

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test proper timeout handling"""
        pass

    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiter prevents API abuse"""
        pass

    @pytest.mark.asyncio
    async def test_nonce_management(self):
        """Test nonce manager prevents conflicts"""
        pass
```

### Database Schema (SQLite on D:\databases\crypto-enhanced\)

```sql
-- trades table (REQUIRED)
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,  -- 'buy' or 'sell'
    amount DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8),
    order_id TEXT UNIQUE,
    status TEXT NOT NULL,  -- 'pending', 'filled', 'cancelled', 'failed'
    error TEXT,
    UNIQUE(order_id)
);

-- balance_history (REQUIRED)
CREATE TABLE IF NOT EXISTS balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT NOT NULL,
    balance DECIMAL(18,8) NOT NULL,
    available DECIMAL(18,8) NOT NULL
);

-- api_calls (monitoring)
CREATE TABLE IF NOT EXISTS api_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error TEXT
);
```

### Environment Variables (REQUIRED)

```bash
# .env.trading (NEVER commit this file)
KRAKEN_API_KEY=your_api_key_here
KRAKEN_SECRET_KEY=your_secret_key_here
TRADING_MODE=paper  # 'paper' or 'live'
MAX_POSITION_SIZE=100.00  # USD
STOP_LOSS_PERCENT=2.0
TAKE_PROFIT_PERCENT=5.0
LOG_LEVEL=INFO
DATABASE_PATH=D:/databases/crypto-enhanced/trading.db
```

---

## 📦 WORKSPACE: Web Apps (React 19)

**Location**: `C:\dev\projects\active\web-apps\*`
**Stack**: React 19, TypeScript, TanStack Query, Radix UI, Tailwind

### Component Structure

```typescript
// Standard component pattern for all web apps
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';

interface FeatureProps {
  userId: string;
}

/**
 * Feature component with error handling and suspense
 */
export function Feature({ userId }: FeatureProps) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<LoadingSkeleton />}>
        <FeatureContent userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}

function FeatureContent({ userId }: FeatureProps) {
  const { data, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (error) throw error;

  return <div>{/* Component JSX */}</div>;
}

function LoadingSkeleton() {
  return <div className="animate-pulse">{/* Loading state */}</div>;
}

function ErrorFallback() {
  return <div className="text-destructive">{/* Error state */}</div>;
}
```

### State Management Rules

```typescript
// Server state: Use TanStack Query
✅ const { data } = useQuery({ queryKey, queryFn });

// Client state: Use React state
✅ const [isOpen, setIsOpen] = useState(false);

// Form state: Use React Hook Form + Zod
✅ const form = useForm<FormData>({
  resolver: zodResolver(schema),
});

// Global client state: Use Context + Reducer
✅ const [state, dispatch] = useReducer(reducer, initialState);

❌ NEVER use global state for server data (use TanStack Query)
❌ NEVER fetch in useEffect (use TanStack Query)
```

### Styling Conventions

```typescript
// Use Tailwind utility classes (preferred)
<Button className="px-4 py-2 bg-primary text-primary-foreground">
  Click me
</Button>

// Use Radix UI primitives (required for complex components)
import * as Dialog from '@radix-ui/react-dialog';

// Use CSS modules only when Tailwind insufficient
import styles from './feature.module.css';

// ❌ NEVER use inline styles
❌ <div style={{ padding: '16px' }}>content</div>

// ❌ NEVER use styled-components or emotion
```

### Testing Requirements

```typescript
// All components MUST have these tests
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

describe('Feature', () => {
  it('renders loading state initially', () => {
    render(<Feature userId="123" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders data after loading', async () => {
    render(<Feature userId="123" />);
    expect(await screen.findByText(/user data/i)).toBeInTheDocument();
  });

  it('shows error state on failure', async () => {
    // Mock API failure
    render(<Feature userId="invalid" />);
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<Feature userId="123" />);
    await user.click(screen.getByRole('button'));
    // Assert interaction result
  });
});
```

---

## 📦 WORKSPACE: Desktop Apps (Tauri/Electron)

**Location**: `C:\dev\projects\active\desktop-apps\*`
**Database**: `D:\databases\[app-name]\`
**Stack**: Tauri (preferred), React 19, TypeScript, IPC bridge

### IPC Communication Pattern

```typescript
// Frontend (React) - Standard pattern for all IPC calls
import { invoke } from '@tauri-apps/api/core';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute IPC command with error handling and timeout
 */
async function executeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
  timeout = 5000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await invoke<IpcResponse<T>>(command, args);

    if (!response.success) {
      throw new Error(response.error || 'Command failed');
    }

    return response.data!;
  } catch (error) {
    console.error(`IPC command failed: ${command}`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage
const userData = await executeCommand<User>('get_user_data', { userId: '123' });
```

```rust
// Backend (Rust) - Standard command pattern
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
struct IpcResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[command]
async fn get_user_data(user_id: String) -> Result<IpcResponse<User>, String> {
    match fetch_user(&user_id).await {
        Ok(user) => Ok(IpcResponse {
            success: true,
            data: Some(user),
            error: None,
        }),
        Err(e) => Ok(IpcResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}
```

### Window State Persistence

```typescript
// Automatically save/restore window state
import { appWindow } from '@tauri-apps/api/window';

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

async function saveWindowState() {
  const position = await appWindow.outerPosition();
  const size = await appWindow.outerSize();
  const isMaximized = await appWindow.isMaximized();

  const state: WindowState = {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    isMaximized,
  };

  await invoke('save_window_state', { state });
}

// Call on window close
await appWindow.onCloseRequested(async () => {
  await saveWindowState();
});
```

### Database Schema (SQLite on D:\databases\[app-name]\)

```sql
-- app_state (REQUIRED for all desktop apps)
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- window_state (REQUIRED)
CREATE TABLE IF NOT EXISTS window_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    is_maximized BOOLEAN NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- user_preferences (RECOMMENDED)
CREATE TABLE IF NOT EXISTS user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📦 WORKSPACE: Backend Services (Node.js)

**Location**: `C:\dev\backend\`
**Stack**: Node.js LTS, TypeScript, Express/Fastify, Prisma

### API Route Structure

```typescript
// Standard route pattern with validation and error handling
import { z } from 'zod';
import { asyncHandler } from '@/middleware/async-handler';
import { validateRequest } from '@/middleware/validation';

const getUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

export const getUserRoute = asyncHandler(async (req, res) => {
  const { userId } = validateRequest(getUserSchema, req);

  const user = await userService.getUser(userId);

  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  res.json({
    success: true,
    data: user,
  });
});

// Error handler middleware (REQUIRED)
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
```

### Database Migrations

```typescript
// Always use migrations for schema changes
// Prisma schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Migration workflow
// 1. Update schema
// 2. Create migration: npx prisma migrate dev --name add_user_table
// 3. Apply in production: npx prisma migrate deploy
```

### Testing Requirements

```typescript
// Integration tests for all API routes
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testClient } from '@/test/client';

describe('GET /api/users/:userId', () => {
  let userId: string;

  beforeAll(async () => {
    // Setup test data
    const user = await createTestUser();
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await deleteTestUser(userId);
  });

  it('returns user when ID is valid', async () => {
    const response = await testClient.get(`/api/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toMatchObject({
      id: userId,
      email: expect.any(String),
    });
  });

  it('returns 404 when user does not exist', async () => {
    const response = await testClient.get('/api/users/invalid-id');

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
  });

  it('returns 400 when ID format is invalid', async () => {
    const response = await testClient.get('/api/users/not-a-uuid');

    expect(response.status).toBe(400);
  });
});
```

---

## 📦 WORKSPACE: Shared Packages

**Location**: `C:\dev\packages\*`
**Stack**: TypeScript, shared utilities, types, components

### Package Structure

```
packages/
├── ui/                        # Shared UI components
│   ├── src/
│   │   ├── components/       # Component implementations
│   │   ├── hooks/            # Shared hooks
│   │   ├── utils/            # UI utilities
│   │   └── index.ts          # Public exports
│   ├── package.json
│   └── tsconfig.json
├── types/                     # Shared TypeScript types
│   ├── src/
│   │   ├── api/              # API types
│   │   ├── models/           # Domain models
│   │   └── index.ts
│   └── package.json
└── utils/                     # Shared utilities
    ├── src/
    │   ├── async/            # Async utilities
    │   ├── validation/       # Validation utilities
    │   └── index.ts
    └── package.json
```

### Publishing Rules

```json
// package.json for all shared packages
{
  "name": "@vibetech/package-name",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  }
}
```

### Import Patterns

```typescript
// ✅ CORRECT: Import from packages using workspace protocol
import { Button } from '@vibetech/ui';
import type { User } from '@vibetech/types';
import { fetchWithRetry } from '@vibetech/utils';

// ❌ WRONG: Don't use relative paths across packages
❌ import { Button } from '../../../packages/ui/src/components/button';
```

---

## 🔧 CROSS-WORKSPACE RULES

### Version Constraints

```json
// All workspaces MUST use these versions
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "@types/react": "19.2.2",
  "@types/react-dom": "19.2.1",
  "typescript": "^5.9.3",
  "node": ">=20.0.0",
  "pnpm": "9.15.0"
}
```

### Dependency Management

```bash
# Add dependency to specific workspace
pnpm add <package> --filter @vibetech/workspace-name

# Add dependency to root
pnpm add -w <package>

# Update all dependencies
pnpm update -r

# Install all workspaces
pnpm install

# ❌ NEVER use npm or yarn
```

### Build Order (Nx handles automatically)

```
1. packages/types (no dependencies)
2. packages/utils (depends on types)
3. packages/ui (depends on types, utils)
4. backend (depends on types, utils)
5. apps/* (depends on all packages)
```

---

## 📝 WORKSPACE-SPECIFIC COMMANDS

```bash
# Trading Bot
cd projects/crypto-enhanced
source .venv/Scripts/activate  # Windows
python run_tests.py            # Run all tests
python -m pytest --cov         # With coverage

# Web Apps
cd projects/active/web-apps/app-name
pnpm dev                       # Start dev server
pnpm test                      # Run tests
pnpm build                     # Production build

# Desktop Apps
cd projects/active/desktop-apps/app-name
pnpm tauri dev                 # Start Tauri dev
pnpm tauri build               # Build for production
pnpm test                      # Run tests

# Backend
cd backend
pnpm dev                       # Start with hot reload
pnpm test                      # Run integration tests
pnpm db:migrate                # Run migrations
```

---

_Generated for VibeTech Monorepo | Workspace-Specific Rules_
