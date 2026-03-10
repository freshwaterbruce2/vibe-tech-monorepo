# @vibetech/logger

Structured JSON logging for all VibeTech monorepo packages.

## Installation

```bash
pnpm add @vibetech/logger
```

## Usage

```typescript
import { createLogger, LogLevel } from '@vibetech/logger';

// Create a logger for your service
const logger = createLogger('my-service');

// Log at different levels
logger.info('Server started', { port: 3000 });
logger.warn('Connection slow', { latency: 500 });
logger.error('Failed to connect', { host: 'db.local' }, new Error('ECONNREFUSED'));
logger.debug('Processing request', { requestId: 'abc-123' });
```

## Output Format

All logs are output as structured JSON:

```json
{
  "timestamp": "2026-01-14T17:30:00.000Z",
  "level": "info",
  "message": "Server started",
  "service": "my-service",
  "context": { "port": 3000 }
}
```

## Log Levels

| Level | Value | Use Case |
|-------|-------|----------|
| `ERROR` | `error` | Errors requiring immediate attention |
| `WARN` | `warn` | Warning conditions |
| `INFO` | `info` | General operational messages |
| `DEBUG` | `debug` | Detailed debugging information |

## Configuration

Log level is controlled via `LOG_LEVEL` environment variable (see `@vibetech/shared-config`):

```bash
LOG_LEVEL=debug  # Show all logs
LOG_LEVEL=info   # Show info, warn, error (default)
LOG_LEVEL=warn   # Show warn, error only
LOG_LEVEL=error  # Show errors only
```

## API

### `createLogger(service: string): Logger`

Factory function to create a new logger instance.

### `Logger.error(message: string, context?: object, error?: Error)`

Log an error with optional context and Error object.

### `Logger.warn(message: string, context?: object)`

Log a warning with optional context.

### `Logger.info(message: string, context?: object)`

Log informational message with optional context.

### `Logger.debug(message: string, context?: object)`

Log debug message with optional context (filtered by LOG_LEVEL).

## Development

```bash
# Build
pnpm nx run @vibetech/logger:build

# Test
pnpm nx run @vibetech/logger:test

# Type check
pnpm nx run @vibetech/logger:typecheck
```
