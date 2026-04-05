import { beforeEach, describe, expect, it } from 'vitest';
import { FileSystemService } from '../../services/FileSystemService';

describe('FileSystemService', () => {
  let service: FileSystemService;

  beforeEach(() => {
    localStorage.clear();
    service = new FileSystemService();
  });

  describe('file operations', () => {
    it('should read file', async () => {
      const content = await service.readFile('test.txt');
      expect(typeof content).toBe('string');
    });

    it('should write file', async () => {
      await expect(service.writeFile('test.txt', 'Hello World')).resolves.not.toThrow();
    });

    it('should rename a file in web mode', async () => {
      await service.createFile('old-name.txt', 'Hello World');
      await service.rename('old-name.txt', 'new-name.txt');

      await expect(service.readFile('new-name.txt')).resolves.toBe('Hello World');
      await expect(service.exists('old-name.txt')).resolves.toBe(false);
    });

    it('should rename nested files when a folder is renamed in web mode', async () => {
      await service.createFile('/workspace/src/index.ts', 'export const value = 1;');
      await service.rename('/workspace/src', '/workspace/source');

      await expect(service.readFile('/workspace/source/index.ts')).resolves.toBe(
        'export const value = 1;'
      );
      await expect(service.exists('/workspace/src/index.ts')).resolves.toBe(false);
    });

    it('should get file info', async () => {
      const info = await service.getFileInfo('test.txt');

      expect(info).toBeDefined();
      expect(info.name).toBe('test.txt');
      expect(info.type).toBe('file');
    });
  });

  describe('directory operations', () => {
    it('should list directory', async () => {
      const items = await service.listDirectory('.');

      expect(Array.isArray(items)).toBe(true);
    });

    it('should get directory structure', async () => {
      const structure = await service.getDirectoryStructure('.');

      expect(structure).toBeDefined();
      expect(structure.name).toBe('.');
      expect(structure.type).toBe('directory');
      expect(Array.isArray(structure.children)).toBe(true);
    });
  });

  // Search operations removed - searchInFiles method not implemented

  describe('path utilities', () => {
    it('should join paths correctly', () => {
      const joined = service.joinPath('/home', 'user', 'file.txt');
      expect(joined).toBe('/home/user/file.txt');
    });

    it('should get dirname', () => {
      const dir = service.dirname('/home/user/file.txt');
      expect(dir).toBe('/home/user');
    });

    it('should get basename', () => {
      const base = service.basename('/home/user/file.txt');
      expect(base).toBe('file.txt');
    });

    it('should check if path is absolute', () => {
      expect(service.isAbsolute('/home/user')).toBe(true);
      expect(service.isAbsolute('relative/path')).toBe(false);
    });

    it('should get relative path', () => {
      const relative = service.relative('/home/user', '/home/user/documents/file.txt');
      expect(relative).toBe('documents/file.txt');
    });
  });
});
