import { describe, it, expect, vi } from 'vitest';
import path from 'path';

// Mock the config before importing
vi.mock('../config.js', () => ({
  config: {
    allowedPaths: ['C:\\dev', 'D:\\data', 'C:\\Users\\test'],
    blockedPatterns: ['node_modules', '.git', 'dist'],
    maxFileSize: 10 * 1024 * 1024,
    defaultShell: 'powershell',
  },
}));

// Now import the module
import { normalizePath, validatePath, isPathBlocked } from '../PathValidator.js';

describe('PathValidator', () => {
  describe('normalizePath', () => {
    it('should resolve relative paths', () => {
      const result = normalizePath('./test');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should handle absolute paths', () => {
      const result = normalizePath('C:\\dev\\project');
      expect(result).toBe('C:\\dev\\project');
    });

    it('should normalize slashes', () => {
      const result = normalizePath('C:/dev/project');
      expect(result).not.toContain('/');
    });
  });

  describe('validatePath', () => {
    it('should allow paths in allowed directories', () => {
      expect(() => validatePath('C:\\dev\\myproject', 'read')).not.toThrow();
    });

    it('should allow D:\\data paths', () => {
      expect(() => validatePath('D:\\data\\file.txt', 'read')).not.toThrow();
    });

    it('should throw for paths outside allowed directories', () => {
      expect(() => validatePath('E:\\forbidden\\file.txt', 'read')).toThrow();
    });

    it('should throw for paths with blocked patterns', () => {
      expect(() => validatePath('C:\\dev\\node_modules\\pkg', 'read')).toThrow();
    });
  });

  describe('isPathBlocked', () => {
    it('should block node_modules', () => {
      expect(isPathBlocked('C:\\dev\\project\\node_modules\\pkg')).toBe(true);
    });

    it('should block .git directories', () => {
      expect(isPathBlocked('C:\\dev\\project\\.git\\config')).toBe(true);
    });

    it('should block dist directories', () => {
      expect(isPathBlocked('C:\\dev\\project\\dist\\bundle.js')).toBe(true);
    });

    it('should allow normal paths', () => {
      expect(isPathBlocked('C:\\dev\\project\\src\\index.ts')).toBe(false);
    });
  });
});
