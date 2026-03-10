import { describe, it, expect } from 'vitest';
import {
    normalizePath,
    env,
    getDatabasePath,
    getLearningSystemDir,
    validatePath,
    getIPCConfig,
} from './index';

describe('shared-config', () => {
    describe('normalizePath', () => {
        it('converts forward slashes to backslashes', () => {
            expect(normalizePath('D:/databases/test.db')).toBe('D:\\databases\\test.db');
        });

        it('normalizes mixed slashes', () => {
            expect(normalizePath('D:/learning-system\\logs/test.log')).toBe(
                'D:\\learning-system\\logs\\test.log'
            );
        });

        it('handles already normalized paths', () => {
            expect(normalizePath('D:\\databases\\test.db')).toBe('D:\\databases\\test.db');
        });
    });

    describe('env', () => {
        it('is a valid config object', () => {
            expect(env).toBeDefined();
            expect(typeof env).toBe('object');
        });

        it('has expected default keys', () => {
            expect(env).toHaveProperty('APP_DB_PATH');
            expect(env).toHaveProperty('LEARNING_DB_PATH');
            expect(env).toHaveProperty('NODE_ENV');
            expect(env).toHaveProperty('LOG_LEVEL');
        });
    });

    describe('getDatabasePath', () => {
        it('returns app database path', () => {
            const path = getDatabasePath('app');
            expect(path).toContain('database');
            expect(path).toMatch(/\\/); // Contains backslash
        });

        it('returns learning database path', () => {
            const path = getDatabasePath('learning');
            expect(path).toContain('learning');
            expect(path).toMatch(/\\/);
        });
    });

    describe('getLearningSystemDir', () => {
        it('returns a normalized path', () => {
            const dir = getLearningSystemDir();
            expect(typeof dir).toBe('string');
            expect(dir).toMatch(/\\/); // Contains backslash
        });
    });

    describe('validatePath', () => {
        it('returns true for existing path', () => {
            // process.cwd() always exists
            expect(validatePath(process.cwd())).toBe(true);
        });

        it('returns false for non-existing path', () => {
            expect(validatePath('Z:\\nonexistent\\path\\file.xyz')).toBe(false);
        });
    });

    describe('getIPCConfig', () => {
        it('returns config object with required properties', () => {
            const config = getIPCConfig();
            expect(config).toHaveProperty('url');
            expect(config).toHaveProperty('reconnectDelay');
            expect(config).toHaveProperty('maxReconnectAttempts');
        });

        it('has valid url format', () => {
            const config = getIPCConfig();
            expect(config.url).toMatch(/^ws:\/\//);
        });

        it('has numeric reconnect values', () => {
            const config = getIPCConfig();
            expect(typeof config.reconnectDelay).toBe('number');
            expect(typeof config.maxReconnectAttempts).toBe('number');
        });
    });
});
