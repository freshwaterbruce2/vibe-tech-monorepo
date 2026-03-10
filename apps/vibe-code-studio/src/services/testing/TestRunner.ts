/**
 * TestRunner - Main orchestrator for running tests and validating code quality
 * Supports Jest, Vitest, Mocha, and other popular test frameworks
 *
 * ARCHITECTURE NOTE: Uses modular sub-components for framework detection,
 * test discovery, output parsing, and test generation.
 */

/** Browser-safe path helpers (avoids Node.js 'path' module externalization in Vite) */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/');
}
function relativePath(from: string, to: string): string {
  const f = normalizePath(from).replace(/\/$/, '');
  const t = normalizePath(to);
  return t.startsWith(f + '/') ? t.slice(f.length + 1) : t;
}
function resolvePath(p: string): string {
  return normalizePath(p).replace(/\/$/, '');
}
import { logger as appLogger } from '../Logger';
import { FrameworkDetector } from './FrameworkDetector';
import { OutputParser } from './OutputParser';
import { TestDiscovery } from './TestDiscovery';
import { TestGenerator } from './TestGenerator';
import type {
  CoverageInfo,
  LoggerFunction,
  TestDiscoveryResult,
  TestFrameworkInfo,
  TestRunnerOptions,
  TestSuite
} from './types';
import { getDefaultCoverage } from './types';

export class TestRunner {
  private defaultFramework: string = 'auto';
  private readonly defaultTimeout: number = 60000; // 1 minute
  private workspaceRoot: string;
  private readonly logger: LoggerFunction;

  // Sub-components
  private readonly frameworkDetector: FrameworkDetector;
  private readonly testDiscovery: TestDiscovery;
  private readonly outputParser: OutputParser;
  private readonly testGenerator: TestGenerator;

  constructor(
    workspaceRoot?: string,
    framework?: string,
    logger?: LoggerFunction
  ) {
    this.workspaceRoot = workspaceRoot ?? process.cwd();
    this.logger = logger ?? this.defaultLogger;

    if (framework) {
      this.defaultFramework = framework;
    }

    // Initialize sub-components
    this.frameworkDetector = new FrameworkDetector(this.workspaceRoot, this.logger);
    this.testDiscovery = new TestDiscovery(this.workspaceRoot, this.logger);
    this.outputParser = new OutputParser(this.logger);
    this.testGenerator = new TestGenerator(this.workspaceRoot, this.logger);
  }

