import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const srcDir = path.join(packageRoot, 'src');

console.warn('=== Running Bot CI/CD Guardrails ===');

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
      // Emojis/extended pictographics
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

const staticErrors = scanDirectory(srcDir);
if (staticErrors > 0) {
  console.error(`[FAIL] Static analysis failed with ${staticErrors} errors.`);
  process.exit(1);
}
console.warn('[OK] Static analysis checks passed.');

// 2. Dynamic Integration Checks: Import compiled modules and verify behavior
const tasksPath = path.resolve(packageRoot, 'dist/src/tasks.js');
if (!fs.existsSync(tasksPath)) {
  console.error('[ERROR] Compiled tasks.js not found. Please run build first.');
  process.exit(1);
}

try {
  const { buildTask } = await import(`file://${tasksPath}`);

  // Test cmd / shell disabled
  try {
    buildTask('cmd');
    console.error('[ERROR] buildTask("cmd") did not throw an error.');
    process.exit(1);
  } catch {
    // Expected
  }

  try {
    buildTask('shell');
    console.error('[ERROR] buildTask("shell") did not throw an error.');
    process.exit(1);
  } catch {
    // Expected
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
      console.error(`[ERROR] Task "${cmd}" (${label}) must be confirmation-gated but requiresConfirmation is false.`);
      process.exit(1);
    }
  }

  // Verify safe diagnostic commands do not require confirmation
  const safeDiagnostics = [
    'status',
    'diagnose',
    'health',
    'optimize',
    'run optimize-trends',
  ];

  for (const cmd of safeDiagnostics) {
    const task = buildTask(cmd);
    if (task.requiresConfirmation) {
      console.error(`[ERROR] Diagnostic task "${cmd}" should not require confirmation.`);
      process.exit(1);
    }
  }

  // Verify log paths are on D:/ logs
  const sampleTask = buildTask('status');
  if (!sampleTask.logPath.startsWith('D:/logs/')) {
    console.error(`[ERROR] Task log path must start with D:/logs/, got: ${sampleTask.logPath}`);
    process.exit(1);
  }
  if (!sampleTask.historyPath.startsWith('D:/logs/')) {
    console.error(`[ERROR] Task history path must start with D:/logs/, got: ${sampleTask.historyPath}`);
    process.exit(1);
  }

  console.warn('[OK] Dynamic behavior checks passed.');
  
  // Write quality status file
  const qualityFilePath = 'D:/logs/vibe-it-specialist-bot/.quality.json';
  try {
    fs.mkdirSync(path.dirname(qualityFilePath), { recursive: true });
    fs.writeFileSync(qualityFilePath, JSON.stringify({
      passed: true,
      timestamp: new Date().toISOString(),
    }, null, 2), 'utf8');
    console.warn(`[OK] Quality check status written to ${qualityFilePath}`);
  } catch (err) {
    console.warn('[WARN] Failed to write quality status file:', err.message);
  }
} catch (err) {
  console.error('[ERROR] Failed to run dynamic checks:', err);
  process.exit(1);
}

console.warn('=== All Guardrail Checks Passed Successfully ===');
process.exit(0);
