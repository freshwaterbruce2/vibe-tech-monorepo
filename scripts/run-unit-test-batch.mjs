#!/usr/bin/env node
/**
 * Unit Test Worker Batch Executor
 * 
 * Runs all unit tests for library packages in parallel using Nx.
 * Captures output, coverage reports, and timing data.
 * Stores results in a structured JSON format for aggregation.
 * Handles failures gracefully and continues testing other packages.
 * 
 * Usage:
 *   node run-unit-test-batch.mjs [options]
 * 
 * Options:
 *   --output-path <path>     Directory for test results (default: D:\data\test-results)
 *   --parallel <n>           Number of parallel workers (default: 4)
 *   --projects <list>        Comma-separated list of projects to test
 *   --no-continue-on-error   Stop on first failure
 *   --no-coverage            Skip coverage generation
 *   --timeout <minutes>      Timeout per package in minutes (default: 10)
 */

import { spawn } from 'child_process';
import { mkdir, writeFile, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WORKSPACE_ROOT = 'C:\dev';

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    outputPath: 'D:\data\test-results',
    parallel: 4,
    projects: '',
    continueOnError: true,
    coverage: true,
    timeoutMinutes: 10,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--output-path':
        options.outputPath = args[++i];
        break;
      case '--parallel':
        options.parallel = parseInt(args[++i], 10);
        break;
      case '--projects':
        options.projects = args[++i];
        break;
      case '--no-continue-on-error':
        options.continueOnError = false;
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--timeout':
        options.timeoutMinutes = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
Unit Test Worker Batch Executor

Usage: node run-unit-test-batch.mjs [options]

Options:
  --output-path <path>     Directory for test results (default: D:\data\test-results)
  --parallel <n>           Number of parallel workers (default: 4)
  --projects <list>        Comma-separated list of projects to test
  --no-continue-on-error   Stop on first failure
  --no-coverage            Skip coverage generation
  --timeout <minutes>      Timeout per package in minutes (default: 10)
  --help, -h               Show this help message
`);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Logger
function createLogger(logFile) {
  const logs = [];
  
  async function flush() {
    if (logs.length > 0) {
      const content = logs.join('
') + '
';
      await writeFile(logFile, content, { flag: 'a' });
      logs.length = 0;
    }
  }
  
  return {
    info: (msg) => {
      const entry = `[${new Date().toISOString()}] [INFO] ${msg}`;
      console.log(entry);
      logs.push(entry);
    },
    error: (msg) => {
      const entry = `[${new Date().toISOString()}] [ERROR] ${msg}`;
      console.error(entry);
      logs.push(entry);
    },
    warn: (msg) => {
      const entry = `[${new Date().toISOString()}] [WARN] ${msg}`;
      console.warn(entry);
      logs.push(entry);
    },
    flush
  };
}

// Get packages with unit tests
async function getUnitTestPackages() {
  const packagesDir = join(WORKSPACE_ROOT, 'packages');
  const packagesWithTests = [];
  
  const entries = await readdir(packagesDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const packageJsonPath = join(packagesDir, entry.name, 'package.json');
    
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      
      const hasUnitTest = pkg.scripts && 'test:unit' in pkg.scripts;
      const hasTest = pkg.scripts && 'test' in pkg.scripts;
      
      if (hasUnitTest || hasTest) {
        packagesWithTests.push(pkg.name);
      }
    } catch (err) {
      // Skip packages without package.json or with invalid JSON
    }
  }
  
  return packagesWithTests;
}

// Execute a command with timeout
function execWithTimeout(command, args, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || WORKSPACE_ROOT,
      env: { ...process.env, ...options.env },
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId;
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      } catch (e) {
        // Ignore
      }
    };
    
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut: false,
      });
    });
    
    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

// Run tests using Nx run-many for true parallel execution
async function runTestsWithNxParallel(packages, options, outputDir, logger) {
  const startTime = Date.now();
  const results = [];
  
  logger.info(`Running tests for ${packages.length} packages with Nx parallel execution`);
  
  // Build the run-many command
  const projectsList = packages.join(',');
  const nxArgs = [
    'run-many',
    '-t', 'test:unit',
    '--projects', projectsList,
    '--parallel', String(options.parallel),
    '--outputStyle', 'json',
  ];
  
  if (options.continueOnError) {
    nxArgs.push('--nxBail=false');
  } else {
    nxArgs.push('--nxBail=true');
  }
  
  if (options.coverage) {
    nxArgs.push('--coverage');
  }
  
  try {
    const timeoutMs = options.timeoutMinutes * 60 * 1000 * packages.length; // Scale timeout by package count
    const execResult = await execWithTimeout('nx', nxArgs, {}, timeoutMs);
    
    // Save the full Nx output
    const nxOutputFile = join(outputDir, 'nx-run-many-output.json');
    await writeFile(nxOutputFile, execResult.stdout, 'utf-8');
    
    // Parse Nx output
    let nxOutput = null;
    try {
      nxOutput = JSON.parse(execResult.stdout);
    } catch (e) {
      logger.warn('Could not parse Nx JSON output');
    }
    
    // Process results for each package
    for (const pkg of packages) {
      const pkgResult = {
        package: pkg,
        status: 'unknown',
        durationMs: 0,
        outputFile: join(outputDir, `${pkg.replace(/[@/]/g, '_')}-output.json`),
        logFile: join(outputDir, `${pkg.replace(/[@/]/g, '_')}-log.txt`),
        error: null,
        tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
        coverage: null,
      };
      
      // Try to find result in Nx output
      if (nxOutput?.tasks) {
        const task = nxOutput.tasks.find(t => t.target?.project === pkg && t.target?.target === 'test:unit');
        if (task) {
          pkgResult.status = task.status === 'success' ? 'passed' : 'failed';
          pkgResult.durationMs = task.endTime ? task.endTime - task.startTime : 0;
          
          if (task.meta?.tests) {
            pkgResult.tests = {
              total: task.meta.tests.total || 0,
              passed: task.meta.tests.passed || 0,
              failed: task.meta.tests.failed || 0,
              skipped: task.meta.tests.skipped || 0,
            };
          }
        }
      }
      
      // If we could not determine status from Nx output, use exit code
      if (pkgResult.status === 'unknown') {
        pkgResult.status = execResult.exitCode === 0 ? 'passed' : 'failed';
      }
      
      results.push(pkgResult);
      
      // Save individual result
      await writeFile(pkgResult.outputFile, JSON.stringify(pkgResult, null, 2), 'utf-8');
    }
    
    // Save stderr if any
    if (execResult.stderr) {
      await writeFile(join(outputDir, 'nx-stderr.txt'), execResult.stderr, 'utf-8');
    }
    
  } catch (err) {
    logger.error(`Nx run-many failed: ${err.message}`);
    
    // Mark all packages as failed
    for (const pkg of packages) {
      results.push({
        package: pkg,
        status: 'error',
        durationMs: 0,
        outputFile: join(outputDir, `${pkg.replace(/[@/]/g, '_')}-output.json`),
        logFile: join(outputDir, `${pkg.replace(/[@/]/g, '_')}-log.txt`),
        error: err.message,
        tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
        coverage: null,
      });
    }
  }
  
  return {
    results,
    totalDurationMs: Date.now() - startTime,
  };
}

// Main execution
async function main() {
  const options = parseArgs();
  
  // Ensure output directory exists
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runOutputDir = join(options.outputPath, `unit-test-batch-${timestamp}`);
  await mkdir(runOutputDir, { recursive: true });
  
  const logFile = join(runOutputDir, 'test-run.log');
  const logger = createLogger(logFile);
  
  logger.info('Starting unit test batch execution');
  logger.info(`Output directory: ${runOutputDir}`);
  logger.info(`Parallel workers: ${options.parallel}`);
  logger.info(`Continue on error: ${options.continueOnError}`);
  logger.info(`Generate coverage: ${options.coverage}`);
  
  // Get packages to test
  let packages;
  if (options.projects) {
    packages = options.projects.split(',').map(p => p.trim());
    logger.info(`Testing specified packages: ${packages.join(', ')}`);
  } else {
    packages = await getUnitTestPackages();
    logger.info(`Found ${packages.length} packages with unit tests`);
  }
  
  if (packages.length === 0) {
    logger.error('No packages found with unit tests');
    process.exit(1);
  }
  
  // Run tests
  const startTime = Date.now();
  const { results, totalDurationMs } = await runTestsWithNxParallel(packages, options, runOutputDir, logger);
  
  // Calculate summary
  const summary = {
    total: packages.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed' || r.status === 'error' || r.status === 'timeout').length,
    skipped: 0,
    durationMs: totalDurationMs,
  };
  summary.skipped = summary.total - summary.passed - summary.failed;
  
  // Build final results object
  const finalResults = {
    runId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    workspaceRoot: WORKSPACE_ROOT,
    parallel: options.parallel,
    totalPackages: packages.length,
    packages: results,
    summary,
    metadata: {
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: WORKSPACE_ROOT,
    },
  };
  
  // Save consolidated results
  const resultsFile = join(runOutputDir, 'test-results.json');
  await writeFile(resultsFile, JSON.stringify(finalResults, null, 2), 'utf-8');
  
  // Generate markdown summary
  const statusEmoji = {
    passed: 'âœ…',
    failed: 'âŒ',
    timeout: 'â±ï¸',
    error: 'ðŸ’¥',
    unknown: 'â“',
  };
  
  const summaryReport = `# Unit Test Batch Results

**Run ID:** ${finalResults.runId}
**Timestamp:** ${finalResults.timestamp}
**Duration:** ${(summary.durationMs / 1000).toFixed(2)}s

## Summary

| Metric | Count |
|--------|-------|
| Total Packages | ${summary.total} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |

## Package Results

| Package | Status | Duration |
|---------|--------|----------|
${results.map(r => `| ${r.package} | ${statusEmoji[r.status] || 'â“'} ${r.status} | ${(r.durationMs / 1000).toFixed(2)}s |`).join('
')}

## Failed Packages

${results.filter(r => r.status !== 'passed').length === 0 
  ? 'None - all tests passed! ðŸŽ‰' 
  : results.filter(r => r.status !== 'passed').map(r => `- **${r.package}**: ${r.error || 'Failed'}`).join('
')}

## Output Location

Test results stored in: \`${runOutputDir}\`
`;
  
  const summaryFile = join(runOutputDir, 'SUMMARY.md');
  await writeFile(summaryFile, summaryReport, 'utf-8');
  
  // Console summary
  console.log('
========================================');
  console.log('UNIT TEST BATCH COMPLETE');
  console.log('========================================');
  console.log(`Total Packages: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Duration: ${(summary.durationMs / 1000).toFixed(2)}s`);
  console.log(`Results: ${resultsFile}`);
  console.log('========================================');
  
  await logger.flush();
  
  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
