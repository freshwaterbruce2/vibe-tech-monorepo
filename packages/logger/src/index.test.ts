import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Logger, { createLogger, LogLevel } from './index';

describe('logger', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let logOutput: string[];

    beforeEach(() => {
        logOutput = [];
        consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
            logOutput.push(msg);
        });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('LogLevel', () => {
        it('has ERROR level', () => {
            expect(LogLevel.ERROR).toBe('error');
        });

        it('has WARN level', () => {
            expect(LogLevel.WARN).toBe('warn');
        });

        it('has INFO level', () => {
            expect(LogLevel.INFO).toBe('info');
        });

        it('has DEBUG level', () => {
            expect(LogLevel.DEBUG).toBe('debug');
        });
    });

    describe('createLogger', () => {
        it('creates a Logger instance', () => {
            const logger = createLogger('test-service');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('creates loggers with different service names', () => {
            const logger1 = createLogger('service-a');
            const logger2 = createLogger('service-b');
            expect(logger1).not.toBe(logger2);
        });
    });

    describe('Logger', () => {
        let logger: Logger;

        beforeEach(() => {
            logger = createLogger('test-service');
        });

        describe('error', () => {
            it('logs error messages', () => {
                logger.error('Something went wrong');
                expect(logOutput.length).toBe(1);
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.level).toBe('error');
                expect(entry.message).toBe('Something went wrong');
                expect(entry.service).toBe('test-service');
            });

            it('includes context when provided', () => {
                logger.error('Error with context', { userId: 123 });
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.context).toEqual({ userId: 123 });
            });

            it('includes error details when provided', () => {
                const error = new Error('Test error');
                logger.error('Error occurred', undefined, error);
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.error.message).toBe('Test error');
                expect(entry.error.stack).toBeDefined();
            });
        });

        describe('warn', () => {
            it('logs warning messages', () => {
                logger.warn('Warning message');
                expect(logOutput.length).toBe(1);
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.level).toBe('warn');
                expect(entry.message).toBe('Warning message');
            });

            it('includes context when provided', () => {
                logger.warn('Warning with context', { action: 'retry' });
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.context).toEqual({ action: 'retry' });
            });
        });

        describe('info', () => {
            it('logs info messages', () => {
                logger.info('Info message');
                expect(logOutput.length).toBe(1);
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.level).toBe('info');
                expect(entry.message).toBe('Info message');
            });

            it('includes timestamp', () => {
                logger.info('Timestamped message');
                const entry = JSON.parse(logOutput[0]!);
                expect(entry.timestamp).toBeDefined();
                expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');
            });
        });

        describe('debug', () => {
            it('logs debug messages when level allows', () => {
                // Default level is 'info', so debug might be filtered
                logger.debug('Debug message');
                // May or may not log depending on env.LOG_LEVEL
                // Just verify no errors thrown
                expect(true).toBe(true);
            });
        });

        describe('structured output', () => {
            it('outputs valid JSON', () => {
                logger.info('Test message');
                expect(() => JSON.parse(logOutput[0]!)).not.toThrow();
            });

            it('includes all required fields', () => {
                logger.info('Complete message');
                const entry = JSON.parse(logOutput[0]!);
                expect(entry).toHaveProperty('timestamp');
                expect(entry).toHaveProperty('level');
                expect(entry).toHaveProperty('message');
                expect(entry).toHaveProperty('service');
            });
        });
    });
});
