import { test, expect } from '@playwright/test';
import { launchApp, closeApp, waitForStreamLive, type AppFixture } from './fixture';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface StreamEvent { invocationId: string; type: string; subtype?: string; payload: unknown }
interface InvokeResult {
  ok: boolean;
  data?: { success: boolean; exitCode: number | null; sessionId: string | null; resultText: string | null };
}
interface Collected { events: StreamEvent[]; invoke: InvokeResult }

const RESULT_MARKER = 'E2E_CLAUDE_STREAM_OK';
const SESSION_ID = 'e2e-fake-session';

let fixture: AppFixture;
let tmpRoot: string;

/**
 * A fake Claude CLI: ignores its args and prints the stream-json NDJSON shape the real CLI
 * emits, then exits 0. Pointing CLAUDE_JS_PATH at this lets the REAL ClaudeBridge spawn it,
 * parse its output, and broadcast cc.claude.stream — exercising the full renderer -> IPC ->
 * bridge -> WS-hub -> renderer path with no live Claude CLI call (deterministic, free).
 */
function writeFakeClaudeCli(dir: string): string {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: SESSION_ID }),
    JSON.stringify({ type: 'assistant', message: { content: 'working' } }),
    JSON.stringify({
      type: 'result',
      subtype: 'success',
      session_id: SESSION_ID,
      result: RESULT_MARKER,
      total_cost_usd: 0,
      num_turns: 1,
      is_error: false
    })
  ];
  const cliPath = join(dir, 'fake-claude-cli.cjs');
  writeFileSync(
    cliPath,
    `const out=${JSON.stringify(lines)};for(const l of out){process.stdout.write(l+"\\n");}process.exit(0);`
  );
  return cliPath;
}

test.beforeEach(async () => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'cc-claude-e2e-'));
  const cliPath = writeFakeClaudeCli(tmpRoot);
  // NODE_EXE_PATH is pinned to the test runner's node so the bridge's node resolution is
  // deterministic; CLAUDE_JS_PATH redirects cli.js resolution to the fake above.
  fixture = await launchApp({ CLAUDE_JS_PATH: cliPath, NODE_EXE_PATH: process.execPath });
});

test.afterEach(async () => {
  await closeApp(fixture);
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

test('invoking claude streams system + result events to the renderer over cc.claude.stream', async () => {
  const { page } = fixture;

  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
  await waitForStreamLive(page);

  const invocationId = `claude-e2e-${Date.now()}`;

  // Subscribe to cc.claude.stream first, then invoke. Resolve only once BOTH the invoke IPC
  // has returned AND a 'result' stream event for our invocation id has arrived — the WS
  // broadcast can land slightly after the invoke promise resolves, so we wait for both.
  const result = await page.evaluate(
    ({ id, cwd }) =>
      new Promise<Collected>((resolve, reject) => {
        const events: StreamEvent[] = [];
        let invoke: InvokeResult | null = null;
        let sawResult = false;

        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('claude stream did not complete within 15s'));
        }, 15_000);

        const unsub = window.commandCenter.stream.subscribe('cc.claude.stream', (p) => {
          const e = p as StreamEvent;
          if (e.invocationId !== id) return;
          events.push(e);
          if (e.type === 'result') sawResult = true;
          tryResolve();
        });

        function cleanup(): void {
          clearTimeout(timer);
          unsub();
        }

        function tryResolve(): void {
          if (sawResult && invoke) {
            cleanup();
            resolve({ events, invoke });
          }
        }

        void window.commandCenter.claude
          .invoke({ invocationId: id, prompt: 'ping', cwd, allowedTools: ['Read'] })
          .then((res) => {
            invoke = res as InvokeResult;
            tryResolve();
          })
          .catch((err) => {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      }),
    { id: invocationId, cwd: tmpRoot }
  );

  // Stream path: both a system-init and a result event reached the renderer for our invocation.
  expect(result.events.some((e) => e.type === 'system')).toBe(true);
  const resultEvent = result.events.find((e) => e.type === 'result');
  expect(resultEvent).toBeDefined();
  expect((resultEvent!.payload as { result?: string }).result).toBe(RESULT_MARKER);

  // Invoke result: the bridge parsed the same stream into a structured result.
  expect(result.invoke.ok).toBe(true);
  expect(result.invoke.data?.success).toBe(true);
  expect(result.invoke.data?.exitCode).toBe(0);
  expect(result.invoke.data?.sessionId).toBe(SESSION_ID);
  expect(result.invoke.data?.resultText).toBe(RESULT_MARKER);
});
