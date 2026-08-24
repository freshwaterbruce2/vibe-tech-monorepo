import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nativeFs = vi.hoisted(() => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  stat: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => nativeFs);

import { ElectronService, isExpectedPathAbsence } from '../../services/ElectronService';
import { FileSystemService } from '../../services/FileSystemService';
import { logger } from '../../services/Logger';
import { ProjectStructureDetector } from '../../utils/ProjectStructureDetector';

const WINDOWS_NOT_FOUND = new Error('The system cannot find the file specified. (os error 2)');

function makeTauriFileSystem(): FileSystemService {
  const service = new FileSystemService();
  (service as unknown as { isElectron: boolean }).isElectron = true;
  return service;
}

describe('native filesystem absence handling', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    errorSpy.mockRestore();
  });

  it.each([
    'ENOENT: no such file or directory',
    'No such file or directory (os error 2)',
    'The system cannot find the file specified. (os error 2)',
    'The system cannot find the path specified. (os error 3)',
    'No workspace folder approved yet',
  ])('recognizes an expected absent path: %s', message => {
    expect(isExpectedPathAbsence(new Error(message))).toBe(true);
  });

  it('does not classify permission or device failures as absence', () => {
    expect(isExpectedPathAbsence(new Error('Access is denied. (os error 5)'))).toBe(false);
    expect(isExpectedPathAbsence(new Error('I/O device error. (os error 1117)'))).toBe(false);
  });

  it('rejects an absent file without recording an error log', async () => {
    nativeFs.readTextFile.mockRejectedValueOnce(WINDOWS_NOT_FOUND);
    const service = makeTauriFileSystem();

    await expect(service.readFile('V:/workspace/README.md')).rejects.toThrow('os error 2');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps a real file read failure actionable', async () => {
    nativeFs.readTextFile.mockRejectedValueOnce(new Error('Access is denied. (os error 5)'));
    const service = makeTauriFileSystem();

    await expect(service.readFile('V:/workspace/README.md')).rejects.toThrow('os error 5');
    expect(errorSpy).toHaveBeenCalledWith(
      'Electron readFile error:',
      expect.objectContaining({ message: expect.stringContaining('os error 5') })
    );
  });

  it('returns an empty listing for an absent probe without an error log', async () => {
    nativeFs.readDir.mockRejectedValueOnce(WINDOWS_NOT_FOUND);
    const service = makeTauriFileSystem();

    await expect(service.listDirectory('V:/workspace/components')).resolves.toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs and rejects a real directory read failure', async () => {
    nativeFs.readDir.mockRejectedValueOnce(new Error('Access is denied. (os error 5)'));
    const service = makeTauriFileSystem();

    await expect(service.listDirectory('V:/workspace/components')).rejects.toThrow('os error 5');
    expect(errorSpy).toHaveBeenCalledWith(
      '[ElectronService] readDir failed (Tauri):',
      expect.objectContaining({ message: expect.stringContaining('os error 5') })
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[FileSystemService] Electron listDirectory error:',
      expect.objectContaining({ message: expect.stringContaining('os error 5') })
    );
  });

  it('keeps absent stat probes quiet while logging real stat failures', async () => {
    const service = makeTauriFileSystem();
    nativeFs.stat.mockRejectedValueOnce(WINDOWS_NOT_FOUND);

    await expect(service.getFileStats('V:/workspace/backend')).rejects.toThrow('os error 2');
    expect(errorSpy).not.toHaveBeenCalled();

    nativeFs.stat.mockRejectedValueOnce(new Error('Access is denied. (os error 5)'));
    await expect(service.getFileStats('V:/workspace/backend')).rejects.toThrow('os error 5');
    expect(errorSpy).toHaveBeenCalledWith(
      '[FileSystemService] Tauri getFileStats error:',
      expect.objectContaining({ message: expect.stringContaining('os error 5') })
    );
  });

  it('keeps ElectronService directory probes quiet for Windows not-found errors', async () => {
    nativeFs.readDir.mockRejectedValueOnce(WINDOWS_NOT_FOUND);

    await expect(new ElectronService().readDir('V:/workspace/app')).rejects.toThrow('os error 2');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('ProjectStructureDetector directory probes', () => {
  it('does not treat an absent directory as an empty existing directory', async () => {
    const getFileStats = vi.fn().mockRejectedValue(WINDOWS_NOT_FOUND);
    const listDirectory = vi.fn().mockResolvedValue([]);
    const detector = new ProjectStructureDetector({
      getFileStats,
      listDirectory,
    } as unknown as FileSystemService);
    const directoryExists = (
      detector as unknown as { directoryExists(path: string): Promise<boolean> }
    ).directoryExists.bind(detector);

    await expect(directoryExists('V:/workspace/app')).resolves.toBe(false);
    expect(getFileStats).toHaveBeenCalledWith('V:/workspace/app');
    expect(listDirectory).not.toHaveBeenCalled();
  });

  it('distinguishes directories from files using native stats', async () => {
    const getFileStats = vi
      .fn()
      .mockResolvedValueOnce({ isDirectory: true })
      .mockResolvedValueOnce({ isDirectory: false });
    const detector = new ProjectStructureDetector({
      getFileStats,
    } as unknown as FileSystemService);
    const directoryExists = (
      detector as unknown as { directoryExists(path: string): Promise<boolean> }
    ).directoryExists.bind(detector);

    await expect(directoryExists('V:/workspace/src')).resolves.toBe(true);
    await expect(directoryExists('V:/workspace/package.json')).resolves.toBe(false);
  });
});
