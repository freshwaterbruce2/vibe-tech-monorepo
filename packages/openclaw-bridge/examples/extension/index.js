#!/usr/bin/env node
/**
 * VibeTech Bridge Extension for OpenClaw
 *
 * Provides access to VibeTech's MCP ecosystem:
 * - Filesystem operations
 * - GitHub repository search
 * - Desktop automation (Windows)
 * - Multi-step task execution
 */

import { OpenClawBridge } from '@vibetech/openclaw-bridge';
import { EventEmitter } from 'events';

class VibeTechBridgeExtension extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.bridge = null;
        this.connected = false;
        this.healthCheckInterval = null;
    }

    /**
     * Initialize the extension
     */
    async initialize() {
        console.log('[VibeTech Bridge] Initializing extension...');

        this.bridge = new OpenClawBridge({
            url: this.config.ipc_bridge_url,
            autoReconnect: this.config.auto_reconnect,
            reconnectDelay: this.config.reconnect_delay,
            maxReconnectAttempts: this.config.max_reconnect_attempts,
            debug: this.config.debug,
        });

        // Set up event listeners
        this.setupEventListeners();

        // Connect to IPC Bridge
        try {
            await this.connect();
        } catch (err) {
            console.error('[VibeTech Bridge] Initial connection failed:', err.message);
            console.error('[VibeTech Bridge] Commands will not work until connection succeeds');
        }

        // Start health checks
        this.startHealthChecks();

        console.log('[VibeTech Bridge] Extension initialized');
    }

    /**
     * Connect to IPC Bridge
     */
    async connect() {
        await this.bridge.connect();
        this.connected = true;
        console.log('[VibeTech Bridge] Connected to IPC Bridge');

        // Run initial health check
        const health = await this.bridge.healthCheck();
        console.log(`[VibeTech Bridge] Health: ${health.healthy ? '✅' : '❌'}, Latency: ${health.latencyMs}ms`);

        if (!health.healthy) {
            console.warn(`[VibeTech Bridge] Warning: ${health.error}`);
        }

        this.emit('connected');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.bridge.on('connected', () => {
            this.connected = true;
            console.log('[VibeTech Bridge] Connected');
            this.emit('connected');
        });

        this.bridge.on('disconnected', ({ code, reason }) => {
            this.connected = false;
            console.log(`[VibeTech Bridge] Disconnected (${code}: ${reason})`);
            this.emit('disconnected');
        });

        this.bridge.on('reconnecting', ({ attempt, delay }) => {
            console.log(`[VibeTech Bridge] Reconnecting (attempt ${attempt}) in ${delay}ms...`);
            this.emit('reconnecting', { attempt, delay });
        });

        this.bridge.on('reconnect_failed', () => {
            console.error('[VibeTech Bridge] Reconnection failed - max attempts reached');
            this.emit('reconnect_failed');
        });

        this.bridge.on('error', (err) => {
            console.error('[VibeTech Bridge] Error:', err.message);
            this.emit('error', err);
        });
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        const interval = this.config.health_check_interval || 60000;

        this.healthCheckInterval = setInterval(async () => {
            if (!this.bridge?.isConnected) {
                console.warn('[VibeTech Bridge] Not connected during health check');
                return;
            }

            try {
                const health = await this.bridge.healthCheck();

                if (!health.healthy) {
                    console.warn(`[VibeTech Bridge] Unhealthy: ${health.error}`);
                } else if (health.latencyMs > 1000) {
                    console.warn(`[VibeTech Bridge] High latency: ${health.latencyMs}ms`);
                }

                this.emit('health_check', health);
            } catch (err) {
                console.error('[VibeTech Bridge] Health check failed:', err.message);
            }
        }, interval);

        console.log(`[VibeTech Bridge] Health checks enabled (every ${interval}ms)`);
    }

    /**
     * Get the bridge instance (for use in commands)
     */
    getBridge() {
        return this.bridge;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.bridge?.isConnected;
    }

    /**
     * Get connection state
     */
    getConnectionState() {
        if (!this.bridge) return 'uninitialized';
        return this.bridge.connectionState;
    }

    /**
     * Manual reconnect
     */
    async reconnect() {
        console.log('[VibeTech Bridge] Manual reconnect requested');

        if (this.bridge?.isConnected) {
            console.log('[VibeTech Bridge] Already connected');
            return;
        }

        try {
            await this.connect();
        } catch (err) {
            console.error('[VibeTech Bridge] Reconnect failed:', err.message);
            throw err;
        }
    }

    /**
     * Shutdown the extension
     */
    async shutdown() {
        console.log('[VibeTech Bridge] Shutting down...');

        // Stop health checks
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Disconnect bridge
        if (this.bridge) {
            this.bridge.disconnect();
            this.bridge = null;
        }

        this.connected = false;
        console.log('[VibeTech Bridge] Extension shutdown complete');
        this.emit('shutdown');
    }

    /**
     * Get extension status
     */
    getStatus() {
        return {
            connected: this.connected,
            connectionState: this.getConnectionState(),
            config: {
                url: this.config.ipc_bridge_url,
                autoReconnect: this.config.auto_reconnect,
                debug: this.config.debug,
            },
            capabilities: [
                'filesystem',
                'codeberg',
                'desktop-commander',
                'task-execution'
            ]
        };
    }
}

export default VibeTechBridgeExtension;
