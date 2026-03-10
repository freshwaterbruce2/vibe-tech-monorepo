#!/usr/bin/env node
/**
 * CLI for dispatching tasks from OpenClaw to Antigravity via IPC Bridge.
 *
 * Usage:
 *   openclaw-dispatch call <server> <tool> [--args '{"key":"value"}']
 *   openclaw-dispatch task <description> --steps '[{"server":"s","tool":"t","args":{}}]'
 *   openclaw-dispatch ping
 */
import { OpenClawBridge } from './index.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
    // Show help without connecting if no command or help requested
    if (!command || command === 'help' || command === '--help' || command === '-h') {
        console.log('OpenClaw → Antigravity Dispatcher');
        console.log('');
        console.log('Commands:');
        console.log('  call <server> <tool> [--args \'{"key":"val"}\']  Call a single MCP tool');
        console.log('  task "<description>" --steps \'[...]\'           Dispatch multi-step task');
        console.log('  ping                                           Test the bridge');
        console.log('');
        console.log('Environment:');
        console.log('  IPC_BRIDGE_URL   WebSocket URL (default: ws://localhost:5004)');
        console.log('');
        console.log('Examples:');
        console.log('  openclaw-dispatch ping');
        console.log('  openclaw-dispatch call filesystem read_file --args \'{"path":"./README.md"}\'');
        return;
    }

    const bridge = new OpenClawBridge(
        process.env.IPC_BRIDGE_URL ?? 'ws://localhost:5004'
    );

    await bridge.connect();
    console.log('✅ Connected to IPC Bridge as openclaw');

    try {
        switch (command) {
            case 'call': {
                const server = args[1];
                const tool = args[2];
                if (!server || !tool) {
                    console.error('Usage: openclaw-dispatch call <server> <tool> [--args \'{"key":"value"}\']');
                    process.exit(1);
                }
                const toolArgs = JSON.parse(getFlag('args') ?? '{}');
                console.log(`📡 Calling ${server}.${tool}...`);
                const result = await bridge.callTool({ server, tool, args: toolArgs });
                console.log(`${result.success ? '✅' : '❌'} Result (${result.durationMs}ms):`);
                console.log(JSON.stringify(result.data ?? result.error, null, 2));
                break;
            }

            case 'task': {
                const description = args[1];
                const stepsJson = getFlag('steps');
                if (!description || !stepsJson) {
                    console.error('Usage: openclaw-dispatch task "<description>" --steps \'[...]\'');
                    process.exit(1);
                }
                const steps = JSON.parse(stepsJson);
                console.log(`📋 Dispatching task: "${description}" (${steps.length} steps)...`);
                const result = await bridge.dispatchTask({ description, steps });
                console.log(`${result.status === 'success' ? '✅' : '⚠️'} Task ${result.status} (${result.durationMs}ms)`);
                for (const r of result.results) {
                    console.log(`  Step ${r.stepIndex}: ${r.success ? '✅' : '❌'} (${r.durationMs}ms)`);
                    if (r.error) console.log(`    Error: ${r.error}`);
                }
                break;
            }

            case 'ping': {
                console.log('🏓 Sending ping via sequential-thinking...');
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
                console.log(`${result.success ? '✅ Pong!' : '❌ Failed'} (${result.durationMs}ms)`);
                break;
            }

            default:
                console.error(`Unknown command: ${command}`);
                console.error('Run without arguments to see available commands');
                process.exit(1);
        }
    } finally {
        bridge.disconnect();
    }
}

main().catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
