import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const srcDir = path.join(packageRoot, 'src');

const qualityFilePath = 'D:/logs/vibe-it-specialist-bot/.quality.json';
function writeQualityStatus(passed, details = '') {
  try {
    fs.mkdirSync(path.dirname(qualityFilePath), { recursive: true });
    fs.writeFileSync(qualityFilePath, JSON.stringify({
      passed,
      timestamp: new Date().toISOString(),
      details,
    }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WARN] Failed to write quality status file:', err.message);
  }
}

// 1. Static Analysis: Scan src/**/*.ts for forbidden patterns
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let errors = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      errors += scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const relativePath = path.relative(packageRoot, fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Strip comments to only analyze operational code strings
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

      // Check for emoji/Unicode characters in code
      const emojiRegex = /\p{Extended_Pictographic}/u;
      if (emojiRegex.test(codeOnly)) {
        console.error(`[ERROR] File ${relativePath} contains forbidden emoji/Unicode characters in operational code.`);
        errors++;
      }

      // Check for raw shell exec/execSync/execFile imports or calls
      if (codeOnly.includes('exec(') || codeOnly.includes('execSync(') || codeOnly.includes('execFile(')) {
        console.error(`[ERROR] File ${relativePath} contains unsafe shell execution functions (exec/execSync/execFile). Use spawn with strict arguments.`);
        errors++;
      }
    }
  }
  return errors;
}

async function main() {
  console.warn('=== Running Bot CI/CD Guardrails ===');

  // 1. Static Analysis
  const staticErrors = scanDirectory(srcDir);
  if (staticErrors > 0) {
    throw new Error(`Static analysis failed with ${staticErrors} errors.`);
  }
  console.warn('[OK] Static analysis checks passed.');

  // 2. Dynamic Integration Checks
  const tasksPath = path.resolve(packageRoot, 'dist/src/tasks.js');
  if (!fs.existsSync(tasksPath)) {
    throw new Error('Compiled tasks.js not found. Please run build first.');
  }

  const { buildTask } = await import(`file://${tasksPath}`);

  // Test cmd / shell disabled
  try {
    buildTask('cmd');
    throw new Error('buildTask("cmd") did not throw an error.');
  } catch (err) {
    if (err instanceof Error && err.message.includes('did not throw')) {
      throw err;
    }
    // Expected throw
  }

  try {
    buildTask('shell');
    throw new Error('buildTask("shell") did not throw an error.');
  } catch (err) {
    if (err instanceof Error && err.message.includes('did not throw')) {
      throw err;
    }
    // Expected throw
  }

  // Verify mutating fixer commands are confirmation-gated
  const mutatingFixers = [
    { cmd: 'fix path-policy', label: 'Fix Path Policy' },
    { cmd: 'fix typescript-version', label: 'Fix TypeScript Version' },
    { cmd: 'fix target-coverage', label: 'Fix Target Coverage' },
    { cmd: 'nx reset', label: 'Nx reset' },
    { cmd: 'pnpm install', label: 'PNPM install' },
  ];

  for (const { cmd, label } of mutatingFixers) {
    const task = buildTask(cmd);
    if (!task.requiresConfirmation) {
      throw new Error(`Task "${cmd}" (${label}) must be confirmation-gated but requiresConfirmation is false.`);
    }
  }

  // Verify safe diagnostic commands do not require confirmation
  const safeDiagnostics = [
    'status',
    'ci',
    'incidents',
    'diagnose',
    'health',
    'optimize',
    'run optimize-trends',
  ];

  for (const cmd of safeDiagnostics) {
    const task = buildTask(cmd);
    if (task.requiresConfirmation) {
      throw new Error(`Diagnostic task "${cmd}" should not require confirmation.`);
    }
  }

  // Verify log paths are on D:/ logs
  const sampleTask = buildTask('status');
  if (!sampleTask.logPath.startsWith('D:/logs/')) {
    throw new Error(`Task log path must start with D:/logs/, got: ${sampleTask.logPath}`);
  }
  if (!sampleTask.historyPath.startsWith('D:/logs/')) {
    throw new Error(`Task history path must start with D:/logs/, got: ${sampleTask.historyPath}`);
  }

  console.warn('[OK] Dynamic behavior checks passed.');
  
  writeQualityStatus(true);
  console.warn(`[OK] Quality check status written to ${qualityFilePath}`);
  console.warn('=== All Guardrail Checks Passed Successfully ===');
}

main().catch(err => {
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error('[ERROR] Failed to run dynamic checks:', errMsg);
  writeQualityStatus(false, errMsg);
  process.exit(1);
});
