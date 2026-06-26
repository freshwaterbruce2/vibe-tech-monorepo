---
name: structured-logger-migration
description: Structured logger migration pattern - replace console.* with typed logger utility (32 successful TypeScript executions)
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_code_pattern_analysis
  success_rate: 1.0
  category: software-development
  source_pattern: structured-logger-logger-utility
  executions_analyzed: 32
  language: typescript
---

# Structured Logger Migration

**Auto-generated from 32 successful TypeScript code pattern executions with 100% success rate**

## Overview

This skill captures the proven pattern for migrating from `console.*` statements to a structured logger utility in TypeScript projects. The pattern was used 32 times with 100% success rate in the VibeTech monorepo.

The migration follows: grep for console.* in services/ → create src/utils/logger.ts → replace 1:1 with logger.debug/info/warn/error → add vi.mock in vitest.setup.ts

## Core Capabilities

### 1. Find Console Statements
```bash
# Search for all console usage in services
search_files target=content pattern="console\." file_glob="*.ts" path="services/"
# Or: search_files target=content pattern="console\." path="apps/"
```

### 2. Create Logger Utility
```typescript
// src/utils/logger.ts
import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  service: string;
}

class Logger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string) {
    this.service = service;
    this.minLevel = (config.logLevel as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: this.service,
    };
    
    // Structured output for log aggregation
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }
  info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
  warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
  error(message: string, context?: Record<string, unknown>) { this.log('error', message, context); }
}

// Factory function
export function createLogger(service: string): Logger {
  return new Logger(service);
}

// Default export for gradual migration
export const logger = createLogger('app');
```

### 3. Replace Console Statements (1:1 Mapping)
```typescript
// Before:
console.log('User logged in', { userId: 123 });
console.error('Failed to connect', error);
console.warn('Deprecated API called');
console.debug('Cache hit', { key });

// After:
logger.info('User logged in', { userId: 123 });
logger.error('Failed to connect', { error: error.message });
logger.warn('Deprecated API called');
logger.debug('Cache hit', { key });
```

### 4. Vitest Mock Setup
```typescript
// vitest.setup.ts
import { vi } from 'vitest';

// Mock logger for all tests
vi.mock('../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));
```

## Usage Examples

### Example 1: Service migration
```bash
# 1. Find all console usage in service
search_files pattern="console\\." path="apps/api/src/services/" file_glob="*.ts"

# 2. Create logger (if not exists)
# Edit src/utils/logger.ts

# 3. Replace in each service file
patch mode=replace path="apps/api/src/services/auth.ts" \
  old_string="console.log('User authenticated', { userId })" \
  new_string="logger.info('User authenticated', { userId })"

# 4. Add test mock
# Edit vitest.setup.ts

# 5. Verify
pnpm typecheck
pnpm test --filter=api
```

### Example 2: Gradual migration with dual export
```typescript
// During migration, support both patterns
import { logger, createLogger } from '../utils/logger';

const serviceLogger = createLogger('payment-service');

// Old code can still use console (temporarily)
// New code uses structured logger
serviceLogger.info('Payment processed', { amount: 100, currency: 'USD' });
```

### Example 3: Context enrichment
```typescript
// Add request context automatically
const requestLogger = createLogger('api').child({ requestId: 'abc-123' });
requestLogger.info('Request started', { method: 'POST', path: '/api/users' });
```

## Integration with Monorepo

- **Logger Location**: `packages/shared-utils/src/utils/logger.ts` (shared) or per-app `src/utils/logger.ts`
- **Config**: `config.logLevel` from environment
- **Tests**: vitest.setup.ts at workspace root or per-package
- **Build**: No additional build steps needed
- **CI**: Typecheck and tests validate migration

## Safety Measures

1. **1:1 Replacement**: Each console.* maps to exactly one logger method
2. **Type Safety**: Logger methods accept typed context objects
3. **Test Mocks**: All tests mock logger to avoid noise
4. **Config-Driven**: Log level controlled via config, not code
5. **Structured Output**: JSON lines for log aggregation (Datadog, Loki, etc.)

## Rules Enforcement

- ✅ Replace ALL console.* in production code
- ✅ Use structured context objects, not string concatenation
- ✅ Mock logger in ALL tests
- ✅ Configure log level via environment
- ❌ NO console.log/error/warn in committed code
- ❌ NO console in library code (packages/*)

## Related Skills

- `bash-command-patterns` - Safe search and replace
- `patch` - Targeted file edits
- `dev-practices` - Software development practices
- `software-development-practices` - Core TDD practices
- `tdd-workflow` - Test-driven development

## Generation Metadata

- **Source**: Learning system code_patterns table
- **Pattern**: structured-logger | logger-utility
- **Language**: TypeScript
- **Total Executions**: 32
- **Success Rate**: 100%
- **Recommended Approach**: "Grep for console.* in services/, create src/utils/logger.ts, replace 1:1 with logger.debug/info/warn/error, add vi.mock in vitest.setup.ts"
- **Last Analyzed**: 2026-06-18
- **Confidence**: 0.85