#!/usr/bin/env node
/**
 * Unit Test Batch Worker
 * 
 * Executes: nx run-many -t test --projects=<unit-test-packages> --parallel
 * Captures output, coverage reports, and timing data.
 * Stores results in structured JSON format for aggregation.
 */

import { spawn } from 'child_process';
import { mkdir, writeFile, readdir, readFile } from 'fs/promises';
import { join } from 'path';

const WORKSPACE_ROOT = 'V:\\monorepo';
const DEFAULT_OUTPUT_PATH = 'D:\\data\\test-results';

async function main() {
  const args = process.argv.slice(2);
  const options = {
    parallel: 4,
    outputPath: DEFAULT_OUTPUT_PATH,
    projects: '',
    coverage: !args.includes('--no-coverage'),
    continueOnError: !args.includes('--bail'),
    target: 'test',
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parallel' && args[i + 1]) {
      options.parallel = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output-path' && args[i + 1]) {
      options.outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--projects' && args[i + 1]) {
      options.projects = args[i + 1];
      i++;
    } else if (args[i] === '--target' && args[i + 1]) {
      options.target = args[i + 1];
      i++;
    }
  }

  // Ensure output directory exists
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runOutputDir = join(options.outputPath, `unit-test-batch-${timestamp}`);
  await mkdir(runOutputDir, { recursive: true });

  console.log(`[${new Date().toISOString()}] Starting unit test batch execution`);
  console.log(`Output directory: ${runOutputDir}`);
  console.log(`Parallel workers: ${options.parallel}`);
  console.log(`Target: ${options.target}`);

  // Get packages to test
  let packages;
  if (options.projects) {
    packages = options.projects.split(',').map(p => p.trim());
  } else {
    packages = await getUnitTestPackages();
  }

  console.log(`Testing ${packages.length} packages: ${packages.join(', ')}`);

  if (packages.length === 0) {
    console.error('No packages found with unit tests');
    process.exit(1);
  }

  // Build nx run-many command
  const projectsList = packages.join(',');
  const nxArgs = [
    'run-many',
    '-t', options.target,
    '--projects', projectsList,
    '--parallel', String(options.parallel),
    '--outputStyle', 'json',
  ];

  if (options.continueOnError) {
    nxArgs.push('--nxBail=false');
  }

  if (options.coverage) {
    nxArgs.push('--coverage');
  }

  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const child = spawn('nx', nxArgs, {
      cwd: WORKSPACE_ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('close', async (code) => {
      const duration = Date.now() - startTime;

      // Save raw output
      await writeFile(join(runOutputDir, 'nx-output.json'), stdout);
      if (stderr) {
        await writeFile(join(runOutputDir, 'nx-stderr.txt'), stderr);
      }

      // Parse results
      let nxOutput = null;
      try {
        nxOutput = JSON.parse(stdout);
      } catch (e) {
        console.warn('Could not parse Nx JSON output');
      }

      // Build results structure
      const results = {
        runId: generateUUID(),
        timestamp: new Date().toISOString(),
        command: `nx ${nxArgs.join(' ')}`,
        workspaceRoot: WORKSPACE_ROOT,
        parallel: options.parallel,
        target: options.target,
        totalPackages: packages.length,
        packages: [],
        summary: {
          total: packages.length,
          passed: 0,
          failed: 0,
          skipped: 0,
          durationMs: duration,
        },
        exitCode: code,
      };

      // Process each package result
      for (const pkg of packages) {
        const pkgResult = {
          package: pkg,
          status: 'unknown',
          durationMs: 0,
          tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
        };

        if (nxOutput?.tasks) {
          const task = nxOutput.tasks.find(t => 
            t.target?.project === pkg && t.target?.target === options.target
          );
          
          if (task) {
            pkgResult.status = task.status === 'success' ? 'passed' : 'failed';
            pkgResult.durationMs = task.endTime && task.startTime 
              ? task.endTime - task.startTime 
              : 0;
          }
        }

        // Fallback to exit code if status unknown
        if (pkgResult.status === 'unknown') {
          pkgResult.status = code === 0 ? 'passed' : 'failed';
        }

        results.packages.push(pkgResult);
      }

      // Calculate summary
      results.summary.passed = results.packages.filter(p => p.status === 'passed').length;
      results.summary.failed = results.packages.filter(p => p.status === 'failed').length;
      results.summary.skipped = results.summary.total - results.summary.passed - results.summary.failed;

      // Save results
      await writeFile(
        join(runOutputDir, 'test-results.json'), 
        JSON.stringify(results, null, 2)
      );

      // Generate Markdown summary
      const summaryMd = generateMarkdownSummary(results, runOutputDir);
      await writeFile(join(runOutputDir, 'SUMMARY.md'), summaryMd);

      // Console summary
      console.log('');
      console.log('========================================');
      console.log('UNIT TEST BATCH COMPLETE');
      console.log('========================================');
      console.log(`Total Packages: ${results.summary.total}`);
      console.log(`Passed: ${results.summary.passed}`);
      console.log(`Failed: ${results.summary.failed}`);
      console.log(`Skipped: ${results.summary.skipped}`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Results: ${join(runOutputDir, 'test-results.json')}`);
      console.log('========================================');

      resolve(results);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function generateMarkdownSummary(results, outputDir) {
  const statusEmoji = {
    passed: 'PASS',
    failed: 'FAIL',
    timeout: 'TIMEOUT',
    error: 'ERROR',
    unknown: '?',
  };

  const failedPackages = results.packages.filter(p => p.status !== 'passed');

  const lines = [
    '# Unit Test Batch Results',
    '',
    `**Run ID:** ${results.runId}`,
    `**Timestamp:** ${results.timestamp}`,
    `**Duration:** ${(results.summary.durationMs / 1000).toFixed(2)}s`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Total Packages | ${results.summary.total} |`,
    `| Passed | ${results.summary.passed} |`,
    `| Failed | ${results.summary.failed} |`,
    `| Skipped | ${results.summary.skipped} |`,
    '',
    '## Package Results',
    '',
    '| Package | Status | Duration |',
    '|---------|--------|----------|',
  ];

  for (const r of results.packages) {
    lines.push(`| ${r.package} | ${statusEmoji[r.status] || '?'} ${r.status} | ${(r.durationMs / 1000).toFixed(2)}s |`);
  }

  lines.push('');
  lines.push('## Failed Packages');
  lines.push('');

  if (failedPackages.length === 0) {
    lines.push('None - all tests passed!');
  } else {
    for (const r of failedPackages) {
      lines.push(`- **${r.package}**: ${r.error || 'Failed'}`);
    }
  }

  lines.push('');
  lines.push('## Output Location');
  lines.push('');
  lines.push(`Test results stored in: \`${outputDir}\``);
  lines.push('');
  lines.push('## Command Executed');
  lines.push('');
  lines.push('```bash');
  lines.push(results.command);
  lines.push('```');

  return lines.join('\n');
}

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
      
      const hasUnitTest = pkg.scripts && 'test' in pkg.scripts;
      
      if (hasUnitTest) {
        packagesWithTests.push(pkg.name);
      }
    } catch (err) {
      // Skip packages without package.json
    }
  }
  
  return packagesWithTests;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
