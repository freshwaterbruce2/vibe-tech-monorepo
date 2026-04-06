#!/usr/bin/env node
/**
 * CLI for dispatching tasks from OpenClaw to Gateway via IPC Bridge.
 *
 * Usage:
 *   openclaw-dispatch call <server> <tool> [--args '{"key":"value"}']
 *   openclaw-dispatch task <description> --steps '[{"server":"s","tool":"t","args":{}}]'
 *   openclaw-dispatch ping
 */
import { createLogger } from '@vibetech/logger';
import { OpenClawBridge } from './index.js';

const logger = createLogger('openclaw-dispatch');

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
    // Show help without connecting if no command or help requested
    if (!command || command === 'help' || command === '--help' || command === '-h') {
        logger.info('OpenClaw → Gateway Dispatcher');
        logger.info('');
        logger.info('Commands:');
        logger.info('  call <server> <tool> [--args \'{"key":"val"}\']  Call a single MCP tool');
        logger.info('  task "<description>" --steps \'[...]\'           Dispatch multi-step task');
        logger.info('  ping                                           Test the bridge');
        logger.info('');
        logger.info('Environment:');
        logger.info('  IPC_BRIDGE_URL   WebSocket URL (default: ws://localhost:5004)');
        logger.info('');
        logger.info('Examples:');
        logger.info('  openclaw-dispatch ping');
        logger.info('  openclaw-dispatch call filesystem read_file --args \'{"path":"./README.md"}\'');
        return;
    }

    const bridge = new OpenClawBridge(
        process.env.IPC_BRIDGE_URL ?? 'ws://localhost:5004'
    );

    await bridge.connect();
    logger.info('Connected to IPC Bridge as openclaw');

    try {
        switch (command) {
            case 'call': {
                const server = args[1];
                const tool = args[2];
                if (!server || !tool) {
                    logger.error('Usage: openclaw-dispatch call <server> <tool> [--args \'{"key":"value"}\']');
                    process.exit(1);
                }
                const toolArgs = JSON.parse(getFlag('args') ?? '{}');
                logger.info(`Calling ${server}.${tool}...`);
                const result = await bridge.callTool({ server, tool, args: toolArgs });
                logger.info(`Result (${result.durationMs}ms)`, { success: result.success });
                logger.info(JSON.stringify(result.data ?? result.error, null, 2));
                break;
            }

            case 'task': {
                const description = args[1];
                const stepsJson = getFlag('steps');
                if (!description || !stepsJson) {
                    logger.error('Usage: openclaw-dispatch task "<description>" --steps \'[...]\'');
                    process.exit(1);
                }
                const steps = JSON.parse(stepsJson);
                logger.info(`Dispatching task: "${description}" (${steps.length} steps)...`);
                const result = await bridge.dispatchTask({ description, steps });
                logger.info(`Task ${result.status} (${result.durationMs}ms)`, { status: result.status });
                for (const r of result.results) {
                    logger.info(`Step ${r.stepIndex}: ${r.success ? 'ok' : 'failed'} (${r.durationMs}ms)`);
                    if (r.error) logger.error(`Step ${r.stepIndex} error: ${r.error}`);
                }
                break;
            }

            case 'ping': {
                logger.info('Sending ping via sequential-thinking...');
                const result = await bridge.callTool({
                    server: 'sequential-thinking',
                    tool: 'sequentialthinking',
                    args: {
                        thought: 'Ping from openclaw-dispatch CLI',
                        nextThoughtNeeded: false,
                        thoughtNumber: 1,
                        totalThoughts: 1,
                    },
                });
                logger.info(`${result.success ? 'Pong!' : 'Failed'} (${result.durationMs}ms)`, { success: result.success });
                break;
            }

            default:
                logger.error(`Unknown command: ${command}`);
                logger.error('Run without arguments to see available commands');
                process.exit(1);
        }
    } finally {
        bridge.disconnect();
    }
}

main().catch((err) => {
    logger.error('Fatal error', { error: (err as Error).message });
    process.exit(1);
});
