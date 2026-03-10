/**
 * Smoke test: connects to IPC Bridge and sends a test MCP_TOOL_CALL.
 * Usage: node --import tsx/esm test/smoke-test.ts
 */
import { WebSocket } from 'ws';

const IPC_URL = 'ws://localhost:5004';
const TIMEOUT_MS = 15000;

function makeId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
    console.log('[smoke-test] Connecting to IPC Bridge...');

    return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(IPC_URL);
        const timer = setTimeout(() => {
            console.error('[smoke-test] TIMEOUT — no response received');
            ws.close();
            reject(new Error('Timeout'));
        }, TIMEOUT_MS);

        ws.on('open', () => {
            console.log('[smoke-test] Connected to IPC Bridge');

            // Identify as openclaw
            ws.send(JSON.stringify({
                messageId: makeId(),
                type: 'identify',
                timestamp: Date.now(),
                source: 'openclaw',
                version: '1.0.0',
                payload: { clientType: 'openclaw' },
            }));

            // Send a test MCP_TOOL_CALL — list notebooks via notebooklm
            const callId = makeId();
            const msg = {
                messageId: makeId(),
                type: 'mcp:tool:call',
                timestamp: Date.now(),
                source: 'openclaw',
                target: 'antigravity',
                version: '1.0.0',
                correlationId: callId,
                payload: {
                    callId,
                    server: 'sequential-thinking',
                    tool: 'sequentialthinking',
                    args: {
                        thought: 'This is a smoke test from the OpenClaw-Antigravity bridge integration test.',
                        nextThoughtNeeded: false,
                        thoughtNumber: 1,
                        totalThoughts: 1,
                    },
                },
            };

            console.log(`[smoke-test] Sending MCP_TOOL_CALL: sequential-thinking.sequentialthinking`);
            ws.send(JSON.stringify(msg));
        });

        ws.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            console.log(`[smoke-test] Received: type=${data.type}`);

            if (data.type === 'mcp:tool:result') {
                console.log('[smoke-test] ✅ SUCCESS — Got MCP_TOOL_RESULT back!');
                console.log(`[smoke-test] Success: ${data.payload?.success}`);
                if (data.payload?.data) {
                    console.log(`[smoke-test] Data: ${JSON.stringify(data.payload.data).slice(0, 200)}...`);
                }
                if (data.payload?.error) {
                    console.log(`[smoke-test] Error: ${data.payload.error}`);
                }
                clearTimeout(timer);
                ws.close();
                resolve();
            }
        });

        ws.on('error', (err) => {
            console.error(`[smoke-test] WebSocket error: ${err.message}`);
            clearTimeout(timer);
            reject(err);
        });

        ws.on('close', () => {
            console.log('[smoke-test] Disconnected');
        });
    });
}

main()
    .then(() => {
        console.log('[smoke-test] Test complete');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[smoke-test] Test failed:', err.message);
        process.exit(1);
    });
