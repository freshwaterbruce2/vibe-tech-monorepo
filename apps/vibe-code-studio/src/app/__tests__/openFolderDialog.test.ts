import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runOpenFolderDialog } from '../openFolderDialog';

describe('runOpenFolderDialog', () => {
  const handleOpenFolder = vi.fn().mockResolvedValue(undefined);
  const showError = vi.fn();
  const setFolderPathDialogOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // restore electron mock shape from test setup
    if (window.electron?.dialog) {
      vi.mocked(window.electron.dialog.openFolder).mockReset();
    }
  });

  it('opens a native folder and indexes via handleOpenFolder', async () => {
    vi.mocked(window.electron!.dialog.openFolder).mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Users\\demo\\project'],
    });

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(handleOpenFolder).toHaveBeenCalledWith('C:/Users/demo/project');
    expect(setFolderPathDialogOpen).not.toHaveBeenCalled();
  });

  it('ignores a canceled native picker', async () => {
    vi.mocked(window.electron!.dialog.openFolder).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(handleOpenFolder).not.toHaveBeenCalled();
  });

  it('falls back to manual path dialog when native picker throws', async () => {
    vi.mocked(window.electron!.dialog.openFolder).mockRejectedValue(new Error('boom'));

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(showError).toHaveBeenCalledWith('Open Folder Failed', expect.stringContaining('boom'));
    expect(setFolderPathDialogOpen).toHaveBeenCalledWith(true);
  });

  it('swallows AbortError without opening the fallback dialog', async () => {
    const abort = new Error('user abort');
    abort.name = 'AbortError';
    vi.mocked(window.electron!.dialog.openFolder).mockRejectedValue(abort);

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(showError).not.toHaveBeenCalled();
    expect(setFolderPathDialogOpen).not.toHaveBeenCalled();
  });

  it('uses showDirectoryPicker when electron dialog is unavailable', async () => {
    const originalElectron = window.electron;
    // Force the non-electron branch.
    Object.defineProperty(window, 'electron', { configurable: true, value: undefined });
    const showDirectoryPicker = vi.fn().mockResolvedValue({ path: 'D:/picked', name: 'picked' });
    Object.defineProperty(globalThis, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPicker,
    });

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(showDirectoryPicker).toHaveBeenCalled();
    expect(handleOpenFolder).toHaveBeenCalledWith('D:/picked');

    Object.defineProperty(window, 'electron', { configurable: true, value: originalElectron });
    // leave showDirectoryPicker; tests don't rely on its absence
  });

  it('throws into fallback when showDirectoryPicker returns nothing', async () => {
    const originalElectron = window.electron;
    Object.defineProperty(window, 'electron', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(showError).toHaveBeenCalledWith(
      'Open Folder Failed',
      expect.stringContaining('Directory picker not available')
    );
    expect(setFolderPathDialogOpen).toHaveBeenCalledWith(true);

    Object.defineProperty(window, 'electron', { configurable: true, value: originalElectron });
  });

  it('falls back to manual entry when no picker APIs exist', async () => {
    const originalElectron = window.electron;
    Object.defineProperty(window, 'electron', { configurable: true, value: undefined });
    const hadPicker = 'showDirectoryPicker' in globalThis;
    const prevPicker = (globalThis as { showDirectoryPicker?: unknown }).showDirectoryPicker;
    // Remove browser picker if present

    delete (globalThis as { showDirectoryPicker?: unknown }).showDirectoryPicker;

    await runOpenFolderDialog({ handleOpenFolder, showError, setFolderPathDialogOpen });

    expect(setFolderPathDialogOpen).toHaveBeenCalledWith(true);

    Object.defineProperty(window, 'electron', { configurable: true, value: originalElectron });
    if (hadPicker) {
      Object.defineProperty(globalThis, 'showDirectoryPicker', {
        configurable: true,
        value: prevPicker,
      });
    }
  });
});
