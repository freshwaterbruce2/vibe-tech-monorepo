import { describe, it, expect, beforeEach } from 'vitest';
import { OpenClawBridge } from './index.js';

describe('OpenClawBridge', () => {
    let bridge: OpenClawBridge;

    beforeEach(() => {
        // Clean up any existing bridge
        if (bridge) {
            bridge.disconnect();
        }
    });

    describe('Constructor', () => {
        it('should accept string URL (legacy)', () => {
            bridge = new OpenClawBridge('ws://localhost:9999');
            expect(bridge).toBeDefined();
        });

        it('should accept options object', () => {
            bridge = new OpenClawBridge({
                url: 'ws://localhost:9999',
                autoReconnect: false,
                debug: true,
            });
            expect(bridge).toBeDefined();
        });

        it('should use defaults if no options provided', () => {
            bridge = new OpenClawBridge();
            expect(bridge).toBeDefined();
        });
    });

    describe('Connection State', () => {
        it('should provide isConnected property', () => {
            bridge = new OpenClawBridge({ autoReconnect: false });
            // Before connection, should be false
            expect(bridge.isConnected).toBe(false);
        });

        it('should provide connectionState getter', () => {
            bridge = new OpenClawBridge({ autoReconnect: false });
            // Should return a valid state
            expect(['connected', 'connecting', 'disconnected', 'reconnecting']).toContain(
                bridge.connectionState
            );
        });
    });

    describe('Health Check', () => {
        it('should return unhealthy when not connected', async () => {
            bridge = new OpenClawBridge({ autoReconnect: false });
            const health = await bridge.healthCheck();

            expect(health.healthy).toBe(false);
            expect(health.error).toBe('Not connected');
        });
    });

    describe('Disconnect', () => {
        it('should be safe to disconnect when not connected', () => {
            bridge = new OpenClawBridge({ autoReconnect: false });
            // Should not throw
            expect(() => bridge.disconnect()).not.toThrow();
        });

        it('should set isConnected to false after disconnect', () => {
            bridge = new OpenClawBridge({ autoReconnect: false });
            bridge.disconnect();
            expect(bridge.isConnected).toBe(false);
        });
    });

    describe('Options Validation', () => {
        it('should handle legacy string constructor', () => {
            bridge = new OpenClawBridge('ws://custom:8080');
            expect(bridge).toBeDefined();
        });

        it('should merge options with defaults', () => {
            bridge = new OpenClawBridge({
                debug: true,
                // Other options should use defaults
            });
            expect(bridge).toBeDefined();
        });
    });
});
