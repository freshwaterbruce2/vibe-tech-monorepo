/**
 * Logger utility for the application
 */
import { logger as baseLogger } from '../services/Logger';

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

class ConsoleLogger implements Logger {
  info(message: string, ...args: unknown[]): void {
    baseLogger.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    baseLogger.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    baseLogger.error(`[ERROR] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env['NODE_ENV'] === 'development') {
      baseLogger.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger: Logger = new ConsoleLogger();