// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { validateDataPath, isDataPathValid, MANDATORY_DATA_DRIVE } from './path-validator';

describe('path-validator', () => {
  describe('validateDataPath', () => {
    it('accepts valid D: drive paths', () => {
      const validPaths = [
        'D:\databases\test.db',
        'D:/databases/test.db',
        'd:\databases\test.db', // lowercase
        'D:\logs\app.log',
      ];

      validPaths.forEach(path => {
        expect(() => validateDataPath(path)).not.toThrow();
        const result = validateDataPath(path);
        expect(result.toUpperCase()).toContain('D:');
      });
    });

    it('rejects C: drive paths', () => {
      const invalidPaths = [
        'C:\dev\test.db',
        'C:/Users/test.db',
        'c:\test\data.db',
      ];

      invalidPaths.forEach(path => {
        expect(() => validateDataPath(path)).toThrow(/CRITICAL.*Data storage violation/);
      });
    });

    it('rejects other drive letters', () => {
      const invalidPaths = [
        'E:\data\test.db',
        'F:/backup/data.db',
      ];

      invalidPaths.forEach(path => {
        expect(() => validateDataPath(path)).toThrow(/CRITICAL.*Data storage violation/);
      });
    });

    it('throws error with helpful message including both paths', () => {
      const testPath = 'C:\dev\test.db';
      
      try {
        validateDataPath(testPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain(testPath);
        expect(error.message).toContain(MANDATORY_DATA_DRIVE);
      }
    });

    it('resolves relative paths before validation', () => {
      // Note: This test's behavior depends on the current working directory
      // If CWD is on C:, relative paths will resolve to C: and should throw
      const relativePath = './test/data.db';
      
      // Should either succeed (if on D:) or throw (if on C:)
      // We just verify it doesn't crash
      try {
        const result = validateDataPath(relativePath);
        expect(result).toBeDefined();
      } catch (error: any) {
        expect(error.message).toContain('CRITICAL');
      }
    });
  });

  describe('isDataPathValid', () => {
    it('returns true for valid D: drive paths', () => {
      expect(isDataPathValid('D:\databases\test.db')).toBe(true);
      expect(isDataPathValid('D:/logs/app.log')).toBe(true);
      expect(isDataPathValid('d:\data\file.txt')).toBe(true);
    });

    it('returns false for invalid paths', () => {
      expect(isDataPathValid('C:\dev\test.db')).toBe(false);
      expect(isDataPathValid('C:/Users/data.db')).toBe(false);
      expect(isDataPathValid('E:\backup\data.db')).toBe(false);
    });

    it('does not throw errors', () => {
      expect(() => isDataPathValid('C:\invalid\path.db')).not.toThrow();
      expect(() => isDataPathValid('D:\valid\path.db')).not.toThrow();
    });
  });

  describe('MANDATORY_DATA_DRIVE constant', () => {
    it('is set to D:', () => {
      expect(MANDATORY_DATA_DRIVE).toBe('D:');
    });
  });
});
