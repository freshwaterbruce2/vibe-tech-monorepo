/**
 * Production Packaging Verification Tests
 * Tests that verify Electron production builds are correctly packaged and functional
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const shouldRunPackaging = process.env.RUN_PACKAGING_TESTS === 'true';
const run = shouldRunPackaging ? describe : describe.skip;

run('Electron Production Packaging', () => {
  let electronApp: ElectronApplication;
  let appPath: string;
  let resourcesPath: string;
  let distElectronPath: string;

  beforeAll(async () => {
    // Build production version if it doesn't exist (only when explicitly enabled)
    distElectronPath = path.join(__dirname, '../../dist-electron');
    if (!fs.existsSync(distElectronPath)) {
      console.log('Building production version for tests...');
      execSync('pnpm run build:electron', { cwd: path.join(__dirname, '../..'), stdio: 'inherit' });
    }

    // Get paths
    appPath = path.join(distElectronPath, 'win-unpacked');
    resourcesPath = path.join(appPath, 'resources');
  });

  describe('File Structure Verification', () => {
    it('should have correct production build structure', () => {
      // Check main executable
      const exePath = path.join(appPath, 'Vibe Code Studio.exe');
      expect(fs.existsSync(exePath)).toBe(true);

      // Check resources directory
      expect(fs.existsSync(resourcesPath)).toBe(true);

      // Check app.asar
      const asarPath = path.join(resourcesPath, 'app.asar');
      expect(fs.existsSync(asarPath)).toBe(true);

      // Check renderer dist directory (OUTSIDE app.asar)
      const distPath = path.join(resourcesPath, 'dist');
      expect(fs.existsSync(distPath)).toBe(true);

      // Check index.html
      const indexPath = path.join(distPath, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have index.html at correct path (resources/dist/index.html)', () => {
      const indexPath = path.join(resourcesPath, 'dist', 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);

      // Verify content
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('Vibe Code Studio');
      expect(content).toContain('script');
    });

    it('should have unpacked intelligence service files', () => {
      const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');
      expect(fs.existsSync(unpackedPath)).toBe(true);

      // Check for intelligence service (may be in out/main/services/ or .deploy/electron/services/)
      const servicePaths = [
        path.join(unpackedPath, 'out', 'main', 'services', 'intelligence.js'),
        path.join(unpackedPath, 'out', 'main', 'services', 'intelligence.mjs'),
        path.join(unpackedPath, '.deploy', 'electron', 'services', 'intelligence.js'),
        path.join(unpackedPath, '.deploy', 'electron', 'services', 'intelligence.mjs'),
      ];

      const found = servicePaths.some(p => fs.existsSync(p));
      if (!found) {
        console.warn('Intelligence service not found in expected locations (optional):');
        servicePaths.forEach(p => console.warn(`  - ${p}`));
      }
      expect(found || !shouldRunPackaging).toBe(true);
    });

    it('should have unpacked native modules (better-sqlite3)', () => {
      const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');
      const sqlite3Path = path.join(unpackedPath, 'node_modules', 'better-sqlite3');

      expect(fs.existsSync(sqlite3Path)).toBe(true);
    });
  });

  describe('Application Launch', () => {
    it('should launch without errors', async () => {
      const exePath = path.join(appPath, 'Vibe Code Studio.exe');

      electronApp = await electron.launch({
        executablePath: exePath,
        args: ['--no-sandbox', '--disable-gpu'],
        timeout: 30000,
      });

      // Wait for app to be ready
      await electronApp.context().waitForEvent('page', { timeout: 10000 });

      // Get main window
      const windows = electronApp.windows();
      expect(windows.length).toBeGreaterThan(0);
    }, 30000);

    it('should load index.html successfully', async () => {
      const window = electronApp.windows()[0];
      const url = window.url();

      // Should be file:// protocol pointing to index.html
      expect(url).toContain('file://');
      expect(url).toContain('index.html');

      // Should NOT be loading from C:/ root
      expect(url).not.toBe('file:///C:/');
    });

    it('should have correct isDev detection (should be false)', async () => {
      const logs: string[] = [];

      // Capture console logs
      electronApp.on('console', (msg) => {
        logs.push(msg.text());
      });

      // Wait for mode detection log
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for isDev: false
      const modeLog = logs.find(log => log.includes('Mode detection'));
      expect(modeLog).toBeDefined();
      expect(modeLog).toContain('isDev: false');
      expect(modeLog).toContain('isRunningFromAsar: true');
    });

    it('should initialize database on D:\\ drive', async () => {
      const logs: string[] = [];

      electronApp.on('console', (msg) => {
        logs.push(msg.text());
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for D:\ drive detection
      const driveLog = logs.find(log => log.includes('drive detected'));
      expect(driveLog).toBeDefined();
      expect(driveLog).toContain('D:\\');

      // Check database path
      const dbLog = logs.find(log => log.includes('DATABASE_PATH'));
      expect(dbLog).toBeDefined();
      expect(dbLog).toContain('D:\\databases\\database.db');
    });

    it('should have working IPC handlers', async () => {
      const window = electronApp.windows()[0];

      // Test app:getVersion IPC
      const version = await window.evaluate(async () => {
        // @ts-ignore - window.electron is exposed by preload
        return await window.electron.app.getVersion();
      });

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Error Handling', () => {
    it('should not throw "Failed to load URL: file:///C:/" error', async () => {
      const errors: string[] = [];

      electronApp.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check no C:/ loading errors
      const badUrlError = errors.find(err => err.includes('file:///C:/') && err.includes('ERR_FILE_NOT_FOUND'));
      expect(badUrlError).toBeUndefined();
    });

    it('should not have CRITICAL intelligence module errors', async () => {
      const logs: string[] = [];

      electronApp.on('console', (msg) => {
        logs.push(msg.text());
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Intelligence module warnings are acceptable (service may not be needed)
      // But CRITICAL errors mean the module is expected but missing
      const criticalError = logs.find(log =>
        log.includes('CRITICAL') &&
        log.includes('Intelligence entrypoint not found')
      );

      if (criticalError) {
        console.error('Found critical intelligence error:', criticalError);
      }

      // If intelligence is required, fail the test
      // If optional, just warn
      expect(criticalError).toBeUndefined();
    });
  });

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
});
