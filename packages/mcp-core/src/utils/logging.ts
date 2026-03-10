import pino from 'pino';
import type { Logger } from '../types/capability.js';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Logger name/component */
  name: string;
  /** Minimum log level */
  level?: LogLevel;
  /** Pretty print (for development) */
  pretty?: boolean;
  /** Base context to include in all logs */
  context?: Record<string, unknown>;
}

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions): Logger {
  const pinoLogger = pino({
    name: options.name,
    level: options.level ?? 'info',
    transport: options.pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            destination: 2, // stderr — keep stdout clean for MCP stdio protocol
          },
        }
      : undefined,
    base: {
      ...options.context,
    },
  }, options.pretty ? undefined : pino.destination(2)); // stderr when no transport

  return {
    debug(msg: string, data?: Record<string, unknown>) {
      pinoLogger.debug(data ?? {}, msg);
    },
    info(msg: string, data?: Record<string, unknown>) {
      pinoLogger.info(data ?? {}, msg);
    },
    warn(msg: string, data?: Record<string, unknown>) {
      pinoLogger.warn(data ?? {}, msg);
    },
    error(msg: string, data?: Record<string, unknown>) {
      pinoLogger.error(data ?? {}, msg);
    },
  };
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  parent: Logger & { child?: (bindings: Record<string, unknown>) => Logger },
  bindings: Record<string, unknown>
): Logger {
  // If the parent has a child method (pino logger), use it
  if ('child' in parent && typeof parent.child === 'function') {
    return parent.child(bindings) as Logger;
  }

  // Otherwise, wrap the parent with additional context
  return {
    debug(msg: string, data?: Record<string, unknown>) {
      parent.debug(msg, { ...bindings, ...data });
    },
    info(msg: string, data?: Record<string, unknown>) {
      parent.info(msg, { ...bindings, ...data });
    },
    warn(msg: string, data?: Record<string, unknown>) {
      parent.warn(msg, { ...bindings, ...data });
    },
    error(msg: string, data?: Record<string, unknown>) {
      parent.error(msg, { ...bindings, ...data });
    },
  };
}

/**
 * No-op logger for testing or when logging is disabled
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Console logger for simple use cases
 */
export const consoleLogger: Logger = {
  debug: (msg, data) => console.debug(`[DEBUG] ${msg}`, data ?? ''),
  info: (msg, data) => console.info(`[INFO] ${msg}`, data ?? ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data ?? ''),
};

/**
 * Format log data for MCP error responses
 */
export function formatLogContext(
  operation: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    operation,
    timestamp: new Date().toISOString(),
    ...data,
  };
}
