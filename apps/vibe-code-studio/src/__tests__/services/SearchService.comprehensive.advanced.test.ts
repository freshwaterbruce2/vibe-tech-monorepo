/**
 * Comprehensive Test Suite for SearchService - Advanced Operations
 * Tests replace functionality, statistics, result formatting, and export
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SearchOptions, ReplaceOptions } from '../../services/SearchService';
import { SearchService } from '../../services/SearchService';

describe('SearchService - Comprehensive Tests', () => {
  let searchService: SearchService;
  let mockFileSystemService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock FileSystemService
    mockFileSystemService = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    searchService = new SearchService(mockFileSystemService);
  });

  const defaultOptions: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    includeFiles: '',
    excludeFiles: '',
  };

  describe('replaceInFiles - Multi-file Replace', () => {
    it('should replace text in multiple files', async () => {
      mockFileSystemService.readFile
        .mockResolvedValueOnce('const foo = 1;')
        .mockResolvedValueOnce('const foo = 2;');

      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file1.ts', '/test/file2.ts'];

      const results = await searchService.replaceInFiles('foo', 'bar', files, replaceOptions);

      expect(results).toHaveLength(2);
      expect(results[0].replacements).toBe(1);
      expect(results[1].replacements).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should not write files in dry run mode', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const foo = 1;');

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: true };
      const files = ['/test/file.ts'];

      await searchService.replaceInFiles('foo', 'bar', files, replaceOptions);

      expect(mockFileSystemService.writeFile).not.toHaveBeenCalled();
    });

    it('should return empty array for empty search text', async () => {
      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file.ts'];

      const results = await searchService.replaceInFiles('', 'bar', files, replaceOptions);

      expect(results).toEqual([]);
    });

    it('should handle files with no matches', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const bar = 1;');

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file.ts'];

      const results = await searchService.replaceInFiles('foo', 'baz', files, replaceOptions);

      expect(results[0].replacements).toBe(0);
      expect(results[0].success).toBe(true);
      expect(mockFileSystemService.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const foo = 1;');
      mockFileSystemService.writeFile.mockRejectedValue(new Error('Write error'));

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file.ts'];

      const results = await searchService.replaceInFiles('foo', 'bar', files, replaceOptions);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Write error');
    });

    it('should handle file read errors', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file.ts'];

      const results = await searchService.replaceInFiles('foo', 'bar', files, replaceOptions);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });
  });

  describe('replaceInFile - Single File Replace', () => {
    it('should replace text in file', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const foo = 1;');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const pattern = /foo/gi;
      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };

      const result = await searchService.replaceInFile('/test/file.ts', pattern, 'bar', replaceOptions);

      expect(result.replacements).toBe(1);
      expect(result.success).toBe(true);
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        '/test/file.ts',
        'const bar = 1;'
      );
    });

    it('should replace multiple occurrences', async () => {
      mockFileSystemService.readFile.mockResolvedValue('foo foo foo');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const pattern = /foo/gi;
      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };

      const result = await searchService.replaceInFile('/test/file.ts', pattern, 'bar', replaceOptions);

      expect(result.replacements).toBe(3);
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        '/test/file.ts',
        'bar bar bar'
      );
    });

    it('should handle empty file content', async () => {
      mockFileSystemService.readFile.mockResolvedValue('');

      const pattern = /foo/gi;
      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };

      const result = await searchService.replaceInFile('/test/file.ts', pattern, 'bar', replaceOptions);

      expect(result.replacements).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should not write if no replacements made', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const bar = 1;');

      const pattern = /foo/gi;
      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };

      await searchService.replaceInFile('/test/file.ts', pattern, 'baz', replaceOptions);

      expect(mockFileSystemService.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('searchAndReplace - Combined Operation', () => {
    it('should search and replace in single operation', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const foo = 1;');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: false };
      const files = ['/test/file.ts'];

      const result = await searchService.searchAndReplace('foo', 'bar', files, replaceOptions);

      expect(result.searchResults['/test/file.ts']).toBeDefined();
      expect(result.replaceResults).toHaveLength(1);
      expect(result.replaceResults[0].replacements).toBe(1);
    });

    it('should provide preview in dry run mode', async () => {
      mockFileSystemService.readFile.mockResolvedValue('const foo = 1;');

      const replaceOptions: ReplaceOptions = { ...defaultOptions, dryRun: true };
      const files = ['/test/file.ts'];

      const result = await searchService.searchAndReplace('foo', 'bar', files, replaceOptions);

      expect(result.searchResults['/test/file.ts']).toBeDefined();
      expect(result.replaceResults[0].replacements).toBe(1);
      expect(mockFileSystemService.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('getSearchStats - Statistics', () => {
    it('should calculate search statistics', () => {
      const results = {
        '/test/file1.ts': [
          { file: '/test/file1.ts', line: 1, column: 1, text: 'foo', match: 'foo', before: '', after: '' },
          { file: '/test/file1.ts', line: 2, column: 1, text: 'foo', match: 'foo', before: '', after: '' },
        ],
        '/test/file2.ts': [
          { file: '/test/file2.ts', line: 1, column: 1, text: 'foo', match: 'foo', before: '', after: '' },
        ],
      };

      const stats = searchService.getSearchStats(results);

      expect(stats.totalMatches).toBe(3);
      expect(stats.fileCount).toBe(2);
      expect(stats.filesWithMatches).toEqual(['/test/file1.ts', '/test/file2.ts']);
    });

    it('should handle empty results', () => {
      const stats = searchService.getSearchStats({});

      expect(stats.totalMatches).toBe(0);
      expect(stats.fileCount).toBe(0);
      expect(stats.filesWithMatches).toEqual([]);
    });
  });

  describe('formatResults - Result Formatting', () => {
    it('should format search results as text', () => {
      const results = {
        '/test/file.ts': [
          { file: '/test/file.ts', line: 1, column: 7, text: 'const foo = 1;', match: 'foo', before: 'const ', after: ' = 1;' },
        ],
      };

      const formatted = searchService.formatResults(results);

      expect(formatted).toContain('Found 1 matches in 1 files');
      expect(formatted).toContain('/test/file.ts');
      expect(formatted).toContain('Line 1, Column 7');
    });

    it('should handle multiple files and matches', () => {
      const results = {
        '/test/file1.ts': [
          { file: '/test/file1.ts', line: 1, column: 1, text: 'foo', match: 'foo', before: '', after: '' },
        ],
        '/test/file2.ts': [
          { file: '/test/file2.ts', line: 1, column: 1, text: 'foo', match: 'foo', before: '', after: '' },
        ],
      };

      const formatted = searchService.formatResults(results);

      expect(formatted).toContain('Found 2 matches in 2 files');
    });
  });

  describe('exportResults - Export Functionality', () => {
    const mockResults = {
      '/test/file.ts': [
        { file: '/test/file.ts', line: 1, column: 7, text: 'const foo = 1;', match: 'foo', before: 'const ', after: ' = 1;' },
      ],
    };

    it('should export as JSON', () => {
      const exported = searchService.exportResults(mockResults, 'json');
      const parsed = JSON.parse(exported);

      expect(parsed['/test/file.ts']).toBeDefined();
      expect(parsed['/test/file.ts'][0].match).toBe('foo');
    });

    it('should export as CSV', () => {
      const exported = searchService.exportResults(mockResults, 'csv');

      expect(exported).toContain('File,Line,Column,Text,Match');
      expect(exported).toContain('"/test/file.ts",1,7');
    });

    it('should export as text', () => {
      const exported = searchService.exportResults(mockResults, 'txt');

      expect(exported).toContain('Found 1 matches in 1 files');
      expect(exported).toContain('/test/file.ts');
    });

    it('should handle CSV with quotes in content', () => {
      const results = {
        '/test/file.ts': [
          { file: '/test/file.ts', line: 1, column: 1, text: 'const "test" = 1;', match: 'test', before: '', after: '' },
        ],
      };

      const exported = searchService.exportResults(results, 'csv');

      expect(exported).toContain('""test""');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        searchService.exportResults(mockResults, 'xml' as any);
      }).toThrow('Unsupported format: xml');
    });

    it('should default to JSON format', () => {
      const exported = searchService.exportResults(mockResults);
      const parsed = JSON.parse(exported);

      expect(parsed).toBeDefined();
    });
  });
});
