import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupFsHandlers } from '../../electron/handlers/fs-handler';
import { ipcMain } from 'electron';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  app: { isPackaged: false }
}));

vi.mock('fs/promises');
vi.mock('../../electron/ipc-security', () => ({
  assertTrustedIpc: vi.fn(),
  resolveAllowedPath: vi.fn((p) => p), // Pass-through for test
}));

describe('FS Handler', () => {
  let mockMainWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMainWindow = { webContents: { id: 1 } };
  });

  it('should register fs handlers', () => {
    setupFsHandlers(() => mockMainWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('fs:readFile', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('fs:writeFile', expect.any(Function));
  });

  it('should handle file reading', async () => {
    // Setup
    setupFsHandlers(() => mockMainWindow);
    const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'fs:readFile')[1];
    (fs.readFile as any).mockResolvedValue('test content');

    // Execute
    const result = await handler({ sender: { id: 1 } }, 'test.txt');

    // Verify
    expect(result).toEqual({ success: true, content: 'test content' });
    expect(fs.readFile).toHaveBeenCalledWith('test.txt', 'utf-8');
  });

  it('should handle read error', async () => {
    setupFsHandlers(() => mockMainWindow);
    const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'fs:readFile')[1];
    (fs.readFile as any).mockRejectedValue(new Error('Read failed'));

    const result = await handler({ sender: { id: 1 } }, 'test.txt');

    expect(result).toEqual({ success: false, error: 'Read failed' });
  });
});
