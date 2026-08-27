---
name: logger-utility
description: Implement high-performance, structured JSON logging across all VibeTech apps using `@vibetech/logger`. Provides instructions, standard patterns, best practices, and integration/test procedures.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.1.0'
  generated_from: learning_system_code_pattern_analysis
  success_rate: 96.97%
  category: development
  source_pattern: logger-utility
  executions_analyzed: 33
  language: typescript
---

# Logger Utility

**Auto-generated from 32 successful executions with 96.97% success rate**

## Overview

The `logger-utility` skill codifies the best practices and standard patterns for structured JSON logging across the VibeTech monorepo. It leverages the `@vibetech/logger` shared package to ensure all logs adhere to a consistent structure, which is critical for log aggregation, production monitoring, and headless debugging (e.g., within Tauri or Electron apps).

By replacing unstructured `console.log` calls with the structured `Logger` class, you prevent information loss, standardize log levels, and enrich log entries with runtime and error context.

## Instructions

### Step 1 — Dependency Verification & Import

Before using the logger-utility pattern, ensure your project includes `@vibetech/logger` in its `package.json` dependencies.
If it is not present, add it using the monorepo-safe command:

```bash
pnpm add @vibetech/logger --filter <project-name>
```

Import the `createLogger` factory function at the top of your TypeScript module:

```typescript
import { createLogger } from '@vibetech/logger';
```

### Step 2 — Instantiating a Service-Scoped Logger

Always create a service-scoped logger instance. Name the logger after the file or service context (e.g., `'auth-service'`, `'api-gateway'`) to easily filter logs in central logging dashboards.

```typescript
const logger = createLogger('your-service-name');
```

### Step 3 — Mapping Log Levels Correctly

Ensure you map log messages to the correct level according to VibeTech standards:

- **`logger.error`**: Critical issues that require immediate attention (e.g., failed DB connection, unhandled exception).
- **`logger.warn`**: Unexpected conditions that are not immediately fatal (e.g., API slowness, retry attempts, deprecations).
- **`logger.info`**: High-level milestones or critical execution flow details (e.g., server start, transaction committed).
- **`logger.debug`**: Verbose diagnostics and low-level step execution details (filtered out if `LOG_LEVEL` is set to info/warn/error).

### Step 4 — Attaching Structured Context and Errors

Never concatenate strings in log messages. Instead, use the second argument (`context`) to attach structured key-value metadata.
When logging exceptions, pass the `Error` object as the third argument to `logger.error` to ensure the stack trace and error codes are correctly parsed and logged.

```typescript
// Correct
logger.info('User authenticated successfully', { userId });
logger.error('Failed to process payment', { transactionId }, error);

// Incorrect
logger.info(`User ${userId} authenticated successfully`);
logger.error(`Failed to process payment ${transactionId}: ${error.message}`);
```

### Step 5 — Silencing in Tests (Mocking)

To keep test runs quiet and maintain quick execution speeds, mock `@vibetech/logger` in your test files or global vitest setup.

```typescript
import { vi } from 'vitest';

vi.mock('@vibetech/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  LogLevel: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
}));
```

---

## Examples

### Example 1: Creating and Utilizing a Service Logger

```typescript
import { createLogger } from '@vibetech/logger';

const logger = createLogger('billing-service');

export class BillingService {
  public async processInvoice(invoiceId: string, amount: number): Promise<void> {
    logger.info('Starting invoice processing', { invoiceId, amount });

    try {
      // Logic to process invoice...
      logger.debug('Successfully retrieved merchant gateway credentials', { invoiceId });

      // Complete processing...
      logger.info('Invoice processed successfully', { invoiceId });
    } catch (error) {
      logger.error('Failed to process invoice', { invoiceId }, error as Error);
      throw error;
    }
  }
}
```

### Example 2: Structured Logger Fallback (localStorage for Web PWA)

For pure Web applications or custom clients where Node.js standard streams are not available, implement a fallback logger that writes warnings and errors to a ring buffer (e.g., in `localStorage`) for diagnostic retrieval.

```typescript
import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  service: string;
}

const STORE_KEY = 'vibe_error_log';
const BUFFER_SIZE = 50;

function persistLocalLog(entry: LogEntry): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const existing: LogEntry[] = raw ? JSON.parse(raw) : [];
    existing.push(entry);
    if (existing.length > BUFFER_SIZE) {
      existing.splice(0, existing.length - BUFFER_SIZE);
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  } catch {
    // Fail silently in sandboxed/incognito environments
  }
}

export class LocalFallbackLogger {
  constructor(
    private service: string,
    private minLevel: LogLevel = 'info',
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.minLevel];
  }

  public log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: this.service,
    };

    console.log(`[${level.toUpperCase()}] [${this.service}] ${message}`, context);

    if (level === 'warn' || level === 'error') {
      persistLocalLog(entry);
    }
  }

  public info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }
  public warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }
  public error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }
}
```

---

## Performance Notes

- **Direct Output via Standard Streams**: `@vibetech/logger` writes structured JSON logs using `process.stderr.write` rather than `console.error` in Node.js environments. This is a non-blocking stream write that bypasses Node's high-overhead console formatting wrappers, resulting in higher throughput.
- **Log Level Filtering Overhead**: To minimize serialization overhead, always check log levels before constructing highly complex or heavy context objects.
- **Production Build Dead Code Elimination**: When building production bundles, debug-level logs should ideally be stripped out using build-time definitions (e.g., `import.meta.env.DEV` or `process.env.NODE_ENV === 'production'`) if they comprise more than 15% of the total application file size.

---

## Troubleshooting

### Issue: Linter complains about `no-console`

- **Cause**: Standard linters block the usage of bare `console.*` statements to ensure logs aren't accidentally left in production paths.
- **Solution**: Replace the `console.*` call with `logger.*`. Ensure the service logger is imported correctly.

### Issue: Logger is throwing a `Circular structure to JSON` exception

- **Cause**: The context object passed to the logger contains a circular reference (e.g., an entire React component tree or a massive Sequelize/Prisma record with bi-directional relations).
- **Solution**: Sanitize the context object before logging. Extract only the scalar properties needed for debugging (such as `id`, `status`, or `code`).

```typescript
// Avoid
logger.error('Prisma query failed', { userRecord: user });

// Correct
logger.error('Prisma query failed', { userId: user.id, email: user.email });
```

### Issue: Errors do not include a stack trace in the output

- **Cause**: Passing the `Error` object inside the second argument (`context`) instead of as the dedicated third argument (`error`) of `logger.error(...)`.
- **Solution**: Pass the `Error` object as the third argument so the internal parser extracts `message`, `stack`, and native error codes correctly.

```typescript
// Correct API
logger.error('Failed processing request', { userId }, error);
```

---

## Integration with Monorepo

- **Core Library**: `@vibetech/logger` lives in `packages/logger/src/index.ts` and exports both `createLogger` and `LogLevel`.
- **Log Level Configuration**: The system reads the environment-defined `LOG_LEVEL` through `@vibetech/shared-config`. If `LOG_LEVEL` is undefined, it defaults to `info`.
- **Workspace Tooling**: Any monorepo validation or affected checks (e.g., `pnpm run quality`) must run clean and respect standard JSON output without introducing syntax regression.

## Related Skills

- [structured-logger](./structured-logger.md) — Fundamental rules for eliminating raw console logs.
- [structured-logger-migration](./structured-logger-migration.md) — Detailed bulk and gradual migration guide from legacy projects.
