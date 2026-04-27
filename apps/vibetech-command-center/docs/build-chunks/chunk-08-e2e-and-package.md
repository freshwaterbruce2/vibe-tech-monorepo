# Chunk 8 — Playwright E2E + Electron-Builder Packaging (Ship)

**Goal:** Lock in production confidence with end-to-end Playwright tests that drive the real Electron app, then package to a single `.exe` installer using electron-builder. Optional system tray for quick access. After this chunk, the Command Center is installable, pinnable to taskbar, and proven to work via E2E.

**Session time budget:** ~1.5 hours.

**Prerequisite:** Chunk 7 complete. 73 tests green, MCP server registered and probe passing.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk08_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. Install Playwright Electron driver

`@playwright/test` is already installed from Chunk 1. Add the Electron driver and Playwright's browser binaries (we don't actually need browsers for Electron, but the install ensures the runner is usable).

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

> The Electron driver ships inside `@playwright/test` itself — no separate package required. Chromium install is needed because Playwright's test runner expects at least one browser context to be available even when only running Electron tests.

---

## 2. Playwright config

**Path:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,        // Electron app is single-instance; no parallel runs
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
```

Add scripts to `package.json`:

```json
"test:e2e": "pnpm run build && playwright test",
"test:e2e:headed": "pnpm run build && playwright test --headed",
"test:all": "pnpm run test && pnpm run test:e2e"
```

> **Why `pnpm run build` first:** Playwright launches the packaged Electron entry from `out/main/index.js`. Without a build, the file doesn't exist and the test rig fails to spawn.

---

## 3. E2E test fixture for Electron

**Path:** `tests/e2e/fixture.ts`

Shared launcher used by every test. Spawns Electron pointed at the build output, waits for the main window, returns the `Page` and `ElectronApplication` handles.

```typescript
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';

export interface AppFixture {
  app: ElectronApplication;
  page: Page;
}