  private defaultLogger(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [TestRunner] [${level.toUpperCase()}]`;
    appLogger.debug(`${prefix} ${message}`);
  }

  // Delegate to FrameworkDetector
  async detectFrameworks(): Promise<TestFrameworkInfo[]> {
    return this.frameworkDetector.detectFrameworks();
  }

  /**
   * Discover tests in the project
   */
  async discoverTests(options: TestRunnerOptions = {}): Promise<TestDiscoveryResult> {
    const frameworks = await this.detectFrameworks();
    const framework = this.frameworkDetector.selectFramework(options.testFramework, frameworks);

    if (!framework) {
      throw new Error('No test framework detected. Please install jest, vitest, mocha, or another supported framework.');
    }

    const testFiles = await this.testDiscovery.findTestFiles(
      framework.patterns,
      options.testMatch,
      options.testIgnore
    );
    const totalTests = await this.testDiscovery.countTests(testFiles, framework);

    return {
      framework,
      testFiles,
      totalTests,
      configFiles: framework.configFile ? [framework.configFile] : []
    };
  }

  /**
   * Run tests for a specific file or pattern
   */
  async runTests(filePattern: string, options: TestRunnerOptions = {}): Promise<TestSuite> {
    const startTime = Date.now();

    try {
      this.logger(`Running tests for pattern: ${filePattern}`);

      const discovery = await this.discoverTests(options);
      const { framework } = discovery;

      // Filter test files by pattern
      const matchingFiles = discovery.testFiles.filter(file =>
        file.includes(filePattern) || relativePath(this.workspaceRoot, file).includes(filePattern)
      );

      if (matchingFiles.length === 0) {
        this.logger(`No test files found matching pattern: ${filePattern}`, 'warn');
        return {
          name: filePattern,
          tests: [],
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          duration: Date.now() - startTime
        };
      }

      const result = await this.executeTests(framework, matchingFiles, options);

      this.logger(`Test execution completed for ${filePattern}: ${result.passedTests}/${result.totalTests} passed`);

      return {
        ...result,
        name: filePattern,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger(`Test execution failed: ${errorMessage}`, 'error');

      return {
        name: filePattern,
        tests: [{
          passed: false,
          testName: `Test execution for ${filePattern}`,
          output: '',
          error: errorMessage,
          duration
        }],
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        duration
      };
    }
  }

  /**
   * Run all tests in the project
   */
  async runAllTests(options: TestRunnerOptions = {}): Promise<TestSuite[]> {
    const startTime = Date.now();

    try {
      this.logger('Running all tests in the project');

      const discovery = await this.discoverTests(options);
      const { framework } = discovery;

      if (discovery.testFiles.length === 0) {
        this.logger('No test files found in the project', 'warn');
        return [{
          name: 'All Tests',
          tests: [],
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          duration: Date.now() - startTime
        }];
      }

      const result = await this.executeTests(framework, discovery.testFiles, options);

      // Group results by test file if there are multiple files
      const suites = this.groupResultsByFile(result, discovery.testFiles, startTime);

      const totalPassed = suites.reduce((sum, s) => sum + s.passedTests, 0);
      const totalTests = suites.reduce((sum, s) => sum + s.totalTests, 0);

      this.logger(`All tests completed: ${totalPassed}/${totalTests} passed`);

      return suites;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger(`Failed to run all tests: ${errorMessage}`, 'error');

      return [{
        name: 'All Tests',
        tests: [{
          passed: false,
          testName: 'Test Suite Execution',
          output: '',
          error: errorMessage,
          duration
        }],
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        duration
      }];
    }
  }

  /**
   * Execute tests via Electron IPC
   */
  private async executeTests(
    framework: TestFrameworkInfo,
    testFiles: string[],
    options: TestRunnerOptions
  ): Promise<TestSuite> {
    return new Promise((resolve, reject) => {
      const args = this.buildTestArgs(framework, testFiles, options);
      const command = `${framework.command} ${args.join(' ')}`;

      this.logger(`Executing: ${command}`);

      // Check if running in Electron
      if (typeof window === 'undefined' || !window.electron?.shell) {
        reject(new Error('Test execution requires Electron environment'));
        return;
      }

      // Execute via IPC
      (async () => {
        try {
          const result = await window.electron?.shell.execute(
            command,
            options.workingDirectory ?? this.workspaceRoot
          );

          if (!result) {
            reject(new Error('Command execution returned undefined result'));
            return;
          }

          const testResult = this.outputParser.parseTestOutput(
            framework,
            result.stdout,
            result.stderr,
            result.code
          );
          resolve(testResult);
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  /**
   * Build test execution arguments
   */
  private buildTestArgs(
    framework: TestFrameworkInfo,
    testFiles: string[],
    options: TestRunnerOptions
  ): string[] {
    const args = [...framework.args];

    // Add test files
    args.push(...testFiles.map(f => relativePath(this.workspaceRoot, f)));

    // Add options based on framework
    if (options.coverage && framework.supports.coverage) {
      args.push('--coverage');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.bail && framework.supports.bail) {
      if (framework.name === 'vitest') {
        args.push('--bail=1');
      } else if (framework.name === 'jest') {
        args.push('--bail');
      }
    }

    if (options.reporter) {
      args.push('--reporter', options.reporter);
    } else {
      // Use JSON reporter for parsing
      if (framework.name === 'vitest') {
        args.push('--reporter=json');
      } else if (framework.name === 'jest') {
        args.push('--json');
      }
    }

    if (options.maxWorkers && framework.supports.parallel) {
      args.push('--maxWorkers', options.maxWorkers.toString());
    }

    // Set timeout
    const timeout = options.timeout ?? this.defaultTimeout;
    if (framework.name === 'vitest' || framework.name === 'jest') {
      args.push('--testTimeout', timeout.toString());
    }

    return args;
  }

  /**
   * Group test results by file
   */
  private groupResultsByFile(result: TestSuite, testFiles: string[], startTime: number): TestSuite[] {
    if (testFiles.length <= 1) {
      return [{
        ...result,
        name: 'All Tests',
        duration: Date.now() - startTime
      }];
    }

    const testsByFile = new Map<string, typeof result.tests>();

    for (const test of result.tests) {
      const file = test.location?.file ?? 'Unknown';
      if (!testsByFile.has(file)) {
        testsByFile.set(file, []);
      }
      testsByFile.get(file)!.push(test);
    }

    const suites: TestSuite[] = [];
    for (const [file, tests] of testsByFile) {
      suites.push({
        name: relativePath(this.workspaceRoot, file),
        file,
        tests,
        totalTests: tests.length,
        passedTests: tests.filter(t => t.passed).length,
        failedTests: tests.filter(t => !t.passed).length,
        duration: tests.reduce((sum, t) => sum + t.duration, 0)
      });
    }

    return suites;
  }

  // Delegated methods
  async generateTest(code: string, filename: string, options: TestRunnerOptions = {}): Promise<string> {
    return this.testGenerator.generateTest(code, filename, options);
  }

  /**
   * Get test coverage for the project
   */
  async getCoverage(filePattern?: string): Promise<CoverageInfo> {
    try {
      this.logger('Getting test coverage information');

      const frameworks = await this.detectFrameworks();
      const framework = frameworks.find(f => f.supports.coverage);

      if (!framework) {
        this.logger('No framework found that supports coverage', 'warn');
        return getDefaultCoverage();
      }

      const options: TestRunnerOptions = {
        coverage: true,
        testFramework: framework.name as any
      };

      let result: TestSuite;
      if (filePattern) {
        result = await this.runTests(filePattern, options);
      } else {
        const suites = await this.runAllTests(options);
        result = this.combineSuites(suites);
      }

      return result.coverage ?? getDefaultCoverage();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to get coverage: ${errorMessage}`, 'error');
      throw new Error(`Failed to get coverage: ${errorMessage}`);
    }
  }

  private combineSuites(suites: TestSuite[]): TestSuite {
    const allTests = suites.flatMap(s => s.tests);
    const totalDuration = suites.reduce((sum, s) => sum + s.duration, 0);

    return {
      name: 'Combined Results',
      tests: allTests,
      totalTests: allTests.length,
      passedTests: allTests.filter(t => t.passed).length,
      failedTests: allTests.filter(t => !t.passed).length,
      duration: totalDuration,
      coverage: suites.find(s => s.coverage)?.coverage
    };
  }

  /**
   * Watch tests for changes (not supported in IPC mode)
   */
  async watchTests(options: TestRunnerOptions = {}): Promise<() => void> {
    const frameworks = await this.detectFrameworks();
    const framework = this.frameworkDetector.selectFramework(options.testFramework, frameworks);

    if (!framework?.supports.watch) {
      throw new Error('Selected framework does not support watch mode');
    }

    this.logger('Watch mode is not supported in IPC mode (requires interactive terminal)', 'warn');
    throw new Error('Watch mode requires interactive terminal - not yet supported in IPC mode');
  }

  // Configuration methods
  setDefaultFramework(framework: string): void {
    this.defaultFramework = framework;
    this.logger(`Default framework set to: ${framework}`);
  }

  getDefaultFramework(): string {
    return this.defaultFramework;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  setWorkspaceRoot(path: string): void {
    this.workspaceRoot = resolvePath(path);
    this.logger(`Workspace root set to: ${this.workspaceRoot}`);
  }
}
