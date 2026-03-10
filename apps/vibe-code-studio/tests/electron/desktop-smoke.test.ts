/**
 * Desktop Smoke Tests
 * Validate Electron app launches and core UI is present.
 */

// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

describe('Desktop Smoke (Electron)', () => {
  let electronApp: ElectronApplication | null = null;
  let window: Page | null = null;

  const mainPath = path.join(__dirname, '../../dist-electron/main/index.cjs');
  const isBuilt = fs.existsSync(mainPath);
  const run = isBuilt ? it : it.skip;

  beforeAll(async () => {
    if (!isBuilt) {
      return;
    }

    electronApp = await electron.launch({
      args: [mainPath],
      timeout: 30000,
    });

    await electronApp.context().waitForEvent('page', { timeout: 10000 });
    window = electronApp.windows()[0];
  }, 30000);

  run('should render the app container', async () => {
    const appContainer = window!.locator('[data-testid="app-container"]');
    const isVisible = await appContainer.isVisible();
    expect(isVisible).toBe(true);
  });

  run('should show the welcome screen when no workspace is open', async () => {
    const welcomeText = window!
      .locator('text=Where innovation meets elegant design')
      .first();
    const isVisible = await welcomeText.isVisible();
    expect(isVisible).toBe(true);
  });

  run('should expose the preload API', async () => {
    const hasElectronApi = await window!.evaluate(() => {
      return typeof window.electron !== 'undefined';
    });

    expect(hasElectronApi).toBe(true);
  });

  run('should report Apex engine status', async () => {
    const status = await window!.evaluate(async () => {
      return await window.electron.apex.getStatus();
    });

    expect(status).toBeDefined();
    expect(['initializing', 'ready', 'stopped', 'restarting', 'crashed']).toContain(status);
  });

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
});
