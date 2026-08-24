/**
 * Code Quality Analyzer Tests (TDD)
 *
 * Tests written FIRST, then implementation follows
 * Testing: code complexity, maintainability, best practices
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CodeQualityAnalyzer,
  QualityReport,
  FileQuality,
} from '../../services/CodeQualityAnalyzer';
import type { FileSystemService } from '../../services/FileSystemService';

// Mock FileSystemService
vi.mock('../../services/FileSystemService');

describe('CodeQualityAnalyzer', () => {
  let analyzer: CodeQualityAnalyzer;
  let mockFileSystem: FileSystemService;

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
    } as any;

    analyzer = new CodeQualityAnalyzer(mockFileSystem);
  });

  /** Stub listDirectory with a per-directory entry map (unknown paths → []). */
  const mockDirectories = (dirs: Record<string, unknown[]>) => {
    vi.mocked(mockFileSystem.listDirectory).mockImplementation(
      async (path: string) => (dirs[path] ?? []) as any
    );
  };

  describe('analyzeFile', () => {
    it('should analyze a simple TypeScript file', async () => {
      const code = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;

      const result = await analyzer.analyzeFile('/test.ts', code);

      expect(result).toBeDefined();
      expect(result.filePath).toBe('/test.ts');
      expect(result.language).toBe('typescript');
      expect(result.linesOfCode).toBeGreaterThan(0);
      expect(result.complexity).toBeDefined();
      expect(result.quality).toBeGreaterThan(0);
      expect(result.quality).toBeLessThanOrEqual(100);
    });

    it('should calculate cyclomatic complexity correctly', async () => {
      const simpleCode = `
function add(a: number, b: number): number {
  return a + b;
}
`;

      const complexCode = `
function process(data: any): any {
  if (data.type === 'A') {
    if (data.value > 10) {
      return data.value * 2;
    } else {
      return data.value + 1;
    }
  } else if (data.type === 'B') {
    return data.value - 1;
  } else {
    return 0;
  }
}
`;

      const simpleResult = await analyzer.analyzeFile('/simple.ts', simpleCode);
      const complexResult = await analyzer.analyzeFile('/complex.ts', complexCode);

      expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
      expect(simpleResult.complexity).toBe(1); // No branches
      expect(complexResult.complexity).toBeGreaterThanOrEqual(4); // Multiple if/else
    });

    it('should detect code smells', async () => {
      const badCode = `
function badFunction() {
  var x = 1; // var instead of const/let
  eval('console.log("eval is bad")'); // eval usage

  // Very long function (code smell)
  let result = 0;
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {
      result += i * j;
    }
  }

  return result;
}
`;

      const result = await analyzer.analyzeFile('/bad.ts', badCode);

      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.type === 'code-smell')).toBe(true);
    });

    it('should give high quality score to clean code', async () => {
      const cleanCode = `
/**
 * Calculates the sum of two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}
`;

      const result = await analyzer.analyzeFile('/clean.ts', cleanCode);

      expect(result.quality).toBeGreaterThan(80);
      expect(result.maintainability).toBe('high');
    });

    it('should detect missing documentation', async () => {
      const undocumentedCode = `
function complexCalculation(x, y, z) {
  return (x * y) + (z / 2) - Math.sqrt(x + y);
}
`;

      const result = await analyzer.analyzeFile('/undoc.js', undocumentedCode);

      expect(
        result.issues.some(issue => issue.type === 'documentation' && issue.severity === 'warning')
      ).toBe(true);
    });

    it('should count lines of code correctly', async () => {
      const code = `
// Comment line
function test() {
  // Another comment
  const x = 1;

  return x;
}

/* Multi-line
   comment */
`;

      const result = await analyzer.analyzeFile('/test.ts', code);

      expect(result.linesOfCode).toBe(4); // Only actual code lines (function + const + return + })
      expect(result.commentLines).toBe(4); // Comment lines
    });
  });

  describe('analyzeProject', () => {
    it('should analyze multiple files and generate project report', async () => {
      mockDirectories({
        '/src': [
          { path: '/src/file1.ts', name: 'file1.ts', type: 'file' },
          { path: '/src/file2.ts', name: 'file2.ts', type: 'file' },
          { path: '/src/file3.ts', name: 'file3.ts', type: 'file' },
        ],
      });

      vi.mocked(mockFileSystem.readFile)
        .mockResolvedValueOnce('function test1() { return 1; }')
        .mockResolvedValueOnce('function test2() { return 2; }')
        .mockResolvedValueOnce('function test3() { return 3; }');

      const report = await analyzer.analyzeProject('/src');

      expect(report).toBeDefined();
      expect(report.totalFiles).toBe(3);
      expect(report.totalLinesOfCode).toBeGreaterThan(0);
      expect(report.averageQuality).toBeGreaterThan(0);
      expect(report.fileReports.length).toBe(3);
    });

    it('should identify files with quality issues', async () => {
      mockDirectories({
        '/src': [
          { path: '/src/good.ts', name: 'good.ts', type: 'file' },
          { path: '/src/bad.ts', name: 'bad.ts', type: 'file' },
        ],
      });

      const goodCode = 'export const PI = 3.14159;';
      const badCode = `var x = 1;
var y = 2;
eval("bad");
eval("worse");
if (x > 0) {
  if (y > 0) {
    if (x + y > 0) {
      if (x * y > 0) {
        return x + y;
      }
    }
  }
}`;

      vi.mocked(mockFileSystem.readFile)
        .mockResolvedValueOnce(goodCode)
        .mockResolvedValueOnce(badCode);

      const report = await analyzer.analyzeProject('/src');

      const badFileReport = report.fileReports.find(f => f.filePath === '/src/bad.ts');
      expect(badFileReport).toBeDefined();
      expect(badFileReport!.quality).toBeLessThan(70);
      expect(badFileReport!.issues.length).toBeGreaterThan(0);
    });

    it('should calculate project-wide metrics', async () => {
      mockDirectories({
        '/src': [
          { path: '/src/file1.ts', name: 'file1.ts', type: 'file' },
          { path: '/src/file2.ts', name: 'file2.ts', type: 'file' },
        ],
      });

      vi.mocked(mockFileSystem.readFile)
        .mockResolvedValueOnce('const a = 1;\nconst b = 2;')
        .mockResolvedValueOnce('const c = 3;\nconst d = 4;');

      const report = await analyzer.analyzeProject('/src');

      expect(report.totalFiles).toBe(2);
      expect(report.totalLinesOfCode).toBe(4);
      expect(report.averageComplexity).toBeGreaterThanOrEqual(1);
      expect(report.filesWithIssues).toBeDefined();
    });

    it('should recurse into nested subdirectories (regression: only root files analyzed)', async () => {
      mockDirectories({
        '/proj': [
          { path: '/proj/root.config.ts', name: 'root.config.ts', type: 'file' },
          { path: '/proj/src', name: 'src', type: 'directory' },
          { path: '/proj/node_modules', name: 'node_modules', type: 'directory' },
          { path: '/proj/.git', name: '.git', type: 'directory' },
        ],
        '/proj/src': [
          { path: '/proj/src/nested.ts', name: 'nested.ts', type: 'file' },
          { path: '/proj/src/deep', name: 'deep', type: 'directory' },
        ],
        '/proj/src/deep': [{ path: '/proj/src/deep/leaf.ts', name: 'leaf.ts', type: 'file' }],
        '/proj/node_modules': [{ path: '/proj/node_modules/lib.js', name: 'lib.js', type: 'file' }],
      });
      vi.mocked(mockFileSystem.readFile).mockResolvedValue('const answer = 42;');

      const report = await analyzer.analyzeProject('/proj');

      const analyzedPaths = report.fileReports.map(f => f.filePath);
      expect(analyzedPaths).toEqual(
        expect.arrayContaining([
          '/proj/root.config.ts',
          '/proj/src/nested.ts',
          '/proj/src/deep/leaf.ts',
        ])
      );
      expect(report.totalFiles).toBe(3);
      expect(analyzedPaths).not.toContain('/proj/node_modules/lib.js');
      expect(vi.mocked(mockFileSystem.listDirectory)).not.toHaveBeenCalledWith(
        '/proj/node_modules'
      );
      expect(vi.mocked(mockFileSystem.listDirectory)).not.toHaveBeenCalledWith('/proj/.git');
    });
  });

  describe('getComplexityRating', () => {
    it('should rate low complexity as "simple"', () => {
      const rating = analyzer.getComplexityRating(1);
      expect(rating).toBe('simple');
    });

    it('should rate medium complexity as "moderate"', () => {
      const rating = analyzer.getComplexityRating(6);
      expect(rating).toBe('moderate');
    });

    it('should rate high complexity as "complex"', () => {
      const rating = analyzer.getComplexityRating(15);
      expect(rating).toBe('complex');
    });

    it('should rate very high complexity as "very-complex"', () => {
      const rating = analyzer.getComplexityRating(25);
      expect(rating).toBe('very-complex');
    });
  });

  describe('getMaintainabilityRating', () => {
    it('should rate high quality as "high"', () => {
      const rating = analyzer.getMaintainabilityRating(85);
      expect(rating).toBe('high');
    });

    it('should rate medium quality as "medium"', () => {
      const rating = analyzer.getMaintainabilityRating(65);
      expect(rating).toBe('medium');
    });

    it('should rate low quality as "low"', () => {
      const rating = analyzer.getMaintainabilityRating(45);
      expect(rating).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      const result = await analyzer.analyzeFile('/empty.ts', '');

      expect(result.linesOfCode).toBe(0);
      expect(result.quality).toBeGreaterThan(0); // Empty is better than bad code
    });

    it('should handle files with only comments', async () => {
      const code = `
// This is a comment
/* Another comment */
// More comments
`;

      const result = await analyzer.analyzeFile('/comments.ts', code);

      expect(result.linesOfCode).toBe(0);
      expect(result.commentLines).toBe(3);
    });

    it('should handle non-code files gracefully', async () => {
      const jsonContent = '{"key": "value"}';

      const result = await analyzer.analyzeFile('/data.json', jsonContent);

      expect(result).toBeDefined();
      expect(result.language).toBe('json');
    });
  });
});
