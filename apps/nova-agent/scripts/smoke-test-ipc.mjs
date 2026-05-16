/**
 * Smoke test: Nova-Agent ↔ Vibe Code Studio IPC bridge
 *
 * This script acts as a minimal vibe-code-studio server on port 5004 and
 * verifies that nova-agent (the WS client) connects and exchanges messages
 * according to the @vibetech/shared-ipc protocol.
 *
 * Requirements:
 *   - DEEPCODE_IPC_ENABLED=true must be set when nova-agent starts
 *     (src-tauri/.env already has this set for dev mode)
 *   - Port 5004 must be free (stop vibe-code-studio before running)
 *
 * Usage (two terminals):
 *   Terminal 1:  pnpm --filter nova-agent test:ipc-smoke   ← starts server, waits
 *   Terminal 2:  pnpm nx dev nova-agent                    ← nova-agent connects
 *
 * Or if nova-agent is already running with DEEPCODE_IPC_ENABLED=true, just run
 * the smoke test — it will catch the next reconnect attempt (≤30s backoff).
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more tests failed
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WebSocketServer, WebSocket } = require('ws');

const PORT = 5004;
const CONNECT_TIMEOUT_MS = 60_000; // 60s to cover tauri dev compile + boot time
const TEST_DURATION_MS = 5_000;
const SOURCE = 'vibe';

function makeId() {
    return `${SOURCE}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeMessage(type, payload) {
    return JSON.stringify({
        messageId: makeId(),
        type,
        timestamp: Date.now(),
        source: SOURCE,
        target: 'nova',
        version: '1.0.0',
        payload,
    });
}

async function runSmokeTest() {
    console.log('[ipc-smoke] Nova ↔ Vibe Code Studio IPC bridge smoke test');
    console.log(`[ipc-smoke] Starting mock server on ws://127.0.0.1:${PORT}`);
    console.log('[ipc-smoke] Waiting for nova-agent to connect...\n');

    const results = [];
    let passed = 0;
    let failed = 0;

    const pass = (name) => {
        passed++;
        results.push({ name, ok: true });
        console.log(`  PASS  ${name}`);
    };

    const fail = (name, reason) => {
        failed++;
        results.push({ name, ok: false, reason });
        console.error(`  FAIL  ${name}  →  ${reason}`);
    };

    return new Promise((resolve, reject) => {
        const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });

        let connectTimer;
        let testTimer;

        const finish = (success, reason) => {
            clearTimeout(connectTimer);
            clearTimeout(testTimer);
            wss.clients.forEach((c) => {
                if (c.readyState === WebSocket.OPEN) c.close();
            });
            wss.close(() => {
                if (success) resolve({ passed, failed, results });
                else reject(new Error(reason));
            });
        };

        wss.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(
                    `[ipc-smoke] ERROR: Port ${PORT} is already in use.\n` +
                    `[ipc-smoke] Stop vibe-code-studio (or any other WS server on :${PORT}) first.`
                );
            }
            reject(err);
        });

        // Fail if nova-agent doesn't connect in time
        connectTimer = setTimeout(() => {
            fail('nova-agent connects within 15s', 'connection timeout — is nova-agent running?');
            finish(false, 'nova-agent did not connect within 15s');
        }, CONNECT_TIMEOUT_MS);

        wss.on('connection', (ws, req) => {
            clearTimeout(connectTimer);
            const addr = req.socket.remoteAddress ?? 'unknown';
            console.log(`[ipc-smoke] Connected: ${addr}\n`);

            pass('nova-agent connects to port 5004');

            const received = new Set();

            ws.on('message', (raw) => {
                const text = raw.toString();
                let msg;

                try {
                    msg = JSON.parse(text);
                } catch {
                    fail('messages are valid JSON', `parse error on: ${text.slice(0, 80)}`);
                    return;
                }

                const { type, payload, source } = msg;
                console.log(`  recv  type=${type}  source=${source ?? '?'}`);

                if (type === 'bridge:status' && !received.has('bridge:status')) {
                    received.add('bridge:status');
                    const hasShape =
                        payload?.connected === true &&
                        typeof payload?.client_id === 'string' &&
                        typeof payload?.timestamp === 'number';

                    if (hasShape) {
                        pass('bridge:status has correct shape (connected, client_id, timestamp)');
                    } else {
                        fail('bridge:status has correct shape', `got: ${JSON.stringify(payload)}`);
                    }
                }
            });

            ws.on('error', (err) => {
                console.error(`[ipc-smoke] WS error: ${err.message}`);
            });

            ws.on('close', () => {
                console.log('[ipc-smoke] Nova-agent disconnected');
            });

            // T+500ms: push context:update to nova-agent
            setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) return;
                ws.send(
                    makeMessage('context:update', {
                        project: 'smoke-test',
                        path: 'C:\\dev\\apps\\nova-agent',
                        language: 'rust',
                        activity: 'ipc-smoke-test',
                    })
                );
                console.log('  send  context:update → nova-agent');
                pass('server can push context:update to nova-agent');
            }, 500);

            // T+1s: push bridge:status acknowledgement
            setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) return;
                ws.send(
                    makeMessage('bridge:status', {
                        connected: true,
                        client_id: 'vibe-smoke-test',
                        timestamp: Math.floor(Date.now() / 1000),
                    })
                );
                console.log('  send  bridge:status → nova-agent');
            }, 1000);

            // T+TEST_DURATION_MS: evaluate and finish
            testTimer = setTimeout(() => {
                if (!received.has('bridge:status')) {
                    fail(
                        'nova-agent sends bridge:status on connect',
                        'bridge:status never received'
                    );
                }

                if (ws.readyState === WebSocket.OPEN) {
                    pass('connection stays open for 5s');
                } else {
                    fail('connection stays open for 5s', 'connection dropped prematurely');
                }

                finish(failed === 0, `${failed} test(s) failed`);
            }, TEST_DURATION_MS);
        });
    });
}

runSmokeTest()
    .then(({ passed, failed, results }) => {
        console.log('\n─────────────────────────────────────────');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        for (const r of results) {
            const icon = r.ok ? '✓' : '✗';
            const tail = r.reason ? `  (${r.reason})` : '';
            console.log(`  ${icon} ${r.name}${tail}`);
        }
        console.log('─────────────────────────────────────────');
        process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
        console.error(`\n[ipc-smoke] Fatal: ${err.message}`);
        process.exit(1);
    });