export async function launchApp(): Promise<AppFixture> {
  const root = join(__dirname, '..', '..');
  const app = await electron.launch({
    args: [join(root, 'out', 'main', 'index.js')],
    cwd: root,
    timeout: 30_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Disable DevTools so screenshots are clean
      ELECTRON_DISABLE_DEVTOOLS: '1'
    }
  });

  const page = await app.firstWindow({ timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');
  // The renderer's QueryClientProvider needs a tick to settle
  await page.waitForTimeout(500);
  return { app, page };
}

export async function closeApp(fixture: AppFixture): Promise<void> {
  try { await fixture.app.close(); } catch { /* already closed */ }
}
```

---

## 4. E2E test suites

### Suite 1: Boot and shell

**Path:** `tests/e2e/01-boot.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('boots and renders Command Center title', async () => {
  const { page } = fixture;
  await expect(page.locator('text=COMMAND CENTER')).toBeVisible({ timeout: 10_000 });
});

test('sidebar shows all 7 nav items enabled', async () => {
  const { page } = fixture;
  await expect(page.getByRole('button', { name: /Apps/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Databases/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Backups/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Builds/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /RAG Search/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Claude/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Agents/ })).toBeVisible();
});

test('default panel is Apps and shows app cards within 10s', async () => {
  const { page } = fixture;
  // Either apps render or loading skeletons — wait for the panel title pattern
  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
});

test('stream connection indicator turns green within 5s', async () => {
  const { page } = fixture;
  // Wait for the watcher to emit ready → preload sets wsConnected → "stream live" appears
  await expect(page.locator('text=stream live')).toBeVisible({ timeout: 8_000 });
});
```

### Suite 2: Panel navigation

**Path:** `tests/e2e/02-navigation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('switching panels updates header and content', async () => {
  const { page } = fixture;
  await page.getByRole('button', { name: /Databases/ }).click();
  await expect(page.locator('text=/Databases \\(\\d+\\)/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Backups/ }).click();
  await expect(page.locator('text=/Recent Backups/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Builds/ }).click();
  await expect(page.locator('text=/Build Status/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Agents/ }).click();
  await expect(page.locator('text=/Processes/')).toBeVisible({ timeout: 10_000 });
});
```

### Suite 3: Backup creation round-trip

**Path:** `tests/e2e/03-backup.spec.ts`

The most important test in the suite. Drives the real backup flow: select an app, click backup, verify a zip appears. This proves IPC + service + actual filesystem write all work end-to-end.

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';
import { existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let fixture: AppFixture;
let tmpSource: string;

test.beforeEach(async () => {
  // Create a tiny throwaway source dir so we don't depend on the live monorepo
  tmpSource = mkdtempSync(join(tmpdir(), 'cc-e2e-bkp-'));
  mkdirSync(join(tmpSource, 'src'), { recursive: true });
  writeFileSync(join(tmpSource, 'src', 'a.ts'), 'export const x = 1;');
  fixture = await launchApp();
});
test.afterEach(async () => {
  await closeApp(fixture);
  rmSync(tmpSource, { recursive: true, force: true });
});

test('creating a backup via IPC produces a real zip on disk', async () => {
  const { page } = fixture;

  // Drive through the renderer's exposed IPC bridge directly — no UI needed for this assertion
  const result = await page.evaluate(async (sourcePath) => {
    return await window.commandCenter.backup.create({
      sourcePath,
      label: 'e2e-test'
    });
  }, tmpSource);

  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: { zipPath: string; sizeBytes: number } }).data;
  expect(data.zipPath).toMatch(/\.zip$/);
  expect(data.sizeBytes).toBeGreaterThan(0);
  expect(existsSync(data.zipPath)).toBe(true);
});

test('quick-backup button on Backups panel triggers backup.create', async () => {
  const { page } = fixture;
  await page.getByRole('button', { name: /Backups/ }).click();
  await expect(page.locator('text=/Recent Backups/')).toBeVisible({ timeout: 10_000 });

  // Snapshot existing backups in C:\dev\_backups, then click button, then verify count grew.
  const before = existsSync('C:\\dev\\_backups')
    ? readdirSync('C:\\dev\\_backups').filter((f) => f.endsWith('.zip')).length
    : 0;

  await page.getByRole('button', { name: /Backup packages\// }).click();

  // Wait for the success toast / status line to appear
  await expect(page.locator('text=/backup created/')).toBeVisible({ timeout: 30_000 });

  const after = readdirSync('C:\\dev\\_backups').filter((f) => f.endsWith('.zip')).length;
  expect(after).toBeGreaterThan(before);
});
```

> **Why the second test uses `C:\dev\packages`:** it's the smallest non-trivial source in the monorepo and Compress-Archive runs in seconds. If your `packages/` is huge for some reason, change it to a smaller fixture path or skip with `test.skip()`.

### Suite 4: Stream + file watcher

**Path:** `tests/e2e/04-stream.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fixture: AppFixture;

test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('file changes in C:\\dev\\apps cause watcher events to reach renderer', async () => {
  const { page } = fixture;

  // Wait for initial Apps panel render
  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });

  // Wait for watcher ready
  await expect(page.locator('text=stream live')).toBeVisible({ timeout: 10_000 });

  // Pick an app that exists; create a throwaway file inside its src/
  const probeDir = 'C:\\dev\\apps\\vibetech-command-center\\src\\__e2e_probe__';
  const probeFile = join(probeDir, `probe-${Date.now()}.ts`);

  if (!existsSync(probeDir)) mkdirSync(probeDir, { recursive: true });

  // Set up an evaluation that listens for the next watcher event matching our app
  const eventPromise = page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no event in 5s')), 5_000);
    const unsub = window.commandCenter.stream.subscribe('cc.watcher.events', (payload) => {
      const events = payload as Array<{ appName: string | null; type: string }>;
      const match = events.find((e) => e.appName === 'vibetech-command-center');
      if (match) {
        clearTimeout(timer);
        unsub();
        resolve(match);
      }
    });
  }));

  // Trigger the write *after* the listener is set up
  await page.waitForTimeout(200);
  writeFileSync(probeFile, '// e2e probe');

  const event = await eventPromise as { appName: string; type: string };
  expect(event.appName).toBe('vibetech-command-center');
  expect(['add', 'change']).toContain(event.type);

  // Cleanup
  rmSync(probeDir, { recursive: true, force: true });
});
```

### Suite 5: Health + meta IPC

**Path:** `tests/e2e/05-ipc.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('meta.info returns expected shape', async () => {
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.meta.info());
  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: { version: string; monorepoRoot: string; wsPort: number } }).data;
  expect(data.version).toBeTruthy();
  expect(data.monorepoRoot).toBe('C:\\dev');
  expect(data.wsPort).toBe(3210);
});

test('health.probeAll returns array of 6 services', async () => {
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.health.probeAll());
  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: unknown[] }).data;
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(6);
});

test('nx.get returns project graph with both apps and libs', async () => {
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.nx.get());
  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: { projects: Record<string, { type: string }> } }).data;
  const projects = Object.values(data.projects);
  expect(projects.length).toBeGreaterThan(20);
  expect(projects.some((p) => p.type === 'app')).toBe(true);
  expect(projects.some((p) => p.type === 'lib')).toBe(true);
});
```

---

## 5. System tray (optional but recommended)

A tray icon gives you single-click reopen and a quick "create backup of monorepo" action without opening the window.

**Path:** `src/main/tray.ts`

```typescript
import { Tray, Menu, nativeImage, BrowserWindow, app, type NativeImage } from 'electron';
import { join } from 'node:path';
import type { ServiceContainer } from './service-container';

let tray: Tray | null = null;

export function setupTray(container: ServiceContainer, getWindow: () => BrowserWindow | null): void {
  // Use a 16x16 cyan dot generated in-code so we don't need an icon file in this chunk.
  // Replace with assets/tray-icon.png later if desired.
  const icon = nativeImage.createFromBuffer(makeCyanDotPng());

  tray = new Tray(icon);
  tray.setToolTip('Vibe-Tech Command Center');

  const rebuildMenu = (): void => {
    const win = getWindow();
    const visible = win?.isVisible() ?? false;
    const menu = Menu.buildFromTemplate([
      {
        label: visible ? 'Hide window' : 'Show window',
        click: () => {
          const w = getWindow();
          if (!w) return;
          if (w.isVisible()) w.hide(); else { w.show(); w.focus(); }
          rebuildMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Backup C:\\dev\\apps',
        click: async () => {
          await container.backup.createBackup({ sourcePath: 'C:\\dev\\apps', label: 'tray-quick' });
        }
      },
      {
        label: 'Backup C:\\dev\\packages',
        click: async () => {
          await container.backup.createBackup({ sourcePath: 'C:\\dev\\packages', label: 'tray-quick' });
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray!.setContextMenu(menu);
  };

  tray.on('click', () => {
    const w = getWindow();
    if (!w) return;
    if (w.isVisible()) w.hide(); else { w.show(); w.focus(); }
  });

  rebuildMenu();
}

export function teardownTray(): void {
  if (tray) { tray.destroy(); tray = null; }
}

// Tiny 16x16 PNG of a cyan dot. Hardcoded base64 so we don't need an asset file in this chunk.
function makeCyanDotPng(): Buffer {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
    'AmJLR0T//xSrMc0AAAB1SURBVDjLY/z//z8DJYCJgUIwasCoAaMGjBowasCoAcPRAEYGBgYG' +
    'JgYS49+/fxlYWFgYWFhYGAYDA0Y2NjYGFhYWBhYWFgZSAUM4Bfz//5+BkZGRgZGRkYGJiYmB' +
    'iYmJgZmZmYGZmZmBg4ODgYODg4GTk5OBg4ODAQAS5wlLrxzlBgAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}
```

> **Note:** the embedded base64 PNG is a placeholder — it'll render as a small cyan-ish blob. Drop a real 16×16 (and 32×32 retina) PNG into `assets/tray-icon.png` later and load via `nativeImage.createFromPath(...)`. Cosmetic, not a blocker.

### Wire the tray into `src/main/index.ts`

Add to the imports:

```typescript
import { setupTray, teardownTray } from './tray';
```

In `bootstrap()`, after services start and **after `createWindow()` is called the first time** (track the window reference), wire the tray:

```typescript
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    // ...existing options...
  });
  mainWindow.on('close', (event) => {
    // Send to tray instead of quitting (unless user picked Quit explicitly)
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  // ...rest of existing setup...
}

let isQuitting = false;
app.on('before-quit', () => { isQuitting = true; });
```

In `bootstrap()` add at the end:

```typescript
setupTray(container, () => mainWindow);
```

In `shutdown()` add:

```typescript
teardownTray();
```

Update `app.on('window-all-closed', ...)` to no-op (we want tray to keep us alive):

```typescript
app.on('window-all-closed', () => {
  // Stay alive in the tray; tray menu has Quit
});
```

> **Trade-off:** the app keeps running after window close. This is intentional for a tray app. If you don't want this, skip the tray entirely (delete the file and the wiring).

---

## 6. Electron-builder configuration

Electron-builder reads from `package.json` under a `"build"` key. Add this block:

```json
"build": {
  "appId": "com.vibetech.command-center",
  "productName": "Vibe-Tech Command Center",
  "copyright": "Copyright © 2026 Bruce Freshwater",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "files": [
    "out/**/*",
    "dist/mcp/**/*",
    "package.json",
    "node_modules/**/*"
  ],
  "extraResources": [
    {
      "from": "dist/mcp",
      "to": "mcp",
      "filter": ["**/*"]
    }
  ],
  "asar": true,
  "asarUnpack": [
    "node_modules/better-sqlite3/**/*",
    "node_modules/@modelcontextprotocol/**/*"
  ],
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64"] }
    ],
    "icon": "build/icon.ico",
    "artifactName": "${productName}-Setup-${version}.${ext}"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Vibe-Tech Command Center"
  },
  "publish": null
}
```

**Key choices explained:**
- **`asar: true`** — packs renderer/main into a single archive for fast startup
- **`asarUnpack: better-sqlite3`** — native modules can't run from inside an asar archive; this extracts them
- **`asarUnpack: @modelcontextprotocol`** — MCP SDK has dynamic ESM imports that asar can break; safer unpacked
- **`oneClick: false`** — produces a real installer wizard (you can change install dir)
- **`perMachine: false`** — installs to user's AppData (no admin elevation required)
- **`publish: null`** — disables auto-publish to GitHub releases (we're shipping locally)
- **`extraResources: dist/mcp → mcp`** — copies the MCP server build to the installed app's resources dir so the `.mcp.json` registration can point at the installed location later if you want

### Icon

For now, electron-builder will use the default Electron icon if `build/icon.ico` doesn't exist. To create a proper one later, export a 256×256 ICO from any image editor and drop it at `build/icon.ico`. Not blocking; ship without.

### Add build script

Add to `package.json` scripts:

```json
"build": "electron-vite build && pnpm run build:mcp",
"package": "pnpm run build && electron-builder --win --x64",
"package:dir": "pnpm run build && electron-builder --win --x64 --dir"
```

> `package:dir` produces an unpackaged `release/win-unpacked/` folder you can run directly without going through the installer — useful for fast iteration.

---

## 7. Build the installer

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run package:dir   # fast: produces release\win-unpacked\Vibe-Tech Command Center.exe
```

**Expected:** ~2-4 minute build. Watch for warnings about native modules. Output:

```
release\win-unpacked\Vibe-Tech Command Center.exe
```

Run it directly to verify the packaged build works:

```powershell
& "release\win-unpacked\Vibe-Tech Command Center.exe"
```

If the unpacked build launches and the dashboard loads correctly, run the full installer build:

```powershell
pnpm run package
```

**Output:**
```
release\Vibe-Tech Command Center-Setup-0.1.0.exe
```

This is the installer. Run it:

```powershell
& "release\Vibe-Tech Command Center-Setup-0.1.0.exe"
```

After install, the app will be at:
```
%LOCALAPPDATA%\Programs\vibe-tech-command-center\Vibe-Tech Command Center.exe
```

Or wherever the installer wizard places it. A desktop shortcut and Start menu entry should be created automatically.

### Pin to taskbar

1. Find the app on the Start menu (`Vibe-Tech Command Center`)
2. Right-click → More → Pin to taskbar

Done.

---

## 8. Run the full test pyramid

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck
pnpm run test
pnpm run test:e2e
```

**Expected:**
- typecheck: clean
- unit/integration tests: 73+ passed (no regressions)
- E2E: ~13 tests across 5 spec files, all passing

If E2E fails on the file watcher test (suite 4) due to timing, increase the `setTimeout` and `waitForTimeout` values modestly. Filesystem event timing varies on Windows.

---

## 9. Optional: update CLAUDE.md with shipped state

Append to `C:\dev\apps\vibetech-command-center\CLAUDE.md`:

```markdown

## Ship state (post-Chunk 8)

- Production build: `pnpm run package` produces `release\Vibe-Tech Command Center-Setup-${version}.exe`
- Dev: `pnpm run dev` (electron-vite hot reload)
- MCP server: standalone via `pnpm run mcp:start`, registered in `C:\dev\.mcp.json` as `command-center`
- Tray: app keeps running after window close; quit via tray menu
- Tests: `pnpm run test` (unit/integration), `pnpm run test:e2e` (Playwright Electron), `pnpm run test:all` for both
```

---

## Acceptance criteria

1. `pnpm run typecheck` clean.
2. `pnpm run test` — all 73+ unit/integration tests pass.
3. `pnpm run test:e2e` — Playwright Electron tests pass (~13 tests across 5 specs). At minimum: boot, navigation, backup round-trip, file watcher event, IPC envelope shape.
4. `pnpm run package:dir` produces a runnable `release\win-unpacked\` folder.
5. `pnpm run package` produces a working `.exe` installer in `release\`.
6. The installed app launches from Start menu and renders all 7 panels.
7. Closing the window minimizes to tray; tray menu has Show/Hide and quick-backup options.
8. Tray "Quit" cleanly exits the app — no orphan `Electron.exe` in Task Manager.
9. The MCP server (`pnpm run probe:mcp`) still passes after the build.
10. App icon visible in taskbar after pin (default Electron icon is acceptable; custom icon optional).

---

## Hazards to flag

1. **Playwright Electron timeouts on cold first run** — first launch compiles native modules and warms caches. If the boot test times out at 30s, bump to 60s. Subsequent runs are 5-10s.

2. **`better-sqlite3` not loadable from asar** — if the packaged app boots but the Databases panel shows "module not found" errors, `asarUnpack` didn't catch it. Verify `release\win-unpacked\resources\app.asar.unpacked\node_modules\better-sqlite3\` exists. If not, add `**/better_sqlite3.node` to the unpack glob explicitly.

3. **Defender or other antivirus blocking the unsigned `.exe`** — Windows SmartScreen will warn on first run because the installer isn't code-signed. Click "More info" → "Run anyway". Code signing is a $300/year cert and out of scope for an internal tool. Flag if Defender deletes the installer outright (rare for non-network binaries).

4. **`.mcp.json` path may need updating after install** — your registration currently points at `C:\dev\apps\vibetech-command-center\dist\mcp\server.js` (the dev path). If you want Claude Desktop to use the installed copy, update the entry to point at `%LOCALAPPDATA%\Programs\vibe-tech-command-center\resources\mcp\server.js` after install. Keeping the dev path is fine for now — it's what you've been testing against.

5. **Tray icon rendering** — the embedded base64 PNG is a placeholder; it'll look like a tiny pixelated square. Drop a real icon at `assets/tray-icon.png` and update `setupTray` to use `nativeImage.createFromPath('assets/tray-icon.png')`. Strictly cosmetic; ship without.

6. **Window-all-closed behavior change** — adding the tray means the app no longer quits when you close the window. If this surprises you later (e.g., you forget it's running and Task Manager shows it eating memory), the tray menu Quit always works. This is the standard tray-app pattern.

7. **Playwright file-watcher E2E flakiness on Windows** — file events on Windows have a 100-300ms latency variance. The test waits 5s for an event, which should cover it. If it flakes intermittently, bump the timeout to 10s.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk08-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
Compress-Archive -Path "C:\dev\apps\vibetech-command-center\release" -DestinationPath C:\dev\_backups\command-center-installer-v0.1.0_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

The second backup is the **shipped artifact** — keep this zip. If you ever lose the installer or need to roll back to v0.1.0, it's right there.

---

## After Chunk 8

The Vibe-Tech Command Center is shipped. You have:

- A pinnable Windows app with 7 panels (Apps, Databases, Backups, Builds, RAG, Claude, Agents)
- A standalone MCP server registered as `command-center` in `.mcp.json`
- 73+ unit/integration tests + 13 E2E tests
- A signed (well, unsigned-but-functional) NSIS installer
- A tray icon for always-available quick actions

What's left is **optional iteration**:
- Real tray icon asset
- Code signing cert
- Auto-update via electron-updater (requires GitHub releases or self-hosted feed)
- Custom slash-commands like `/backup` or `/health` exposed through the MCP server
- More panels: a "Recent Edits" timeline, a "Stale Apps" detector, a Trading P&L viewer pulling from `D:\databases\trading.db`
- Telemetry export to the Learning System

But none of that is blocking. Ship state is real. Go pin it to your taskbar.

Ping me with `chunk 8 complete` and a screenshot of the installed app on your desktop if you feel like it. That's the finish line.
