/**
 * Output Parser
 * Parses test output from various test frameworks
 */

import type {
  CoverageFileInfo,
  CoverageInfo,
  LoggerFunction,
  TestFrameworkInfo,
  TestResult,
  TestSuite,
} from './types';

interface JestAssertionShape {
  status?: string;
  fullName?: string;
  title?: string;
  failureMessages?: string[];
  duration?: number;
  location?: { line?: number; column?: number };
}

interface JestTestResultShape {
  name?: string;
  assertionResults?: JestAssertionShape[];
}

interface IstanbulFileCoverage {
  s?: Record<string, number>;
  f?: Record<string, number>;
  b?: Record<string, number[]>;
}

export class OutputParser {
  private readonly logger: LoggerFunction;

  constructor(logger: LoggerFunction) {
    this.logger = logger;
  }

  /**
   * Parse test output based on framework
   */
  parseTestOutput(
    framework: TestFrameworkInfo,
    stdout: string,
    stderr: string,
    exitCode: number
  ): TestSuite {
    const tests: TestResult[] = [];
    let coverage: CoverageInfo | undefined;

    try {
      if (framework.name === 'vitest' || framework.name === 'jest') {
        // Try to parse JSON output
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            try {
              const result = JSON.parse(line);
              if (result.testResults || result.results) {
                const parsed = this.parseJestVitestJson(result);
                tests.push(...parsed.tests);
                if (parsed.coverage) {
                  coverage = parsed.coverage;
                }
              }
            } catch {
              // Not JSON, try text parsing
            }
          }
        }
      }

