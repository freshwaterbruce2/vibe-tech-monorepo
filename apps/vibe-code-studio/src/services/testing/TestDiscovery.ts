/**
 * Test Discovery
 * Discovers and counts test files in a project
 */

import { ElectronService } from '../ElectronService';
import type { LoggerFunction, TestFrameworkInfo } from './types';

export class TestDiscovery {
  private readonly workspaceRoot: string;
  private readonly logger: LoggerFunction;

  constructor(workspaceRoot: string, logger: LoggerFunction) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }

  /**
   * Find test files matching patterns
   */
  async findTestFiles(
    patterns: string[],
    testMatch?: string[],
    testIgnore?: string[]
  ): Promise<string[]> {
    const glob = await this.importGlob();
    const allPatterns = [...patterns, ...(testMatch ?? [])];
    const testFiles: string[] = [];

    for (const pattern of allPatterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.workspaceRoot,
          absolute: true,
          ignore: testIgnore ?? ['**/node_modules/**']
        });
        testFiles.push(...files);
      } catch (error) {
        this.logger(`Failed to glob pattern '${pattern}': ${error}`, 'warn');
      }
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Count approximate number of tests in files
   */
  async countTests(testFiles: string[], _framework: TestFrameworkInfo): Promise<number> {
    const electronService = new ElectronService();
    // Guard: Native API required
    if (!electronService.isElectron() && !electronService.isTauri()) {
      return 0;
    }

    let totalCount = 0;

    for (const file of testFiles) {
      try {
        const content = await electronService.readFile(file);
        // Simple regex to count test/it blocks
        const testMatches = content.match(/\b(test|it|describe)\s*\(/g) ?? [];
        totalCount += testMatches.length;
      } catch (_error) {
        // Skip files we can't read
      }
    }

    return totalCount;
  }

  /**
   * Import glob library dynamically
   */
  private async importGlob(): Promise<any> {
    try {
      // Try to import glob dynamically
      const { glob } = await import('glob');
      return glob;
    } catch (_error) {
      // Fallback to a simple file finder
      return this.simpleGlob.bind(this);
    }
  }

  /**
   * Simple glob implementation as fallback
   */
  private async simpleGlob(
    pattern: string,
    options: { cwd: string; absolute: boolean; ignore?: string[] }
  ): Promise<string[]> {
    const electronService = new ElectronService();
    // Guard: Native API required
    if (!electronService.isElectron() && !electronService.isTauri()) {
      return [];
    }

    const files: string[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      try {
        const items = await electronService.readDir(dir);

        for (const entry of items) {
          const fullPath = entry.path;
          const relativePath = fullPath.replace(options.cwd, '').replace(/^[/\\]/, '');

          // Check ignore patterns
          if (options.ignore?.some(ignore => relativePath.includes(ignore))) {
            continue;
          }

          const stats = await electronService.stat(fullPath);

          if (stats.isDirectory) {
            await walkDir(fullPath);
          } else if (stats.isFile) {
            // Simple pattern matching
            if (this.matchesPattern(entry.name, pattern)) {
              files.push(options.absolute ? fullPath : relativePath);
            }
          }
        }
      } catch (_error) {
        // Skip directories we can't read
      }
    };

    await walkDir(options.cwd);
    return files;
  }

  /**
   * Check if filename matches test pattern
   */
  private matchesPattern(filename: string, _pattern: string): boolean {
    // Very basic pattern matching - just check for test/spec files
    const name = filename.toLowerCase();
    return name.includes('.test.') || name.includes('.spec.') ||
           name.includes('test') || name.includes('spec');
  }
}
