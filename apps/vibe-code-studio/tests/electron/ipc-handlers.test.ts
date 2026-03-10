/**
 * IPC Handlers Tests
 * Tests that verify all IPC handlers are properly exposed and functional
 */

import { describe, it, expect } from 'vitest';
import { _electron as electron, ElectronApplication } from 'playwright';
import path from 'path';
import fs from 'fs';

const mainPath = path.join(__dirname, '../../dist-electron/main/index.cjs');
const hasBuild = fs.existsSync(mainPath);
const run = hasBuild ? describe : describe.skip;

run('Electron IPC Handlers', () => {
  let electronApp: ElectronApplication;

  beforeAll(async () => {
    electronApp = await electron.launch({
      args: [mainPath],
      timeout: 30000,
    });

    await electronApp.context().waitForEvent('page', { timeout: 10000 });
  }, 30000);

  describe('Preload API Exposure', () => {
    it('should expose window.electron object', async () => {
      const window = electronApp.windows()[0];

      const hasElectron = await window.evaluate(() => {
        return typeof window.electron !== 'undefined';
      });

      expect(hasElectron).toBe(true);
    });

    it('should expose window.electron.ipc with all required methods', async () => {
      const window = electronApp.windows()[0];

      const ipcMethods = await window.evaluate(() => {
        const { ipc } = window.electron;
        return {
          hasSend: typeof ipc.send === 'function',
          hasInvoke: typeof ipc.invoke === 'function',
          hasOn: typeof ipc.on === 'function',
          hasOnce: typeof ipc.once === 'function',
          hasRemoveAllListeners: typeof ipc.removeAllListeners === 'function',
        };
      });

      expect(ipcMethods.hasSend).toBe(true);
      expect(ipcMethods.hasInvoke).toBe(true);
      expect(ipcMethods.hasOn).toBe(true);
      expect(ipcMethods.hasOnce).toBe(true);
      expect(ipcMethods.hasRemoveAllListeners).toBe(true);
    });

    it('should throw error for invalid IPC channels', async () => {
      const window = electronApp.windows()[0];

      const error = await window.evaluate(async () => {
        try {
          // @ts-ignore - testing invalid channel
          await window.electron.ipc.invoke('invalidChannel');
          return null;
        } catch (err) {
          return err.message;
        }
      });

      expect(error).toBeDefined();
      expect(error).toContain('Invalid IPC channel');
    });
  });

  describe('App IPC Handlers', () => {
    it('should handle app:getVersion', async () => {
      const window = electronApp.windows()[0];

      const version = await window.evaluate(async () => {
        return await window.electron.app.getVersion();
      });

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should handle app:getPath', async () => {
      const window = electronApp.windows()[0];

      const userDataPath = await window.evaluate(async () => {
        return await window.electron.app.getPath('userData');
      });

      expect(userDataPath).toBeDefined();
      expect(typeof userDataPath).toBe('string');
      expect(userDataPath).toContain('vibe-code-studio');
    });
  });

  describe('Dialog IPC Handlers', () => {
    it('should expose dialog methods', async () => {
      const window = electronApp.windows()[0];

      const dialogMethods = await window.evaluate(() => {
        const { dialog } = window.electron;
        return {
          hasOpenFolder: typeof dialog.openFolder === 'function',
          hasOpenFile: typeof dialog.openFile === 'function',
          hasSaveFile: typeof dialog.saveFile === 'function',
          hasShowMessage: typeof dialog.showMessage === 'function',
        };
      });

      expect(dialogMethods.hasOpenFolder).toBe(true);
      expect(dialogMethods.hasOpenFile).toBe(true);
      expect(dialogMethods.hasSaveFile).toBe(true);
      expect(dialogMethods.hasShowMessage).toBe(true);
    });
  });

  describe('File System IPC Handlers', () => {
    it('should expose fs methods', async () => {
      const window = electronApp.windows()[0];

      const fsMethods = await window.evaluate(() => {
        const { fs } = window.electron;
        return {
          hasReadFile: typeof fs.readFile === 'function',
          hasWriteFile: typeof fs.writeFile === 'function',
          hasExists: typeof fs.exists === 'function',
          hasReadDir: typeof fs.readDir === 'function',
          hasCreateDir: typeof fs.createDir === 'function',
          hasRemove: typeof fs.remove === 'function',
          hasRename: typeof fs.rename === 'function',
          hasStat: typeof fs.stat === 'function',
        };
      });

      expect(fsMethods.hasReadFile).toBe(true);
      expect(fsMethods.hasWriteFile).toBe(true);
      expect(fsMethods.hasExists).toBe(true);
      expect(fsMethods.hasReadDir).toBe(true);
      expect(fsMethods.hasCreateDir).toBe(true);
      expect(fsMethods.hasRemove).toBe(true);
      expect(fsMethods.hasRename).toBe(true);
      expect(fsMethods.hasStat).toBe(true);
    });
  });

  describe('Database IPC Handlers', () => {
    it('should expose db methods', async () => {
      const window = electronApp.windows()[0];

      const dbMethods = await window.evaluate(() => {
        const { db } = window.electron;
        return {
          hasQuery: typeof db.query === 'function',
          hasInitialize: typeof db.initialize === 'function',
          hasGetPatterns: typeof db.getPatterns === 'function',
        };
      });

      expect(dbMethods.hasQuery).toBe(true);
      expect(dbMethods.hasInitialize).toBe(true);
      expect(dbMethods.hasGetPatterns).toBe(true);
    });

    it('should initialize database', async () => {
      const window = electronApp.windows()[0];

      const result = await window.evaluate(async () => {
        return await window.electron.db.initialize();
      });

      // Should not throw error
      expect(result).toBeDefined();
    });
  });

  describe('Learning System IPC Handlers', () => {
    it('should expose learning methods', async () => {
      const window = electronApp.windows()[0];

      const learningMethods = await window.evaluate(() => {
        const { learning } = window.electron;
        return {
          hasRecordMistake: typeof learning.recordMistake === 'function',
          hasRecordKnowledge: typeof learning.recordKnowledge === 'function',
          hasFindSimilarMistakes: typeof learning.findSimilarMistakes === 'function',
          hasFindKnowledge: typeof learning.findKnowledge === 'function',
          hasGetStats: typeof learning.getStats === 'function',
        };
      });

      expect(learningMethods.hasRecordMistake).toBe(true);
      expect(learningMethods.hasRecordKnowledge).toBe(true);
      expect(learningMethods.hasFindSimilarMistakes).toBe(true);
      expect(learningMethods.hasFindKnowledge).toBe(true);
      expect(learningMethods.hasGetStats).toBe(true);
    });
  });

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
});
