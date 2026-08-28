import { test, expect } from '@playwright/test';
import { launchApp, closeApp, waitForStreamLive, type AppFixture } from './fixture';
import { join } from 'node:path';

let fixture: AppFixture;

test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

const MARKER = 'cc-e2e-process-marker';

interface ChunkEvent { processId: string; stream: string; data: string }
interface ExitEvent { id: string; exitCode: number | null; status: string }

test('spawning a process streams stdout chunks and an exit event to the renderer', async () => {
  const { page } = fixture;

  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
  await waitForStreamLive(page);

  const root = join(__dirname, '..', '..');

  // Subscribe to both process streams, then spawn a real node process that prints a
  // marker line and exits 0. Resolve only when the exit event for OUR process id lands,
  // collecting all chunks tagged with that id along the way. Subscriptions are registered
  // before spawn returns, so neither chunk nor exit can be missed.
  const result = await page.evaluate(
    ({ nodeExe, cwd, marker }) =>
      new Promise<{ chunks: ChunkEvent[]; exit: ExitEvent }>((resolve, reject) => {
        const chunks: ChunkEvent[] = [];
        const exits: ExitEvent[] = [];
        let spawnedId: string | null = null;

        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('no process exit within 10s'));
        }, 10_000);

        const unsubChunk = window.commandCenter.stream.subscribe('cc.process.chunk', (p) => {
          chunks.push(p as ChunkEvent);
        });
        const unsubExit = window.commandCenter.stream.subscribe('cc.process.exit', (p) => {
          exits.push(p as ExitEvent);
          tryResolve();
        });

        function cleanup(): void {
          clearTimeout(timer);
          unsubChunk();
          unsubExit();
        }

        function tryResolve(): void {
          if (!spawnedId) return;
          const exit = exits.find((h) => h.id === spawnedId);
          if (exit) {
            cleanup();
            resolve({ chunks: chunks.filter((c) => c.processId === spawnedId), exit });
          }
        }

        void window.commandCenter.process
          .spawn({ command: nodeExe, args: ['-e', `console.log('${marker}')`], cwd, timeoutMs: 15_000 })
          .then((res) => {
            if (!res.ok || !res.data) {
              cleanup();
              reject(new Error('process.spawn returned no handle'));
              return;
            }
            spawnedId = res.data.id;
            tryResolve();
          })
          .catch((e) => {
            cleanup();
            reject(e instanceof Error ? e : new Error(String(e)));
          });
      }),
    { nodeExe: process.execPath, cwd: root, marker: MARKER }
  );

  expect(result.exit.exitCode).toBe(0);
  expect(result.exit.status).toBe('exited');
  expect(result.chunks.some((c) => c.stream === 'stdout' && c.data.includes(MARKER))).toBe(true);
});
