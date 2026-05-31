import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { createLogger as createSharedLogger } from '@vibetech/logger';
import { env } from '../config/env.js';

// EventEmitter to broadcast log lines in-memory to WebSocket subscribers
export const logEmitter = new EventEmitter();

class FileLogger {
  private service: string;
  private sharedLogger: ReturnType<typeof createSharedLogger>;
  private logFilePath: string | null = null;

  constructor(service: string) {
    this.service = service;
    this.sharedLogger = createSharedLogger(service);

    if (env.NODE_ENV !== 'test') {
      try {
        // Enforce path creation on D:\ drive
        if (!fs.existsSync(env.LOG_DIR)) {
          fs.mkdirSync(env.LOG_DIR, { recursive: true });
        }
        this.logFilePath = path.join(env.LOG_DIR, 'nova-gateway.log');
      } catch (err) {
        console.error(`Failed to initialize log file directory at ${env.LOG_DIR}:`, err);
      }
    }
  }

  private writeToFile(level: string, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.logFilePath) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...(context ? { context } : {}),
      ...(error ? { 
        error: { 
          message: error.message, 
          stack: error.stack,
          code: (error as Error & { code?: string }).code
        } 
      } : {})
    };

    const logLine = JSON.stringify(entry);

    try {
      fs.appendFileSync(this.logFilePath, logLine + '\n');
    } catch (err) {
      // Fallback console log to avoid crashing on file write failure
      console.error('Failed to write log entry to file:', err);
    }

    // Broadcast the log line to active WebSocket clients
    logEmitter.emit('log', logLine);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.sharedLogger.info(message, context);
    this.writeToFile('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.sharedLogger.warn(message, context);
    this.writeToFile('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.sharedLogger.error(message, context, error);
    this.writeToFile('error', message, context, error);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.sharedLogger.debug(message, context);
    this.writeToFile('debug', message, context);
  }
}

export const logger = new FileLogger('NovaGateway');