      // Fallback to text parsing if JSON parsing failed
      if (tests.length === 0) {
        tests.push(...this.parseTextOutput(stdout, stderr, framework));
      }
    } catch (error) {
      this.logger(`Failed to parse test output: ${error}`, 'warn');

      // Create a single test result based on exit code
      tests.push({
        passed: exitCode === 0,
        testName: 'Test Execution',
        output: stdout,
        error: exitCode !== 0 ? stderr || 'Tests failed' : undefined,
        duration: 0,
      });
    }

    return {
      name: 'Test Results',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.passed).length,
      failedTests: tests.filter(t => !t.passed).length,
      duration: tests.reduce((sum, t) => sum + t.duration, 0),
      coverage,
    };
  }

  /**
   * Parse Jest/Vitest JSON output
   */
  private parseJestVitestJson(result: Record<string, unknown>): {
    tests: TestResult[];
    coverage?: CoverageInfo;
  } {
    const tests: TestResult[] = [];
    let coverage: CoverageInfo | undefined;

    // Handle Jest format
    if (result['testResults']) {
      this.extractJestTests(result['testResults'] as JestTestResultShape[], tests);
      if (result['coverageMap']) {
        coverage = this.parseCoverage(result['coverageMap'] as Record<string, unknown>);
      }
    }

    type VitestSuiteResult = {
      file?: string;
      tasks?: Record<string, unknown>[];
    };

    // Handle Vitest format
    if (result['results']) {
      for (const suiteResult of result['results'] as VitestSuiteResult[]) {
        const { file } = suiteResult;
        this.extractVitestTests(suiteResult.tasks ?? [], file ?? '', tests);
      }
    }

    return { tests, coverage };
  }

  /** Map Jest testResults[].assertionResults into TestResult leaves. */
  private extractJestTests(testResults: JestTestResultShape[], tests: TestResult[]): void {
    for (const testResult of testResults) {
      const file = testResult.name;
      for (const assertion of testResult.assertionResults ?? []) {
        tests.push({
          passed: assertion.status === 'passed',
          skipped:
            assertion.status === 'skipped' ||
            assertion.status === 'pending' ||
            assertion.status === 'todo',
          testName: assertion.fullName ?? assertion.title ?? '',
          output: assertion.failureMessages?.join('\n') ?? '',
          error: assertion.status === 'failed' ? assertion.failureMessages?.join('\n') : undefined,
          duration: assertion.duration ?? 0,
          location: {
            file: file ?? '',
            line: assertion.location?.line,
            column: assertion.location?.column,
          },
        });
      }
    }
  }

  /**
   * Extract tests from Vitest task structure
   */
  private extractVitestTests(
    tasks: Record<string, unknown>[],
    file: string,
    tests: TestResult[]
  ): void {
    for (const task of tasks) {
      const taskResult = task['result'] as
        | { state?: string; error?: { message?: string }; duration?: number }
        | undefined;
      const taskLocation = task['location'] as { line?: number; column?: number } | undefined;
      if (task['type'] === 'test') {
        tests.push({
          passed: taskResult?.state === 'pass',
          skipped: taskResult?.state === 'skip' || taskResult?.state === 'todo',
          testName: task['name'] as string,
          output: taskResult?.error?.message ?? '',
          error: taskResult?.state === 'fail' ? taskResult?.error?.message : undefined,
          duration: taskResult?.duration ?? 0,
          location: {
            file,
            line: taskLocation?.line,
            column: taskLocation?.column,
          },
        });
      } else if (task['tasks']) {
        this.extractVitestTests(task['tasks'] as Record<string, unknown>[], file, tests);
      }
    }
  }

  /**
   * Parse text output for test results
   */
  private parseTextOutput(
    stdout: string,
    stderr: string,
    framework: TestFrameworkInfo
  ): TestResult[] {
    const tests: TestResult[] = [];
    const output = stdout + stderr;

    if (framework.name === 'mocha') {
      this.parseMochaOutput(output, tests);
    } else {
      this.parseGenericOutput(output, tests);
    }

    // If no tests found, create a summary result
    if (tests.length === 0) {
      const passed = !stderr && stdout.includes('pass');
      tests.push({
        passed,
        testName: 'Test Suite',
        output: stdout,
        error: passed ? undefined : stderr || 'Tests failed',
        duration: 0,
      });
    }

    return tests;
  }

  /**
   * Parse Mocha text output
   */
  private parseMochaOutput(output: string, tests: TestResult[]): void {
    const testRegex = /\s*(✓|×|\d+\))\s+(.+?)(?:\s+\((\d+)ms\))?/g;
    let match;

    while ((match = testRegex.exec(output)) !== null) {
      const [, status, name, duration] = match;
      if (name && status) {
        tests.push({
          passed: status === '✓' || /^\d+\)/.test(status),
          testName: name.trim(),
          output: '',
          duration: duration ? parseInt(duration) : 0,
        });
      }
    }
  }

  /**
   * Parse generic test output
   */
  private parseGenericOutput(output: string, tests: TestResult[]): void {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('PASS') || line.includes('✓')) {
        const testName = line.replace(/.*?(PASS|✓)\s*/, '').trim();
        if (testName) {
          tests.push({
            passed: true,
            testName,
            output: line,
            duration: 0,
          });
        }
      } else if (line.includes('FAIL') || line.includes('×')) {
        const testName = line.replace(/.*?(FAIL|×)\s*/, '').trim();
        if (testName) {
          tests.push({
            passed: false,
            testName,
            output: line,
            error: 'Test failed',
            duration: 0,
          });
        }
      }
    }
  }

  /**
   * Parse coverage data from Istanbul format
   */
  parseCoverage(coverageMap: Record<string, unknown>): CoverageInfo {
    const files: CoverageFileInfo[] = [];
    let totalLines = 0,
      coveredLines = 0;
    let totalFunctions = 0,
      coveredFunctions = 0;
    let totalBranches = 0,
      coveredBranches = 0;
    let totalStatements = 0,
      coveredStatements = 0;

    for (const [filePath, fileCoverage] of Object.entries(coverageMap ?? {})) {
      const fc = fileCoverage as IstanbulFileCoverage;
      if (!(fc.s && fc.f && fc.b)) continue;
      const counts = OutputParser.countFileCoverage(fc);
      files.push({
        file: filePath,
        lines: this.createCoverageMetric(counts.coveredLines, counts.totalLines),
        functions: this.createCoverageMetric(counts.coveredFunctions, counts.totalFunctions),
        branches: this.createCoverageMetric(counts.coveredBranches, counts.totalBranches),
        statements: this.createCoverageMetric(counts.coveredLines, counts.totalLines),
      });
      totalLines += counts.totalLines;
      coveredLines += counts.coveredLines;
      totalFunctions += counts.totalFunctions;
      coveredFunctions += counts.coveredFunctions;
      totalBranches += counts.totalBranches;
      coveredBranches += counts.coveredBranches;
      totalStatements += counts.totalLines;
      coveredStatements += counts.coveredLines;
    }

    return {
      lines: this.createCoverageMetric(coveredLines, totalLines),
      functions: this.createCoverageMetric(coveredFunctions, totalFunctions),
      branches: this.createCoverageMetric(coveredBranches, totalBranches),
      statements: this.createCoverageMetric(coveredStatements, totalStatements),
      files,
    };
  }

  /** Covered/total tallies for one Istanbul file-coverage entry. */
  private static countFileCoverage(fc: IstanbulFileCoverage): {
    coveredLines: number;
    totalLines: number;
    coveredFunctions: number;
    totalFunctions: number;
    coveredBranches: number;
    totalBranches: number;
  } {
    const linesCov = Object.values(fc.s ?? {});
    const funcsCov = Object.values(fc.f ?? {});
    const branchesCov = Object.values(fc.b ?? {}).flat();
    return {
      coveredLines: linesCov.filter(v => v > 0).length,
      totalLines: linesCov.length,
      coveredFunctions: funcsCov.filter(v => v > 0).length,
      totalFunctions: funcsCov.length,
      coveredBranches: branchesCov.filter(v => v > 0).length,
      totalBranches: branchesCov.length,
    };
  }

  /**
   * Create a coverage metric object
   */
  private createCoverageMetric(covered: number, total: number) {
    return {
      covered,
      total,
      percentage: total > 0 ? (covered / total) * 100 : 0,
    };
  }
}
