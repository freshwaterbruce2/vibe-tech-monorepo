# @vibetech/shared-config

Shared configuration and environment utilities for the VibeTech monorepo.

## Installation

```bash
pnpm add @vibetech/shared-config
```

## Usage

```typescript
import { 
    env, 
    getDatabasePath, 
    getLearningSystemDir, 
    normalizePath,
    validatePath,
    getIPCConfig 
} from '@vibetech/shared-config';

// Access validated environment config
console.log(env.NODE_ENV);      // 'development' | 'production' | 'test'
console.log(env.LOG_LEVEL);     // 'error' | 'warn' | 'info' | 'debug'

// Get database paths (always D:\ drive)
const appDb = getDatabasePath('app');         // D:\databases\database.db
const learningDb = getDatabasePath('learning'); // D:\databases\agent_learning.db

// Get learning system directory
const learningDir = getLearningSystemDir();   // D:\learning-system

// Normalize Windows paths
const path = normalizePath('D:/databases/test.db'); // D:\databases\test.db

// Check if path exists
if (validatePath(appDb)) {
    console.log('Database exists');
}

// Get IPC WebSocket config
const ipc = getIPCConfig();
// { url: 'ws://localhost:5004', reconnectDelay: 1000, maxReconnectAttempts: 5 }
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_DB_PATH` | `D:\databases\database.db` | Main application database |
| `LEARNING_DB_PATH` | `D:\databases\agent_learning.db` | AI learning database |
| `LEARNING_SYSTEM_DIR` | `D:\learning-system` | Learning system root |
| `IPC_WS_URL` | `ws://localhost:5004` | IPC WebSocket URL |
| `NODE_ENV` | `development` | Node environment |
| `LOG_LEVEL` | `info` | Logging level |

## Development

```bash
# Build
pnpm nx run @vibetech/shared-config:build

# Test
pnpm nx run @vibetech/shared-config:test

# Type check
pnpm nx run @vibetech/shared-config:typecheck
```
